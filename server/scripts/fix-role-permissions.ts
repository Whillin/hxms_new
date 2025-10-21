import 'dotenv/config'
import mysql from 'mysql2/promise'

async function main() {
  const host = process.env.MYSQL_HOST || 'localhost'
  const port = Number(process.env.MYSQL_PORT || 3306)
  const user = process.env.MYSQL_USER || 'root'
  const password = process.env.MYSQL_PASSWORD || '123456'
  const database = process.env.MYSQL_DB || 'hxms_dev'

  const conn = await mysql.createConnection({ host, port, user, password, database })
  try {
    console.log('[cleanup] connected to db:', { host, port, database })

    const deleteEmpty = `DELETE FROM role_permissions WHERE permissionKey IS NULL OR permissionKey = ''`
    const [resEmpty] = await conn.execute(deleteEmpty)
    console.log('[cleanup] deleted empty permissionKey rows:', resEmpty)

    const deleteDup = `DELETE rp1 FROM role_permissions rp1 INNER JOIN role_permissions rp2 ON rp1.roleId = rp2.roleId AND rp1.permissionKey = rp2.permissionKey AND rp1.id > rp2.id`
    const [resDup] = await conn.execute(deleteDup)
    console.log('[cleanup] deleted duplicate roleId/permissionKey rows:', resDup)

    console.log('[cleanup] done.')
  } catch (err) {
    console.error('[cleanup] error:', err)
    process.exitCode = 1
  } finally {
    await conn.end()
  }
}

main()
