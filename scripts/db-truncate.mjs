import { createPool } from 'mysql2/promise'

const ordered = [
  'product_category_links',
  'product_models',
  'product_categories',
  'role_permissions',
  'roles',
  'employee_store_links',
  'employees',
  'departments',
  'channels',
  'clues',
  'users',
  'customers'
]

async function exists(conn, db, table) {
  const [rows] = await conn.query(
    'SELECT COUNT(*) AS c FROM information_schema.tables WHERE table_schema=? AND table_name=?',
    [db, table]
  )
  const c = Array.isArray(rows) && rows.length ? (rows[0]?.c ?? 0) : 0
  return Number(c) > 0
}

async function main() {
  const host = process.env.MYSQL_HOST || '127.0.0.1'
  const port = Number(process.env.MYSQL_PORT || 13306)
  const user = process.env.MYSQL_USER || 'root'
  const password = process.env.MYSQL_PASSWORD || '123456'
  const database = process.env.MYSQL_DB || 'hxms_dev'

  const pool = await createPool({ host, port, user, password, database, waitForConnections: true })
  const conn = await pool.getConnection()
  console.log('[db] connecting', { host, port, user, database })

  try {
    await conn.query('SET FOREIGN_KEY_CHECKS=0')
    for (const t of ordered) {
      const ok = await exists(conn, database, t)
      if (!ok) {
        console.log(`[skip] table not exist: ${t}`)
        continue
      }
      try {
        await conn.query(`TRUNCATE TABLE \`${t}\``)
        console.log(`[done] truncated: ${t}`)
      } catch (err) {
        console.log(`[fail] truncate ${t}:`, String(err?.message || err))
      }
    }
  } finally {
    await conn.query('SET FOREIGN_KEY_CHECKS=1')
    conn.release()
    await pool.end()
  }

  console.log('[db] truncate completed')
}

main().catch((err) => {
  console.error('[db] error', err)
  process.exit(1)
})
