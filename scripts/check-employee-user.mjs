import { createPool } from 'mysql2/promise'

const name = process.argv[2] || ''
const phone = process.argv[3] || ''

const host = process.env.MYSQL_HOST || '127.0.0.1'
const port = Number(process.env.MYSQL_PORT || 13306)
const user = process.env.MYSQL_USER || 'root'
const password = process.env.MYSQL_PASSWORD || '123456'
const database = process.env.MYSQL_DB || 'hxms_dev'

async function main() {
  const pool = await createPool({ host, port, user, password, database, waitForConnections: true })
  console.log('[db] connecting', { host, port, user, database })
  console.log('[input]', { name, phone })

  try {
    const [emps] = await pool.query(
      'SELECT id, name, phone, status, role FROM employees WHERE name=? AND phone=?',
      [name, phone]
    )
    console.log('[employees match]', Array.isArray(emps) ? emps : [])

    const emp = Array.isArray(emps) && emps.length ? emps[0] : null

    const [empByNameOnly] = await pool.query(
      'SELECT id, name, phone, status, role FROM employees WHERE name=?',
      [name]
    )
    console.log('[employees by name only]', Array.isArray(empByNameOnly) ? empByNameOnly : [])

    const [usersByName] = await pool.query(
      'SELECT id, userName, employeeId FROM users WHERE userName=?',
      [name]
    )
    console.log('[users by userName]', Array.isArray(usersByName) ? usersByName : [])

    if (emp && typeof emp.id === 'number') {
      const [usersByEmp] = await pool.query(
        'SELECT id, userName, employeeId FROM users WHERE employeeId=?',
        [emp.id]
      )
      console.log('[users by employeeId]', Array.isArray(usersByEmp) ? usersByEmp : [])
    }
  } finally {
    await pool.end()
  }
}

main().catch((err) => {
  console.error('[error]', String(err?.message || err))
  process.exit(1)
})