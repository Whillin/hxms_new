#!/usr/bin/env node
import fs from 'fs'
import path from 'path'
import mysql from 'mysql2/promise'
import bcrypt from 'bcryptjs'

function parseEnvFile(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf-8')
    for (const line of raw.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/)
      if (m) {
        const k = m[1]
        let v = m[2]
        if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
          v = v.slice(1, -1)
        }
        process.env[k] = v
      }
    }
  } catch (e) {
    console.warn(
      '[reset-user-password] failed to read env file:',
      filePath,
      String(e?.message || e)
    )
  }
}

async function connect() {
  const preferHost = process.env.MYSQL_HOST || '127.0.0.1'
  const preferPort = Number(process.env.MYSQL_PORT || 3306)
  const user = process.env.MYSQL_USER || 'root'
  const password = process.env.MYSQL_PASSWORD || '123456'
  let db = process.env.MYSQL_DB || ''

  const candidates = [
    { host: preferHost, port: preferPort },
    { host: '127.0.0.1', port: 13306 }
  ]

  let lastErr
  for (const c of candidates) {
    try {
      const conn = await mysql.createConnection({
        host: c.host,
        port: c.port,
        user,
        password,
        multipleStatements: true
      })
      if (!db) {
        const [schemas] = await conn.query(
          "SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME IN ('hxms','hxms_dev')"
        )
        const names = Array.isArray(schemas) ? schemas.map((r) => r.SCHEMA_NAME) : []
        db = names.includes('hxms') ? 'hxms' : names.includes('hxms_dev') ? 'hxms_dev' : 'hxms_dev'
      }
      return { conn, db }
    } catch (e) {
      lastErr = e
    }
  }
  throw lastErr || new Error('Unable to connect to MySQL')
}

function parseArgs() {
  const args = process.argv.slice(2)
  const out = {
    userName: '',
    userId: 0,
    password: '',
    list: false,
    like: '',
    findEmployee: false,
    employeeName: '',
    schemas: false,
    showIndexes: false,
    dropIndex: ''
  }
  for (let i = 0; i < args.length; i++) {
    const a = args[i]
    if (a === '--user' || a === '--username' || a === '--userName') {
      out.userName = String(args[++i] || '')
    } else if (a === '--id' || a === '--userId') {
      out.userId = Number(args[++i] || 0)
    } else if (a === '--password' || a === '--newPassword') {
      out.password = String(args[++i] || '')
    } else if (a === '--list') {
      out.list = true
    } else if (a === '--like') {
      out.like = String(args[++i] || '')
    } else if (a === '--find-employee') {
      out.findEmployee = true
    } else if (a === '--name') {
      out.employeeName = String(args[++i] || '')
    } else if (a === '--schemas') {
      out.schemas = true
    } else if (a === '--show-indexes') {
      out.showIndexes = true
    } else if (a === '--drop-index') {
      out.dropIndex = String(args[++i] || '')
    }
  }
  return out
}

async function main() {
  const root = path.resolve(process.cwd(), 'server')
  parseEnvFile(path.join(root, '.env.production'))
  parseEnvFile(path.join(root, '.env'))

  const {
    userName,
    userId,
    password,
    list,
    like,
    findEmployee,
    employeeName,
    schemas,
    showIndexes,
    dropIndex
  } = parseArgs()
  const { conn, db } = await connect()
  try {
    if (showIndexes) {
      const [rows] = await conn.query(
        "SELECT INDEX_NAME, COLUMN_NAME, NON_UNIQUE FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA=? AND TABLE_NAME='customers'",
        [db]
      )
      console.log(JSON.stringify({ db, indexes: rows }))
      return
    }
    if (dropIndex) {
      const sql = `ALTER TABLE \`${db}\`.customers DROP INDEX \`${dropIndex}\``
      await conn.query(sql)
      const [rows] = await conn.query(
        "SELECT INDEX_NAME, COLUMN_NAME, NON_UNIQUE FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA=? AND TABLE_NAME='customers'",
        [db]
      )
      console.log(JSON.stringify({ db, dropped: dropIndex, indexes: rows }))
      return
    }
    if (schemas) {
      const [rows] = await conn.query(
        'SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA ORDER BY SCHEMA_NAME'
      )
      console.log(JSON.stringify(rows))
      return
    }
    if (list) {
      const sql = like
        ? `SELECT id,userName,roles,enabled FROM \`${db}\`.users WHERE userName LIKE ? ORDER BY id LIMIT 50`
        : `SELECT id,userName,roles,enabled FROM \`${db}\`.users ORDER BY id LIMIT 50`
      const params = like ? [`%${like}%`] : []
      const [rows] = await conn.query(sql, params)
      console.log(JSON.stringify({ db, rows }))
      return
    }
    if (findEmployee && employeeName) {
      const [emps] = await conn.query(
        `SELECT id,name,phone,storeId FROM \`${db}\`.employees WHERE name LIKE ? ORDER BY id LIMIT 50`,
        [`%${employeeName}%`]
      )
      const result = []
      for (const e of Array.isArray(emps) ? emps : []) {
        const [users] = await conn.query(
          `SELECT id,userName,roles,enabled FROM \`${db}\`.users WHERE employeeId=?`,
          [Number(e.id)]
        )
        result.push({ employee: e, users })
      }
      console.log(JSON.stringify({ db, result }))
      return
    }
    if (!password || (!userName && !userId)) {
      throw new Error('missing params')
    }
    const hash = bcrypt.hashSync(password, 10)
    if (userId && !Number.isNaN(userId)) {
      const [res] = await conn.query(
        `UPDATE \`${db}\`.users SET passwordHash=?, enabled=true WHERE id=?`,
        [hash, userId]
      )
      const [rows] = await conn.query(
        `SELECT id,userName,roles,enabled FROM \`${db}\`.users WHERE id=?`,
        [userId]
      )
      console.log(
        JSON.stringify({ db, affectedRows: (res && res.affectedRows) || 0, result: rows })
      )
    } else {
      const [res] = await conn.query(
        `UPDATE \`${db}\`.users SET passwordHash=?, enabled=true WHERE userName=?`,
        [hash, userName]
      )
      const [rows] = await conn.query(
        `SELECT id,userName,roles,enabled FROM \`${db}\`.users WHERE userName=?`,
        [userName]
      )
      console.log(
        JSON.stringify({ db, affectedRows: (res && res.affectedRows) || 0, result: rows })
      )
    }
  } finally {
    await conn.end()
  }
}

main().catch((e) => {
  console.error(e && e.stack ? e.stack : String(e))
  process.exit(1)
})
