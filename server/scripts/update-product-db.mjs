// Directly update product_models fields by id for verification
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
  const id = process.argv[2] ? Number(process.argv[2]) : undefined
  if (!id || Number.isNaN(id)) {
    console.log('Usage: node scripts/update-product-db.mjs <id>')
    process.exit(1)
  }
  const engineType = process.argv[3] || 'HEV'
  const price = process.argv[4] ? Number(process.argv[4]) : 199.99
  const status = process.argv[5] ? Number(process.argv[5]) : 1
  const sales = process.argv[6] ? Number(process.argv[6]) : 100

  const conn = await mysql.createConnection({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME
  })
  const [beforeRows] = await conn.execute(
    'SELECT id, name, engineType, price, status, sales, updatedAt FROM product_models WHERE id = ?',
    [id]
  )
  console.log('[db-before]', beforeRows?.[0] || null)

  await conn.execute(
    'UPDATE product_models SET engineType = ?, price = ?, status = ?, sales = ?, updatedAt = NOW() WHERE id = ?',
    [engineType, price, status, sales, id]
  )

  const [afterRows] = await conn.execute(
    'SELECT id, name, engineType, price, status, sales, updatedAt FROM product_models WHERE id = ?',
    [id]
  )
  await conn.end()

  console.log('[db-after]', afterRows?.[0] || null)
}

main().catch((err) => {
  console.error('[db-update-error]', err)
  process.exitCode = 1
})
