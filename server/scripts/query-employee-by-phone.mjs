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

const phone = process.argv[2] || '13800001002'

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
      'SELECT id, name, phone, role, status, brandId, regionId, storeId FROM employees WHERE phone = ? LIMIT 1;',
      [phone]
    )
    console.log('employee:', JSON.stringify(rows, null, 2))
  } finally {
    await pool.end()
  }
}

main().catch((e) => {
  console.error(e)
  process.exitCode = 1
})
