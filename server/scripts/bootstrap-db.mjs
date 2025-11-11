#!/usr/bin/env node
// Bootstrap local/dev database schema by executing the bundled SQL dump.
// This is useful when TypeORM synchronize is disabled and tables don't exist yet.

import fs from 'fs'
import path from 'path'
import mysql from 'mysql2/promise'

function parseEnvFile(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf-8')
    for (const line of raw.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/)
      if (m) {
        const k = m[1]
        let v = m[2]
        if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith('\'') && v.endsWith('\''))) {
          v = v.slice(1, -1)
        }
        // Only set from file if not already provided via environment
        if (typeof process.env[k] === 'undefined') {
          process.env[k] = v
        }
      }
    }
  } catch (err) {
    // ignore if not present
  }
}

async function main() {
  const root = process.cwd()
  parseEnvFile(path.join(root, '.env'))
  parseEnvFile(path.join(root, '.env.production'))

  const host = process.env.MYSQL_HOST || '127.0.0.1'
  const port = Number(process.env.MYSQL_PORT || 3306)
  const user = process.env.MYSQL_USER || 'root'
  const password = process.env.MYSQL_PASSWORD || '123456'
  const db = process.env.MYSQL_DB || 'hxms_dev'

  const pool = await mysql.createPool({
    host,
    port,
    user,
    password,
    multipleStatements: true,
    waitForConnections: true,
    connectionLimit: 2
  })

  // Ensure database exists
  await pool.query(
    `CREATE DATABASE IF NOT EXISTS \`${db}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
  )

  // Read bundled schema dump
  const dumpFile = path.join(root, 'hxms_dev_full_backup.utf8.sql')
  if (!fs.existsSync(dumpFile)) {
    console.error('[bootstrap-db] dump file missing:', dumpFile)
    process.exit(1)
  }

  let sql = fs.readFileSync(dumpFile, 'utf8')
  // Strip BOM if present
  sql = sql.replace(/^\uFEFF/, '')
  // Remove '-- ...' comment lines that may confuse the driver
  sql = sql
    .split(/\r?\n/)
    .filter((line) => !/^\s*--/.test(line))
    .join('\n')
  // Replace USE statements to target desired db
  const rewritten = sql.replace(/\bUSE\s+hxms_dev\s*;/gi, `USE ${db};`)

  console.log('[bootstrap-db] applying schema from dump to', host + ':' + port, 'db=', db)
  const conn = await pool.getConnection()
  try {
    await conn.query(`USE \`${db}\`;`)
    await conn.query(rewritten)
    console.log('[bootstrap-db] schema applied successfully')
  } finally {
    conn.release()
    await pool.end()
  }
}

main().catch((e) => {
  console.error('[bootstrap-db] failed:', e?.message || e)
  process.exit(1)
})