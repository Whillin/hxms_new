#!/usr/bin/env node
// 检查指定用户的登录、user/info、可见门店选项以及线索总数
// 用法：node scripts/check-scope.mjs --base http://106.52.174.194/api --user 卢小岚 --pass 123456 [--verbose]

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
const BASE = (OPTS.base || process.env.HXMS_BASE || 'http://106.52.174.194/api').replace(/\/$/, '')
const USER = OPTS.user || process.env.HXMS_USER || 'Admin'
const PASS = OPTS.pass || process.env.HXMS_PASS || '123456'
const VERBOSE = !!OPTS.verbose

function vLog(...a) {
  if (VERBOSE) console.log(...a)
}

async function fetchJson(url, opts = {}) {
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) }
  const body = opts.body ? JSON.stringify(opts.body) : undefined
  const res = await fetch(url, { ...opts, headers, body })
  let json
  try {
    json = await res.json()
  } catch {
    json = { code: res.status, msg: 'non-json' }
  }
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

function bearer(token) {
  return token ? { Authorization: `Bearer ${token}` } : {}
}

;(async () => {
  try {
    console.log(`[Scope] Base: ${BASE}`)
    console.log(`[Scope] Login as ${USER} ...`)
    const loginRes = await login(USER, PASS)
    vLog('[Login Raw]', loginRes)
    console.log('[Scope] Login:', loginRes.code, loginRes.msg)
    const token = loginRes?.data?.token
    if (!token) {
      console.error('[Scope] 登录失败，未返回 token')
      process.exit(2)
    }

    console.log('[Scope] user/info ...')
    const infoRes = await fetchJson(`${BASE}/user/info`, { headers: bearer(token) })
    vLog('[Info Raw]', infoRes)
    const info = infoRes?.json?.data || {}
    console.log(
      `[Scope] roles=${JSON.stringify(info.roles || [])} employeeId=${info.employeeId} storeId=${info.storeId}`
    )

    console.log('[Scope] customer/store-options ...')
    const storesRes = await fetchJson(`${BASE}/customer/store-options`, { headers: bearer(token) })
    const storeOptions = Array.isArray(storesRes?.json?.data) ? storesRes.json.data : []
    const storeIds = storeOptions.map((s) => s.id)
    console.log(
      `[Scope] allowed_store_ids=${JSON.stringify(storeIds)} count=${storeOptions.length}`
    )

    console.log('[Scope] clue/list total ...')
    const clueRes = await fetchJson(new URL(`${BASE}/clue/list?current=1&size=1`).toString(), {
      headers: bearer(token)
    })
    const total = clueRes?.json?.data?.total || 0
    console.log(`[Scope] clue_total=${total}`)

    const summary = {
      base: BASE,
      user: USER,
      roles: info.roles || [],
      employeeId: info.employeeId,
      storeId: info.storeId,
      allowedStoreIds: storeIds,
      clueTotal: total
    }
    console.log('[Scope] summary:', JSON.stringify(summary, null, 2))
  } catch (e) {
    console.error('[Scope] failed:', e)
    process.exit(1)
  }
})()
