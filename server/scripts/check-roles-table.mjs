#!/usr/bin/env node
import 'dotenv/config'
import mysql from 'mysql2/promise'

async function main() {
  const host = process.env.MYSQL_HOST || 'localhost'
  const port = Number(process.env.MYSQL_PORT || 3306)
  const user = process.env.MYSQL_USER || 'root'
  const password = process.env.MYSQL_PASSWORD || '123456'
  const database = process.env.MYSQL_DB || 'hxms_dev'

  console.log('🔍 检查角色表状态...')
  console.log('数据库连接:', { host, port, database })

  let conn
  try {
    conn = await mysql.createConnection({ host, port, user, password, database })
    console.log('✅ 数据库连接成功')

    // 检查 roles 表是否存在
    const [tables] = await conn.execute(
      `
      SELECT TABLE_NAME 
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'roles'
    `,
      [database]
    )

    if (tables.length === 0) {
      console.log('❌ roles 表不存在！')
      return
    }

    console.log('✅ roles 表存在')

    // 查询所有角色记录
    const [roles] = await conn.execute(`
      SELECT id, roleCode, roleName, description, enabled, createTime 
      FROM roles 
      ORDER BY id ASC
    `)

    console.log(`\n📊 roles 表记录总数: ${roles.length}`)

    if (roles.length === 0) {
      console.log('⚠️  roles 表为空！这会导致所有用户角色被过滤为 R_FRONT_DESK')
      console.log('\n🔧 建议操作:')
      console.log('1. 运行角色种子数据插入')
      console.log('2. 或手动插入 R_SUPER 和 R_ADMIN 记录')
      return
    }

    console.log('\n📋 当前角色记录:')
    console.table(roles)

    // 检查关键角色是否存在
    const requiredRoles = ['R_SUPER', 'R_ADMIN', 'R_FRONT_DESK']
    const existingCodes = roles.map((r) => r.roleCode)
    const missingRoles = requiredRoles.filter((code) => !existingCodes.includes(code))

    if (missingRoles.length > 0) {
      console.log(`\n❌ 缺少关键角色: ${missingRoles.join(', ')}`)
      console.log('这会导致用户登录后角色被过滤，触发前台兜底逻辑')

      console.log('\n🔧 修复 SQL:')
      missingRoles.forEach((roleCode) => {
        const roleInfo = {
          R_SUPER: { name: '超级管理员', desc: '系统的超级管理员，可访问所有功能' },
          R_ADMIN: { name: '系统管理员', desc: '系统基础管理角色，可访问大部分功能' },
          R_FRONT_DESK: { name: '前台', desc: '前台岗位权限，可访问线索与个人中心的基础功能' }
        }
        const info = roleInfo[roleCode] || { name: roleCode, desc: `${roleCode} 角色` }
        console.log(
          `INSERT INTO roles (roleCode, roleName, description, enabled) VALUES ('${roleCode}', '${info.name}', '${info.desc}', 1);`
        )
      })
    } else {
      console.log('\n✅ 关键角色完整')
    }

    // 检查禁用的角色
    const disabledRoles = roles.filter((r) => !r.enabled)
    if (disabledRoles.length > 0) {
      console.log(`\n⚠️  发现 ${disabledRoles.length} 个禁用角色:`)
      disabledRoles.forEach((r) => {
        console.log(`  - ${r.roleCode} (${r.roleName}) - 已禁用`)
      })
      console.log('禁用的角色会被 sanitizeRoles 过滤掉')
    }
  } catch (error) {
    console.error('❌ 检查失败:', error.message)
    if (error.code === 'ECONNREFUSED') {
      console.log('💡 请确保数据库服务正在运行')
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.log('💡 请检查数据库用户名和密码')
    }
    process.exit(1)
  } finally {
    if (conn) {
      await conn.end()
    }
  }
}

main().catch(console.error)
