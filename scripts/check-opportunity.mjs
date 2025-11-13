#!/usr/bin/env node
// 验证指定用户的商机列表是否符合可见范围规则
// 用法：node scripts/check-opportunity.mjs --base http://localhost:3002/api --user 陈纪杭 --pass 123456 [--verbose]

const args = process.argv.slice(2)
function parseArgs() {
  const out = {}
  for (let i = 0; i < args.length; i++) {
    const a = args[i]
    if (a.startsWith('--')) {
      const [k, v] = a.split('=')
      const key = k.replace(/^--/, '')
      if (v !== undefined) out[key] = v
      else if (args[i + 1] && !args[i + 1].startsWith('--')) out[key] = args[++i]
      else out[key] = true
    }
  }
  return out
}
const OPTS = parseArgs()
const BASE = (OPTS.base || process.env.HXMS_BASE || 'http://localhost:3002/api').replace(/\/$/, '')
const USER = OPTS.user || process.env.HXMS_USER || 'Admin'
const PASS = OPTS.pass || process.env.HXMS_PASS || '123456'
const VERBOSE = !!OPTS.verbose

function vLog(...a) { if (VERBOSE) console.log(...a) }

async function fetchJson(url, opts = {}) {
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) }
  const body = opts.body ? JSON.stringify(opts.body) : undefined
  const res = await fetch(url, { ...opts, headers, body })
  let json
  try { json = await res.json() } catch { json = { code: res.status, msg: 'non-json' } }
  return { status: res.status, json }
}

async function login(userName, password) {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userName, password })
  })
  const json = await res.json()
  return json
}

function bearer(token) { return token ? { Authorization: `Bearer ${token}` } : {} }

;(async () => {
  try {
    console.log(`[OppCheck] Base: ${BASE}`)
    console.log(`[OppCheck] Login as ${USER} ...`)
    const loginRes = await login(USER, PASS)
    vLog('[Login Raw]', loginRes)
    if (loginRes.code !== 200 || !loginRes?.data?.token) {
      console.error(`[OppCheck] 登录失败：${loginRes.msg || '未知错误'}`)
      process.exit(2)
    }
    const token = loginRes.data.token

    const infoRes = await fetchJson(`${BASE}/user/info`, { headers: bearer(token) })
    const info = infoRes?.json?.data || {}
    const roles = Array.isArray(info.roles) ? info.roles : []
    const employeeId = info.employeeId
    const departmentId = info.departmentId
    console.log(`[OppCheck] roles=${JSON.stringify(roles)} employeeId=${employeeId} departmentId=${departmentId}`)

    const listUrl = new URL(`${BASE}/opportunity/list`)
    listUrl.searchParams.set('current', '1')
    listUrl.searchParams.set('size', '50')
    const listRes = await fetchJson(listUrl.toString(), { headers: bearer(token) })
    const page = listRes?.json?.data || {}
    const rows = Array.isArray(page.records) ? page.records : []
    console.log(`[OppCheck] total=${page.total || 0} count=${rows.length}`)

    // 校验规则
    const isSales = roles.includes('R_SALES')
    const isSalesManager = roles.includes('R_SALES_MANAGER')
    let violations = []
    if (isSales && typeof employeeId === 'number') {
      violations = rows.filter((r) => Number(r.ownerId) !== Number(employeeId))
      console.log(`[OppCheck] 规则：销售仅本人；违规条数=${violations.length}`)
    } else if (isSalesManager && typeof departmentId === 'number') {
      violations = rows.filter((r) => Number(r.ownerDepartmentId) !== Number(departmentId))
      console.log(`[OppCheck] 规则：销售经理仅本部门；违规条数=${violations.length}`)
    } else {
      console.log('[OppCheck] 非销售/销售经理角色，跳过强校验（维持数据范围默认逻辑）。')
    }

    if (violations.length > 0) {
      console.error('[OppCheck] 检测到违规记录示例：', JSON.stringify(violations.slice(0, 3), null, 2))
      process.exit(3)
    }
    console.log('[OppCheck] 校验通过。')
  } catch (e) {
    console.error('[OppCheck] 运行失败：', e)
    process.exit(1)
  }
})()