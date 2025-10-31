import { createPool } from 'mysql2/promise'

const tables = [
  'users',
  'roles',
  'role_permissions',
  'departments',
  'employees',
  'employee_store_links',
  'customers',
  'channels',
  'product_models',
  'product_categories',
  'product_category_links',
  'clues'
]

async function main() {
  const host = process.env.MYSQL_HOST || '127.0.0.1'
  const port = Number(process.env.MYSQL_PORT || 13306)
  const user = process.env.MYSQL_USER || 'root'
  const password = process.env.MYSQL_PASSWORD || '123456'
  const database = process.env.MYSQL_DB || 'hxms_dev'

  const pool = await createPool({ host, port, user, password, database, waitForConnections: true })

  console.log('[db] connecting', { host, port, user, database })

  const results = {}
  for (const t of tables) {
    try {
      const [rows] = await pool.query(`SELECT COUNT(*) AS c FROM \`${t}\``)
      const c = Array.isArray(rows) && rows.length ? (rows[0]?.c ?? 0) : 0
      results[t] = Number(c)
    } catch (err) {
      results[t] = { error: String(err?.message || err) }
    }
  }

  await pool.end()
  console.log('[db] row counts:\n' + JSON.stringify(results, null, 2))
}

main().catch((err) => {
  console.error('[db] error', err)
  process.exit(1)
})