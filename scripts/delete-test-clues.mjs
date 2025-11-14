#!/usr/bin/env node
// 删除指定手机号的线索及关联客户（如果存在）。
// 用法：node scripts/delete-test-clues.mjs --base http://106.52.174.194/api --user Admin --pass 123456 --phone 13824975588 [--verbose]

function parseArgs() {
  const out = {}
  const args = process.argv.slice(2)
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
const BASE = (OPTS.base || 'http://106.52.174.194/api').replace(/\/$/, '')
const USER = OPTS.user || 'Admin'
const PASS = OPTS.pass || '123456'
const PHONE = OPTS.phone || ''
const VERBOSE = !!OPTS.verbose
if (!PHONE) {
  console.error('[cleanup] 缺少 --phone 参数')
  process.exit(1)
}

function vLog(...a) {
  if (VERBOSE) console.log('[cleanup]', ...a)
}
function log(...a) {
  console.log('[cleanup]', ...a)
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
    // 忽略解析错误，保持 json 为 undefined，避免空块导致 lint 失败
    json = undefined
  }
  const code = json?.code ?? (res.ok ? 0 : res.status)
  const msg = json?.msg ?? json?.message ?? ''
  return { status: res.status, code, msg, json }
}

async function login() {
  const r = await fetchJson(`${BASE}/auth/login`, {
    method: 'POST',
    body: { userName: USER, password: PASS }
  })
  // 兼容 201 Created + { code:200 }
  if ((r.json?.code ?? r.status) !== 200 || !r.json?.data?.token) {
    throw new Error(`登录失败: ${r.status} ${JSON.stringify(r.json)}`)
  }
  return r.json.data.token
}

async function listClues(token) {
  const params = new URLSearchParams({ current: '1', size: '100', customerPhone: PHONE })
  const r = await fetchJson(`${BASE}/clue/list?${params.toString()}`, { token })
  if (r.status !== 200) throw new Error(`查询线索失败: ${r.status}`)
  const rows = r.json?.data?.records || []
  return rows
}

async function deleteClue(token, id) {
  const r = await fetchJson(`${BASE}/clue/delete`, { method: 'POST', token, body: { id } })
  if (r.code !== 200) throw new Error(`删除线索失败: ${r.status} ${JSON.stringify(r.json)}`)
}

async function listCustomers(token) {
  const params = new URLSearchParams({ current: '1', size: '50', userPhone: PHONE })
  const r = await fetchJson(`${BASE}/customer/list?${params.toString()}`, { token })
  if (r.status !== 200) throw new Error(`查询客户失败: ${r.status}`)
  const rows = r.json?.data?.records || []
  return rows
}

async function deleteCustomer(token, id) {
  const r = await fetchJson(`${BASE}/customer/delete`, { method: 'POST', token, body: { id } })
  if (r.code !== 200) throw new Error(`删除客户失败: ${r.status} ${JSON.stringify(r.json)}`)
}

async function listOpportunities(token) {
  const params = new URLSearchParams({ current: '1', size: '50', customerPhone: PHONE })
  const r = await fetchJson(`${BASE}/opportunity/list?${params.toString()}`, { token })
  if (r.status !== 200) throw new Error(`查询商机失败: ${r.status}`)
  const rows = r.json?.data?.records || []
  return rows
}

async function main() {
  log('开始清理测试数据: phone=', PHONE)
  const token = await login()

  const clues = await listClues(token)
  vLog(
    'clues:',
    clues.map((c) => ({ id: c.id, name: c.customerName }))
  )
  for (const c of clues) {
    await deleteClue(token, c.id)
    log('已删除线索 id=', c.id)
  }

  const customers = await listCustomers(token)
  for (const cust of customers) {
    // 安全起见，仅删除名称前缀包含“测试客户”的记录
    if (String(cust.userName || '').startsWith('测试客户')) {
      await deleteCustomer(token, cust.id)
      log('已删除客户 id=', cust.id)
    }
  }

  const opps = await listOpportunities(token)
  if (opps.length) {
    log(
      '提醒：当前手机号仍存在商机',
      opps.map((o) => ({ id: o.id, status: o.status, level: o.opportunityLevel }))
    )
    log('当前后端未提供商机删除接口，如需删除我可以新增后端接口或将其标记为战败。')
  } else {
    log('该手机号未找到商机记录')
  }

  log('清理完成')
}

main().catch((err) => {
  console.error('[cleanup] 失败:', err?.message || err)
  process.exit(2)
})
