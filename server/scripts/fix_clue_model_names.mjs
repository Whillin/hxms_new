#!/usr/bin/env node
import fs from 'fs'
import path from 'path'
import mysql from 'mysql2/promise'

// Load .env
function parseEnvFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) return
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
  } catch (err) {
    console.warn('[fix] env file not read:', filePath, String(err?.message || err))
  }
}

// Try loading .env from server root (one level up from scripts/)
const envPath = path.resolve(process.cwd(), '.env')
parseEnvFile(envPath)

async function connect() {
  const preferHost = process.env.MYSQL_HOST || '127.0.0.1'
  const preferPort = Number(process.env.MYSQL_PORT || 3306)
  const user = process.env.MYSQL_USER || 'root'
  const password = process.env.MYSQL_PASSWORD || '123456'
  const db = process.env.MYSQL_DB || 'hxms_dev'

  const candidates = [
    { host: preferHost, port: preferPort },
    { host: '127.0.0.1', port: 13306 }
  ]

  let lastErr
  for (const c of candidates) {
    try {
      console.log(`Trying to connect to ${c.host}:${c.port} user=${user} db=${db}...`)
      const conn = await mysql.createConnection({
        host: c.host,
        port: c.port,
        user,
        password,
        database: db,
        multipleStatements: true
      })
      console.log('Connected!')
      return { conn, db }
    } catch (e) {
      console.warn(`Failed to connect to ${c.host}:${c.port}: ${e.message}`)
      lastErr = e
    }
  }
  throw lastErr || new Error('Unable to connect to MySQL')
}

async function fixNames(conn, db) {
  console.log('Scanning for numeric model names in clues...')

  // 1. Get all clues with numeric focusModelName or dealModelName
  // We check if the name consists only of digits
  const [rows] = await conn.query(
    `SELECT id, focusModelId, focusModelName, dealModelId, dealModelName 
     FROM \`${db}\`.clues 
     WHERE focusModelName REGEXP '^[0-9]+$' OR dealModelName REGEXP '^[0-9]+$'`
  )

  if (!rows || rows.length === 0) {
    console.log('No clues found with numeric model names.')
    return
  }

  console.log(`Found ${rows.length} clues with potential numeric names. Processing...`)

  let updatedCount = 0

  // Prepare statements for looking up names
  // We'll just do simple queries for each for safety, or cache them if list is small.
  // Given product models/categories are not huge, let's cache them first.

  const [models] = await conn.query(`SELECT id, name FROM \`${db}\`.product_models`)
  const [categories] = await conn.query(`SELECT id, name FROM \`${db}\`.product_categories`)

  const modelMap = new Map()
  models.forEach((m) => modelMap.set(Number(m.id), m.name))

  const categoryMap = new Map()
  categories.forEach((c) => categoryMap.set(Number(c.id), c.name))

  const getName = (id) => {
    const nid = Number(id)
    if (!Number.isFinite(nid)) return null
    return modelMap.get(nid) || categoryMap.get(nid) || null
  }

  for (const row of rows) {
    let changed = false
    let newFocusName = row.focusModelName
    let newDealName = row.dealModelName

    // Fix Focus Model Name
    if (row.focusModelName && /^\d+$/.test(row.focusModelName)) {
      // It's numeric. Try to resolve using focusModelId first
      let resolvedName = null
      if (row.focusModelId) {
        resolvedName = getName(row.focusModelId)
      }
      // If not resolved by ID, maybe the "Name" itself IS the ID
      if (!resolvedName) {
        resolvedName = getName(row.focusModelName)
      }

      if (resolvedName) {
        newFocusName = resolvedName
        changed = true
      }
    }

    // Fix Deal Model Name
    if (row.dealModelName && /^\d+$/.test(row.dealModelName)) {
      let resolvedName = null
      if (row.dealModelId) {
        resolvedName = getName(row.dealModelId)
      }
      if (!resolvedName) {
        resolvedName = getName(row.dealModelName)
      }

      if (resolvedName) {
        newDealName = resolvedName
        changed = true
      }
    }

    if (changed) {
      await conn.query(
        `UPDATE \`${db}\`.clues SET focusModelName = ?, dealModelName = ? WHERE id = ?`,
        [newFocusName, newDealName, row.id]
      )
      console.log(
        `[Fixed] Clue #${row.id}: Focus '${row.focusModelName}'->'${newFocusName}', Deal '${row.dealModelName}'->'${newDealName}'`
      )
      updatedCount++
    }
  }

  console.log(`Done. Fixed ${updatedCount} clues.`)
}

async function main() {
  let conn
  try {
    const res = await connect()
    conn = res.conn
    await fixNames(conn, res.db)
  } catch (err) {
    console.error('Fatal error:', err)
    process.exit(1)
  } finally {
    if (conn) await conn.end()
  }
}

main()
