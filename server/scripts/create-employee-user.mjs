#!/usr/bin/env node
import fs from 'fs'
import path from 'path'
import mysql from 'mysql2/promise'
import bcrypt from 'bcryptjs'

/**
 * 配置默认创建参数：如需更改可直接修改下方常量
 */
const DEFAULTS = {
  employeeName: '上汽奥迪上海店-销售001',
  employeePhone: '13800001234',
  employeeGender: 'male', // male | female | other
  employeeStatus: '1', // 1 在职, 2 离职
  employeeRole: 'R_SALES',
  hireDate: new Date().toISOString().slice(0, 10),
  userName: '13800001234',
  initialPassword: '123456',
  storeName: '上汽奥迪上海店'
}

function parseEnvFile(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf-8')
    for (const line of raw.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/)
      if (m) {
        const k = m[1]
        let v = m[2]
        if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith('\'') && v.endsWith('\''))) {
          v = v.slice(1, -1)
        }
        process.env[k] = v
      }
    }
  } catch (err) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[create-employee-user] env file not read:', filePath, String(err?.message || err))
    }
  }
}

async function connect() {
  const preferHost = process.env.MYSQL_HOST || '127.0.0.1'
  const preferPort = Number(process.env.MYSQL_PORT || 3306)
  const user = process.env.MYSQL_USER || 'root'
  const password = process.env.MYSQL_PASSWORD || '123456'
  const db = process.env.MYSQL_DB || 'hxms_dev'

  const candidates = [
    { host: preferHost, port: preferPort },
    { host: '127.0.0.1', port: 13306 }
  ]

  let lastErr
  for (const c of candidates) {
    try {
      const conn = await mysql.createConnection({
        host: c.host,
        port: c.port,
        user,
        password,
        database: db,
        multipleStatements: true
      })
      return { conn, db }
    } catch (e) {
      lastErr = e
    }
  }
  throw lastErr || new Error('Unable to connect to MySQL')
}

async function findStore(conn, db, storeName) {
  const [rows] = await conn.query(
    `SELECT id, parentId, name, type, code FROM \`${db}\`.departments WHERE name LIKE ? AND type='store' LIMIT 1`,
    [`%${storeName}%`]
  )
  if (!rows || rows.length === 0) return null
  return rows[0]
}

async function findById(conn, db, id) {
  const [rows] = await conn.query(
    `SELECT id, parentId, name, type, code FROM \`${db}\`.departments WHERE id=? LIMIT 1`,
    [id]
  )
  return rows && rows.length ? rows[0] : null
}

async function resolveBrandRegionFromStore(conn, db, storeRow) {
  const storeId = Number(storeRow?.id)
  const region = await findById(conn, db, Number(storeRow?.parentId))
  let department = null
  let brand = null
  if (region) {
    department = await findById(conn, db, Number(region.parentId))
    if (department && department.type === 'department') {
      brand = await findById(conn, db, Number(department.parentId))
    } else if (region.type === 'region') {
      // 容错：旧数据可能 region 直接挂在 brand 之下
      brand = department && department.type === 'brand' ? department : await findById(conn, db, Number(region.parentId))
    }
  }
  return {
    brandId: brand ? Number(brand.id) : undefined,
    regionId: region ? Number(region.id) : undefined,
    storeId
  }
}

async function ensureEmployee(conn, db, payload) {
  const [existsRows] = await conn.query(
    `SELECT id, status FROM \`${db}\`.employees WHERE phone=? LIMIT 1`,
    [payload.employeePhone]
  )
  if (Array.isArray(existsRows) && existsRows.length) {
    const empId = Number(existsRows[0].id)
    // 若已存在但状态不是在职，更新为在职
    if (String(existsRows[0].status) !== '1') {
      await conn.query(`UPDATE \`${db}\`.employees SET status='1' WHERE id=?`, [empId])
    }
    return empId
  }

  const [res] = await conn.query(
    `INSERT INTO \`${db}\`.employees (name, phone, gender, status, role, brandId, regionId, storeId, hireDate) VALUES (?,?,?,?,?,?,?,?,?)`,
    [
      payload.employeeName,
      payload.employeePhone,
      payload.employeeGender,
      payload.employeeStatus,
      payload.employeeRole,
      payload.brandId || null,
      payload.regionId || null,
      payload.storeId || null,
      payload.hireDate
    ]
  )
  const insertId = res?.insertId
  if (!insertId) throw new Error('插入员工失败')
  return Number(insertId)
}

async function ensureUser(conn, db, employeeId, userName, initialPassword, role) {
  const [byEmp] = await conn.query(
    `SELECT id, userName FROM \`${db}\`.users WHERE employeeId=? LIMIT 1`,
    [employeeId]
  )
  const passwordHash = bcrypt.hashSync(initialPassword, 10)
  const rolesJson = JSON.stringify(['R_USER', role])

  if (Array.isArray(byEmp) && byEmp.length) {
    const userId = Number(byEmp[0].id)
    // 已存在：更新密码为初始值，并确保角色包含岗位角色
    await conn.query(
      `UPDATE \`${db}\`.users SET passwordHash=?, roles=?, enabled=true WHERE id=?`,
      [passwordHash, rolesJson, userId]
    )
    return { id: userId, userName: byEmp[0].userName, reset: true }
  }

  // 检查用户名是否被占用
  const [byName] = await conn.query(
    `SELECT id FROM \`${db}\`.users WHERE userName=? LIMIT 1`,
    [userName]
  )
  if (Array.isArray(byName) && byName.length) {
    throw new Error(`用户名已存在：${userName}`)
  }

  const [res] = await conn.query(
    `INSERT INTO \`${db}\`.users (userName, passwordHash, roles, enabled, employeeId) VALUES (?,?,?,?,?)`,
    [userName, passwordHash, rolesJson, true, employeeId]
  )
  const insertId = res?.insertId
  if (!insertId) throw new Error('创建用户失败')
  return { id: Number(insertId), userName, reset: false }
}

async function main() {
  const root = path.resolve(process.cwd(), 'server')
  parseEnvFile(path.join(root, '.env.production'))
  parseEnvFile(path.join(root, '.env'))

  const { conn, db } = await connect()
  try {
    console.log('[create] connecting db:', db)
    const store = await findStore(conn, db, DEFAULTS.storeName)
    if (!store) {
      throw new Error(`未找到门店：${DEFAULTS.storeName}`)
    }
    const org = await resolveBrandRegionFromStore(conn, db, store)
    const payload = {
      employeeName: DEFAULTS.employeeName,
      employeePhone: DEFAULTS.employeePhone,
      employeeGender: DEFAULTS.employeeGender,
      employeeStatus: DEFAULTS.employeeStatus,
      employeeRole: DEFAULTS.employeeRole,
      hireDate: DEFAULTS.hireDate,
      brandId: org.brandId,
      regionId: org.regionId,
      storeId: org.storeId
    }

    const empId = await ensureEmployee(conn, db, payload)
    const user = await ensureUser(
      conn,
      db,
      empId,
      DEFAULTS.userName,
      DEFAULTS.initialPassword,
      DEFAULTS.employeeRole
    )

    console.log('[create] done:', {
      employeeId: empId,
      userId: user.id,
      userName: user.userName,
      password: DEFAULTS.initialPassword,
      role: DEFAULTS.employeeRole,
      storeName: DEFAULTS.storeName,
      brandId: payload.brandId,
      regionId: payload.regionId,
      storeId: payload.storeId,
      resetExistingUser: user.reset
    })
  } finally {
    await conn.end()
  }
}

main().catch((e) => {
  console.error('[create] failed:', e?.message || e)
  process.exit(1)
})