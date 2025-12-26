#!/usr/bin/env node
// 自检错误与越权用例：未授权访问、错误登录、重复角色创建、员工手机号非法
// 用法：node scripts/check-errors.mjs --base http://106.52.174.194/api --user Admin --pass 123456

const args = (() => {
  const out = {}
  for (const a of process.argv.slice(2)) {
    const m = a.match(/^--([^=]+)=(.*)$/)
    if (m) out[m[1]] = m[2]
  }
  return out
})()

const BASE = (args.base || 'http://localhost:3010/api').replace(/\/$/, '')
const USER = args.user || 'Admin'
const PASS = args.pass || '123456'

function makeUrl(path) {
  return `${BASE}${path.startsWith('/') ? '' : '/'}${path}`
}

async function fetchJson(
  url,
  { method = 'GET', headers = {}, body, token, expectJson = true } = {}
) {
  const h = { 'Content-Type': 'application/json', ...headers }
  if (token) h['Authorization'] = `Bearer ${token}`
  const res = await fetch(url, {
    method,
    headers: h,
    body: body ? JSON.stringify(body) : undefined
  })
  let json = undefined
  try {
    json = expectJson ? await res.json() : undefined
  } catch {
    void 0
  }
  const code = json?.code ?? (res.ok ? 0 : res.status)
  const msg = json?.msg ?? json?.message ?? ''
  return { status: res.status, code, msg, json }
}

function extractToken(loginJson) {
  return (
    loginJson?.data?.token ||
    loginJson?.data?.accessToken ||
    loginJson?.data?.jwt ||
    loginJson?.token ||
    ''
  )
}

function nowMillis() {
  return Date.now()
}

async function main() {
  const results = []

  // 1) 未授权访问 /user/info
  const unauthStart = nowMillis()
  const unauth = await fetchJson(makeUrl('/user/info'))
  results.push({
    name: 'unauthorized user/info',
    status: unauth.status,
    code: unauth.code,
    msg: unauth.msg || 'ok',
    ms: nowMillis() - unauthStart
  })

  // 2) 错误登录（错误密码）
  const badLoginStart = nowMillis()
  const badLogin = await fetchJson(makeUrl('/auth/login'), {
    method: 'POST',
    body: { username: USER, password: 'wrongpw' }
  })
  results.push({
    name: 'auth/login(bad)',
    status: badLogin.status,
    code: badLogin.code,
    msg: badLogin.msg || 'ok',
    ms: nowMillis() - badLoginStart
  })

  // 3) 正常登录，获取 token
  const loginStart = nowMillis()
  const login = await fetchJson(makeUrl('/auth/login'), {
    method: 'POST',
    body: { username: USER, password: PASS }
  })
  const token = extractToken(login.json)
  results.push({
    name: 'auth/login(good)',
    status: login.status,
    code: login.code,
    msg: login.msg || 'ok',
    ms: nowMillis() - loginStart
  })
  if (!token) {
    console.log(JSON.stringify({ ok: false, results, msg: 'no token' }, null, 2))
    process.exit(1)
  }

  // 4) 角色重复创建
  const dupCode = `ZZ_DUP_${Date.now()}`
  const firstSaveStart = nowMillis()
  const firstSave = await fetchJson(makeUrl('/role/save'), {
    method: 'POST',
    token,
    body: { roleName: '重复角色测试', roleCode: dupCode, description: '测试用角色' }
  })
  results.push({
    name: 'role/save(first)',
    status: firstSave.status,
    code: firstSave.code,
    msg: firstSave.msg || 'ok',
    ms: nowMillis() - firstSaveStart
  })

  const secondSaveStart = nowMillis()
  const secondSave = await fetchJson(makeUrl('/role/save'), {
    method: 'POST',
    token,
    body: { roleName: '重复角色测试', roleCode: dupCode, description: '测试用角色' }
  })
  results.push({
    name: 'role/save(duplicate)',
    status: secondSave.status,
    code: secondSave.code,
    msg: secondSave.msg || 'ok',
    ms: nowMillis() - secondSaveStart
  })

  // 查询以获取 id 并清理
  const listStart = nowMillis()
  const listDup = await fetchJson(makeUrl(`/role/list?roleCode=${encodeURIComponent(dupCode)}`), {
    token
  })
  let roleId = (listDup?.json?.data?.records || []).find((r) => r.roleCode === dupCode)?.roleId
  if (!roleId) {
    roleId =
      firstSave?.json?.data?.roleId ||
      firstSave?.json?.data?.id ||
      firstSave?.json?.data?.role?.id ||
      firstSave?.json?.id
  }
  results.push({
    name: 'role/list(filter)',
    status: listDup.status,
    code: listDup.code,
    msg: listDup.msg || 'ok',
    ms: nowMillis() - listStart
  })
  if (roleId) {
    const delStart = nowMillis()
    const del = await fetchJson(makeUrl('/role/delete'), {
      method: 'POST',
      token,
      body: { id: roleId }
    })
    results.push({
      name: 'role/delete(cleanup)',
      status: del.status,
      code: del.code,
      msg: del.msg || 'ok',
      ms: nowMillis() - delStart
    })
  } else {
    results.push({
      name: 'role/delete(cleanup)',
      status: 0,
      code: 0,
      msg: 'skipped: roleId missing',
      ms: 0
    })
  }

  // 5) 员工手机号非法
  const empStart = nowMillis()
  const empBad = await fetchJson(makeUrl('/employee/save'), {
    method: 'POST',
    token,
    body: {
      name: '错误手机号测试',
      gender: 'male',
      status: '1',
      role: 'R_SALES',
      storeId: 1,
      hireDate: '2023-01-01',
      phone: '12345'
    }
  })
  results.push({
    name: 'employee/save(bad phone)',
    status: empBad.status,
    code: empBad.code,
    msg: empBad.msg || 'ok',
    ms: nowMillis() - empStart
  })

  const summary = { ok: true, base: BASE, results }
  console.log(JSON.stringify(summary, null, 2))
}

main().catch((err) => {
  console.error(err)
  process.exit(2)
})
