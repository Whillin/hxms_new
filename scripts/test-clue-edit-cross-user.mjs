#!/usr/bin/env node
// 跨用户编辑验证：在同一门店下，A 用户新增线索，B 用户携带 id 编辑，不应新建
// 步骤：
// 1) 管理员登录，选择门店与部门树，计算 brandId/regionId
// 2) 管理员创建员工(门店=S)；注册一个销售用户B（与员工同名同手机号）
// 3) 管理员新增线索；销售用户B编辑该线索；校验 id 未变化且记录唯一
// 4) 反向再测：销售用户B新增线索；管理员编辑；校验不新建

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
  console.log('[cross-edit]', ...args)
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

function randPhone(prefix = '137') {
  const r = Math.floor(Math.random() * 1_0000_0000)
  return prefix + String(r).padStart(8, '0')
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

async function loadDeptTree(base, token) {
  const res = await fetchJson(`${base}/department/tree`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` }
  })
  assert(res.status === 200, `获取部门树失败: ${res.status}`)
  return res.json?.data || []
}

function buildIndex(tree) {
  const idx = new Map()
  const walk = (node) => {
    if (!node) return
    idx.set(node.id, node)
    const children = node.children || node.nodes || []
    for (const c of children) walk(c)
  }
  for (const root of tree) walk(root)
  return idx
}

function findAncestors(storeId, idx) {
  const seen = new Set()
  let cur = idx.get(storeId)
  let regionId, brandId
  while (cur && typeof cur.parentId === 'number' && !seen.has(cur.parentId)) {
    seen.add(cur.parentId)
    const p = idx.get(cur.parentId)
    if (!p) break
    if (p.type === 'region') regionId = p.id
    if (p.type === 'brand') brandId = p.id
    cur = p
  }
  return { regionId, brandId }
}

async function ensureEmployee(base, token, store, idx) {
  const { regionId, brandId } = findAncestors(store.id, idx)
  assert(typeof regionId === 'number' && typeof brandId === 'number', '门店父链缺少品牌或区域')
  const name = `销售-${Date.now().toString().slice(-6)}`
  const phone = randPhone('136')
  const body = {
    name,
    phone,
    gender: 'male',
    status: '1',
    role: 'R_SALES',
    hireDate: today(),
    brandId,
    regionId,
    storeId: store.id
  }
  const res = await fetchJson(`${base}/employee/save`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(body)
  })
  assert(res.status >= 200 && res.status < 300, `保存员工失败: ${res.status} ${JSON.stringify(res.json)}`)
  return { name, phone }
}

async function registerUser(base, name, phone) {
  const username = `user_${name}`
  const password = '123456'
  const res = await fetchJson(`${base}/auth/register`, {
    method: 'POST',
    body: JSON.stringify({ username, password, name, phone })
  })
  assert(res.status >= 200 && res.status < 300, `注册用户失败: ${res.status} ${JSON.stringify(res.json)}`)
  return { username, password }
}

async function pollByPhone(base, token, phone, tries = 30, intervalMs = 500) {
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

async function addClue(base, token, storeId, phone, name = '跨用户新增') {
  const body = {
    customerName: name,
    customerPhone: phone,
    storeId,
    visitDate: today(),
    businessSource: '自然到店',
    channelCategory: '线下'
  }
  const res = await fetchJson(`${base}/clue/save`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(body)
  })
  assert(res.status >= 200 && res.status < 300, `新增线索失败: ${res.status} ${JSON.stringify(res.json)}`)
}

async function editClue(base, token, id, fields = {}) {
  const body = { id, ...fields }
  const res = await fetchJson(`${base}/clue/save`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(body)
  })
  assert(res.status >= 200 && res.status < 300, `编辑线索失败: ${res.status} ${JSON.stringify(res.json)}`)
}

async function main() {
  const args = parseArgs()
  const BASE = String(args.base || 'http://localhost:3002/api')
  const ADMIN = String(args.admin || 'Admin')
  const ADMIN_PASS = String(args.adminPass || '123456')

  log('使用后端:', BASE)
  const adminToken = await login(BASE, ADMIN, ADMIN_PASS)
  log('管理员登录成功')

  const store = await pickStore(BASE, adminToken)
  log('选择门店:', store?.name || store?.id)
  const tree = await loadDeptTree(BASE, adminToken)
  const idx = buildIndex(tree)

  const { name, phone } = await ensureEmployee(BASE, adminToken, store, idx)
  log('已创建员工:', { name, phone })

  const { username, password } = await registerUser(BASE, name, phone)
  log('已注册用户:', { username })
  const userToken = await login(BASE, username, password)
  log('销售用户登录成功')

  // 场景一：Admin 新增，销售用户编辑
  const phone1 = randPhone('139')
  await addClue(BASE, adminToken, store.id, phone1, '跨用户-场景一')
  const rec1 = await pollByPhone(BASE, adminToken, phone1)
  assert(rec1 && rec1.id, '场景一：新增后未找到记录')
  await editClue(BASE, userToken, rec1.id, { customerName: '跨用户-编辑1', testDrive: true })
  const rec1b = await pollByPhone(BASE, adminToken, phone1)
  assert(rec1b && rec1b.id === rec1.id, '场景一：编辑后 id 变化，疑似新建')
  const { status: l1s, json: l1j } = await fetchJson(
    `${BASE}/clue/list?size=10&current=1&customerPhone=${encodeURIComponent(phone1)}`,
    { method: 'GET', headers: { Authorization: `Bearer ${adminToken}` } }
  )
  assert(l1s === 200, '场景一：列表查询失败')
  const match1 = (l1j?.data?.records || []).filter((r) => String(r.customerPhone).includes(phone1))
  assert(match1.length === 1, `场景一：匹配到多条(${match1.length})，疑似新建`) 

  // 场景二：销售用户新增，Admin 编辑
  const phone2 = randPhone('138')
  await addClue(BASE, userToken, store.id, phone2, '跨用户-场景二')
  const rec2 = await pollByPhone(BASE, userToken, phone2)
  assert(rec2 && rec2.id, '场景二：新增后未找到记录')
  await editClue(BASE, adminToken, rec2.id, { customerName: '跨用户-编辑2', bargaining: true })
  const rec2b = await pollByPhone(BASE, userToken, phone2)
  assert(rec2b && rec2b.id === rec2.id, '场景二：编辑后 id 变化，疑似新建')
  const { status: l2s, json: l2j } = await fetchJson(
    `${BASE}/clue/list?size=10&current=1&customerPhone=${encodeURIComponent(phone2)}`,
    { method: 'GET', headers: { Authorization: `Bearer ${userToken}` } }
  )
  assert(l2s === 200, '场景二：列表查询失败')
  const match2 = (l2j?.data?.records || []).filter((r) => String(r.customerPhone).includes(phone2))
  assert(match2.length === 1, `场景二：匹配到多条(${match2.length})，疑似新建`)

  log('跨用户编辑验证通过：两个场景均未新建重复线索')
  console.log(JSON.stringify({ ok: true, users: { admin: ADMIN, sales: username } }, null, 2))
}

main().catch((err) => {
  console.error('执行失败:', err?.message || err)
  process.exitCode = 1
})