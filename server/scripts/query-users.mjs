import path from 'node:path'
import dotenv from 'dotenv'
import { createPool } from 'mysql2/promise'
import { fileURLToPath } from 'node:url'

// 加载 server/.env（当前工作目录是 server）
const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '../.env') })

const host = process.env.MYSQL_HOST || 'localhost'
const port = Number(process.env.MYSQL_PORT || 3306)
const user = process.env.MYSQL_USER || 'root'
const password = process.env.MYSQL_PASSWORD || '123456'
const db = process.env.MYSQL_DB || 'hxms_dev'

async function main() {
  const pool = await createPool({
    host,
    port,
    user,
    password,
    database: db,
    waitForConnections: true
  })
  try {
    const [rows] = await pool.query(
      'SELECT id, userName, roles, enabled, createdAt FROM users ORDER BY id DESC LIMIT 10;'
    )
    console.log(JSON.stringify(rows, null, 2))
  } finally {
    await pool.end()
  }
}

main().catch((e) => {
  console.error(e)
  process.exitCode = 1
})
