// Query product_models to verify fields directly in DB
import dotenv from 'dotenv'
import mysql from 'mysql2/promise'
import path from 'node:path'

dotenv.config({ path: path.resolve(process.cwd(), '.env') })

const DB_HOST = process.env.DB_HOST || 'localhost'
const DB_PORT = Number(process.env.DB_PORT || 3306)
const DB_USER = process.env.DB_USER || 'root'
const DB_PASSWORD = process.env.DB_PASSWORD || '123456'
const DB_NAME = process.env.DB_NAME || 'hxms_dev'

async function main() {
  const idArg = process.argv[2] ? Number(process.argv[2]) : undefined
  const conn = await mysql.createConnection({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME
  })
  const sql = idArg
    ? 'SELECT id, name, engineType, price, status, sales, updatedAt FROM product_models WHERE id = ?'
    : 'SELECT id, name, engineType, price, status, sales, updatedAt FROM product_models ORDER BY id DESC LIMIT 1'
  const [rows] = idArg ? await conn.execute(sql, [idArg]) : await conn.query(sql)
  await conn.end()
  const row = Array.isArray(rows) && rows[0] ? rows[0] : null
  console.log('[db] row:', row)
}

main().catch((err) => {
  console.error('[db-error]', err)
  process.exitCode = 1
})
