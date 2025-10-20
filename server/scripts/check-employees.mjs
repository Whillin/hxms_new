import path from 'node:path'
import dotenv from 'dotenv'
import { createPool } from 'mysql2/promise'

// 加载 server/.env（当前工作目录是 server）
dotenv.config({ path: path.resolve(process.cwd(), '.env') })

const host = process.env.MYSQL_HOST || 'localhost'
const port = Number(process.env.MYSQL_PORT || 3306)
const user = process.env.MYSQL_USER || 'root'
const password = process.env.MYSQL_PASSWORD || '123456'
const db = process.env.MYSQL_DB || 'hxms_dev'

async function main() {
  const pool = await createPool({ host, port, user, password, database: db, waitForConnections: true })
  try {
    const [tables] = await pool.query("SHOW TABLES LIKE 'employees';")
    const exists = Array.isArray(tables) && tables.length > 0
    console.log(`DB: ${db} @ ${host}:${port} as ${user}`)
    console.log(`employees table exists: ${exists}`)
    if (exists) {
      const [rows] = await pool.query("SELECT COUNT(*) AS cnt FROM employees;")
      const cnt = Array.isArray(rows) && rows[0] && rows[0].cnt
      console.log(`employees row count: ${cnt}`)
    }
  } finally {
    await pool.end()
  }
}

main().catch((e)=>{ console.error(e); process.exitCode = 1 })