import { createPool } from 'mysql2/promise'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const bcrypt = require('../server/node_modules/bcryptjs')

const name = process.argv[2] || ''
const newPass = process.argv[3] || '123456'

if (!name) {
  console.error('Usage: node scripts/reset-user-password.mjs <userName> [newPassword]')
  process.exit(1)
}

const host = process.env.MYSQL_HOST || '127.0.0.1'
const port = Number(process.env.MYSQL_PORT || 13306)
const user = process.env.MYSQL_USER || 'root'
const password = process.env.MYSQL_PASSWORD || '123456'
const database = process.env.MYSQL_DB || 'hxms_dev'

async function main() {
  const pool = await createPool({ host, port, user, password, database, waitForConnections: true })
  console.log('[db] connecting', { host, port, user, database })
  console.log('[input]', { userName: name, newPass })

  try {
    const [users] = await pool.query('SELECT id, userName FROM users WHERE userName=?', [name])
    const userRow = Array.isArray(users) && users.length ? users[0] : null
    if (!userRow) {
      console.error('[error] user not found:', name)
      return
    }

    const hash = bcrypt.hashSync(newPass, 10)
    const [result] = await pool.query('UPDATE users SET passwordHash=? WHERE userName=?', [
      hash,
      name
    ])
    console.log('[update] done:', result)

    const [verify] = await pool.query(
      'SELECT id, userName, passwordHash FROM users WHERE userName=?',
      [name]
    )
    console.log('[verify] sample:', Array.isArray(verify) && verify.length ? verify[0] : null)
  } finally {
    await pool.end()
  }
}

main().catch((err) => {
  console.error('[error]', String(err?.message || err))
  process.exit(1)
})
