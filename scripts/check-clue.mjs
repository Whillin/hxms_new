#!/usr/bin/env node
// 保存测试线索脚本：根据门店选项提交最小必填字段，并轮询列表验证出现
// 用法示例：
//   node scripts/check-clue.mjs --base http://localhost:3002/api --user Admin --pass 123456

// Node 18+ 原生支持 fetch

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
  console.log('[clue]', ...args)
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
  assert(
    status >= 200 && status < 300 && (json?.data?.token || json?.token),
    `登录失败: ${status} ${JSON.stringify(json)}`
  )
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
  return '138' + String(r).padStart(8, '0')
}

async function main() {
  const args = parseArgs()
  const BASE = String(args.base || 'http://localhost:3010/api')
  const USER = String(args.user || 'Admin')
  const PASS = String(args.pass || '123456')

  log('使用后端:', BASE)
  const token = await login(BASE, USER, PASS)
  log('登录成功, token 获取完成')

  const storeRes = await fetchJson(`${BASE}/customer/store-options`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` }
  })
  assert(storeRes.status === 200, `获取门店选项失败: ${storeRes.status}`)
  const stores = storeRes.json?.data || []
  assert(Array.isArray(stores) && stores.length > 0, '门店选项为空，请先初始化门店')
  const store = stores[0]
  log('使用门店:', store)

  const phone = randPhone()
  const body = {
    customerName: '自测客户',
    customerPhone: phone,
    storeId: store.id,
    visitDate: today(),
    businessSource: '自然到店',
    channelCategory: '线下'
  }

  const saveRes = await fetchJson(`${BASE}/clue/save`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(body)
  })
  assert(
    saveRes.status >= 200 && saveRes.status < 300,
    `提交线索失败: ${saveRes.status} ${JSON.stringify(saveRes.json)}`
  )
  log('线索保存任务已提交，开始轮询列表...')

  const maxTries = 30
  let found = null
  for (let i = 0; i < maxTries; i++) {
    await new Promise((r) => setTimeout(r, 500))
    const nonce = Date.now() + '_' + i
    const listRes = await fetchJson(
      `${BASE}/clue/list?size=5&current=1&customerPhone=${encodeURIComponent(phone)}&nonce=${encodeURIComponent(nonce)}`,
      {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` }
      }
    )
    if (listRes.status === 200) {
      const records = listRes.json?.data?.records || []
      found = records.find((r) => r.customerPhone?.includes(phone))
      if (found) break
    }
  }

  assert(found, '轮询超时，列表中未找到新线索')
  log('已在列表中找到线索记录:', {
    id: found.id,
    customerName: found.customerName,
    storeId: found.storeId
  })
  console.log(JSON.stringify({ ok: true, phone, clueId: found.id }, null, 2))
}

main().catch((err) => {
  console.error('执行失败:', err?.message || err)
  process.exitCode = 1
})
