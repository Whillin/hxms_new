#!/usr/bin/env node
// 验证编辑线索不会新建：先新增，再用同一 id 编辑，最后检查列表仍为 1 条
// 用法示例：
//   node scripts/test-clue-edit.mjs --base http://localhost:3001/api --user Admin --pass 123456

function parseArgs() {
  const args = process.argv.slice(2)
  const map = {}
  for (let i = 0; i < args.length; i++) {
    const a = args[i]
    if (a.startsWith('--')) {
      const key = a.replace(/^--/, '')
      const val = args[i + 1] && !args[i + 1].startsWith('--') ? args[++i] : 'true'
      map[key] = val
    }
  }
  return map
}

function log(...args) {
  console.log('[edit-check]', ...args)
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg)
}

async function fetchJson(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  })
  const text = await res.text()
  let json
  try {
    json = JSON.parse(text)
  } catch {
    throw new Error(`非 JSON 响应: ${res.status} ${text}`)
  }
  return { status: res.status, json }
}

async function login(base, username, password) {
  const { status, json } = await fetchJson(`${base}/auth/login`, {
    method: 'POST',
    body: JSON.stringify({ username, password })
  })
  assert(status >= 200 && status < 300 && (json?.data?.token || json?.token), `登录失败: ${status} ${JSON.stringify(json)}`)
  return json?.data?.token || json?.token
}

function today() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

function randPhone() {
  const r = Math.floor(Math.random() * 1_0000_0000)
  return '139' + String(r).padStart(8, '0')
}

async function pickStore(base, token) {
  const res = await fetchJson(`${base}/customer/store-options`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` }
  })
  assert(res.status === 200, `获取门店选项失败: ${res.status}`)
  const stores = res.json?.data || []
  assert(Array.isArray(stores) && stores.length > 0, '门店选项为空')
  return stores[0]
}

async function pollByPhone(base, token, phone, tries = 20, intervalMs = 500) {
  let found = null
  for (let i = 0; i < tries; i++) {
    await new Promise((r) => setTimeout(r, intervalMs))
    const nonce = Date.now() + '_' + i
    const { status, json } = await fetchJson(
      `${base}/clue/list?size=5&current=1&customerPhone=${encodeURIComponent(phone)}&nonce=${encodeURIComponent(nonce)}`,
      { method: 'GET', headers: { Authorization: `Bearer ${token}` } }
    )
    if (status === 200) {
      const records = json?.data?.records || []
      found = records.find((r) => String(r.customerPhone).includes(phone))
      if (found) return found
    }
  }
  return null
}

async function main() {
  const args = parseArgs()
  const BASE = String(args.base || 'http://localhost:3001/api')
  const USER = String(args.user || 'Admin')
  const PASS = String(args.pass || '123456')

  log('使用后端:', BASE)
  const token = await login(BASE, USER, PASS)
  log('登录成功')

  const store = await pickStore(BASE, token)
  log('选择门店:', store?.name || store?.id)

  const phone = randPhone()
  const body1 = {
    customerName: '编辑验证-首条',
    customerPhone: phone,
    storeId: store.id,
    visitDate: today(),
    businessSource: '自然到店',
    channelCategory: '线下'
  }

  // 新增
  const save1 = await fetchJson(`${BASE}/clue/save`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(body1)
  })
  assert(save1.status >= 200 && save1.status < 300, `新增失败: ${save1.status} ${JSON.stringify(save1.json)}`)
  log('已提交新增，开始轮询')

  const rec1 = await pollByPhone(BASE, token, phone, 30, 500)
  assert(rec1 && rec1.id, '新增后未在列表找到记录')
  log('新增记录:', { id: rec1.id, phone })

  // 编辑（带 id，修改多个字段）
  const body2 = {
    id: rec1.id,
    customerName: '编辑验证-已更新',
    visitPurpose: '看车',
    testDrive: true,
    bargaining: true,
    dealDone: false
  }
  const save2 = await fetchJson(`${BASE}/clue/save`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(body2)
  })
  assert(save2.status >= 200 && save2.status < 300, `编辑失败: ${save2.status} ${JSON.stringify(save2.json)}`)
  log('编辑已提交，再次轮询')

  const rec2 = await pollByPhone(BASE, token, phone, 20, 400)
  assert(rec2 && rec2.id === rec1.id, `编辑后记录 id 变更，可能新建了: before=${rec1.id}, after=${rec2?.id}`)

  // 再次取列表校验只有一条匹配
  const { status: listStatus, json: listJson } = await fetchJson(
    `${BASE}/clue/list?size=10&current=1&customerPhone=${encodeURIComponent(phone)}`,
    { method: 'GET', headers: { Authorization: `Bearer ${token}` } }
  )
  assert(listStatus === 200, `列表查询失败: ${listStatus}`)
  const match = (listJson?.data?.records || []).filter((r) => String(r.customerPhone).includes(phone))
  assert(match.length === 1, `匹配到多条记录(${match.length})，编辑可能新建了重复线索`)

  log('验证通过：编辑未新建，记录保持同一 id')
  console.log(JSON.stringify({ ok: true, clueId: rec1.id, phone }, null, 2))
}

main().catch((err) => {
  console.error('执行失败:', err?.message || err)
  process.exitCode = 1
})