#!/usr/bin/env node
// 覆盖必填项审计：验证“填写的字段是否都落库”，并探测“漏填但仍保存”的可能（以警告提示）
// 用销售用户新增，确保 createdBy 记录员工ID；再进行编辑覆盖“非首购画像”等分支

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

const log = (...xs) => console.log('[required-check]', ...xs)
const assert = (cond, msg) => {
  if (!cond) throw new Error(msg)
}

async function fetchJson(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }
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
function randPhone(prefix = '137') {
  return prefix + String(Math.floor(Math.random() * 1_0000_0000)).padStart(8, '0')
}

async function pickStore(base, token) {
  const res = await fetchJson(`${base}/customer/store-options`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` }
  })
  assert(res.status === 200, `获取门店失败: ${res.status}`)
  const stores = res.json?.data || []
  assert(Array.isArray(stores) && stores.length > 0, '门店为空')
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
  const walk = (n) => {
    if (!n) return
    idx.set(n.id, n)
    const cs = n.children || n.nodes || []
    cs.forEach(walk)
  }
  tree.forEach(walk)
  return idx
}
function findAncestors(storeId, idx) {
  let cur = idx.get(storeId)
  let regionId, brandId
  const seen = new Set()
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
  assert(
    res.status >= 200 && res.status < 300,
    `保存员工失败: ${res.status} ${JSON.stringify(res.json)}`
  )
  return { name, phone }
}

async function registerUser(base, name, phone) {
  const username = `user_${name}`
  const password = '123456'
  const res = await fetchJson(`${base}/auth/register`, {
    method: 'POST',
    body: JSON.stringify({ username, password, name, phone })
  })
  assert(
    res.status >= 200 && res.status < 300,
    `注册用户失败: ${res.status} ${JSON.stringify(res.json)}`
  )
  return { username, password }
}

async function getUserInfo(base, token) {
  const { status, json } = await fetchJson(`${base}/user/info`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` }
  })
  assert(status === 200, `获取用户信息失败: ${status}`)
  return json?.data || {}
}

async function pollByPhone(base, token, phone, tries = 30, intervalMs = 500) {
  for (let i = 0; i < tries; i++) {
    await new Promise((r) => setTimeout(r, intervalMs))
    const nonce = Date.now() + '_' + i
    const { status, json } = await fetchJson(
      `${base}/clue/list?size=5&current=1&customerPhone=${encodeURIComponent(phone)}&nonce=${encodeURIComponent(nonce)}`,
      { method: 'GET', headers: { Authorization: `Bearer ${token}` } }
    )
    if (status === 200) {
      const rec = (json?.data?.records || []).find((r) => String(r.customerPhone).includes(phone))
      if (rec) return rec
    }
  }
  return null
}

async function saveClue(base, token, payload) {
  const { status, json } = await fetchJson(`${base}/clue/save`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload)
  })
  assert(status >= 200 && status < 300, `保存线索失败: ${status} ${JSON.stringify(json)}`)
  return json
}

async function main() {
  const args = parseArgs()
  const BASE = String(args.base || 'http://localhost:3002/api')
  const ADMIN = String(args.admin || 'Admin')
  const ADMIN_PASS = String(args.adminPass || '123456')
  log('后端地址:', BASE)

  const adminToken = await login(BASE, ADMIN, ADMIN_PASS)
  const store = await pickStore(BASE, adminToken)
  const tree = await loadDeptTree(BASE, adminToken)
  const idx = buildIndex(tree)
  const salesEmp = await ensureEmployee(BASE, adminToken, store, idx)
  const reg = await registerUser(BASE, salesEmp.name, salesEmp.phone)
  const salesToken = await login(BASE, reg.username, reg.password)
  const info = await getUserInfo(BASE, salesToken)
  const employeeId = info?.employeeId
  log('销售用户:', { username: reg.username, employeeId })

  // 构造完整必填集（含画像与渠道）
  const phone1 = randPhone('139')
  const payload1 = {
    visitDate: today(),
    enterTime: '08:00',
    leaveTime: '09:00',
    receptionDuration: 60,
    visitorCount: 2,
    receptionStatus: 'sales',
    storeId: store.id,
    customerName: '必填校验-样例1',
    customerPhone: phone1,
    salesConsultant: salesEmp.name,
    businessSource: '自然到店',
    channelCategory: '线下',
    channelLevel1: '展厅到店',
    channelLevel2: '',
    convertOrRetentionModel: '保客车型A',
    referrer: '老客张三',
    contactTimes: 3,
    focusModelName: '未来S',
    testDrive: 'true',
    bargaining: '0',
    dealDone: 'false',
    opportunityLevel: 'O',
    userGender: '男',
    userAge: 28,
    buyExperience: '首购',
    userPhoneModel: 'iPhone 15',
    livingArea: ['四川省', '成都市', '武侯区']
  }

  await saveClue(BASE, salesToken, payload1)
  const rec1 = await pollByPhone(BASE, salesToken, phone1)
  assert(rec1 && rec1.id, '保存后未找到记录')
  log('新增后的记录快照:', rec1)

  // 字段断言（保存不丢失）
  const eq = (a, b) => String(a ?? '') === String(b ?? '')
  assert(
    eq(rec1.visitDate, payload1.visitDate),
    `visitDate 未保存: ${rec1.visitDate} != ${payload1.visitDate}`
  )
  assert(
    eq(rec1.enterTime, payload1.enterTime),
    `enterTime 未保存: ${rec1.enterTime} != ${payload1.enterTime}`
  )
  assert(
    eq(rec1.leaveTime, payload1.leaveTime),
    `leaveTime 未保存: ${rec1.leaveTime} != ${payload1.leaveTime}`
  )
  assert(
    Number(rec1.receptionDuration) === Number(payload1.receptionDuration),
    'receptionDuration 未保存'
  )
  assert(Number(rec1.visitorCount) === Number(payload1.visitorCount), 'visitorCount 未保存')
  assert(eq(rec1.receptionStatus, payload1.receptionStatus), 'receptionStatus 未保存')
  assert(eq(rec1.salesConsultant, payload1.salesConsultant), 'salesConsultant 未保存')
  assert(eq(rec1.businessSource, payload1.businessSource), 'businessSource 未保存')
  assert(eq(rec1.channelCategory, payload1.channelCategory), 'channelCategory 未保存')
  assert(eq(rec1.channelLevel1, payload1.channelLevel1), 'channelLevel1 未保存')
  assert(eq(rec1.channelLevel2, payload1.channelLevel2), 'channelLevel2 未保存')
  assert(
    eq(rec1.convertOrRetentionModel, payload1.convertOrRetentionModel),
    'convertOrRetentionModel 未保存'
  )
  assert(eq(rec1.referrer, payload1.referrer), 'referrer 未保存')
  assert(Number(rec1.contactTimes) === Number(payload1.contactTimes), 'contactTimes 未保存')
  assert(eq(rec1.opportunityLevel, payload1.opportunityLevel), 'opportunityLevel 未保存')
  assert(eq(rec1.userGender, payload1.userGender), 'userGender 未保存')
  assert(Number(rec1.userAge) === Number(payload1.userAge), 'userAge 未保存')
  assert(eq(rec1.buyExperience, payload1.buyExperience), 'buyExperience 未保存')
  assert(eq(rec1.userPhoneModel, payload1.userPhoneModel), 'userPhoneModel 未保存')
  assert(eq(rec1.livingArea, '四川省/成都市/武侯区'), 'livingArea 未按数组拼接保存')
  assert(Number(rec1.storeId) === Number(store.id), 'storeId 未保存')
  assert(Number(rec1.createdBy) === Number(employeeId), 'createdBy 未保存为当前员工ID')

  // 编辑分支：非首购画像（currentBrand/currentModel/carAge/mileage）
  await saveClue(BASE, salesToken, {
    id: rec1.id,
    buyExperience: '换购',
    currentBrand: '奥迪',
    currentModel: 'A4L',
    carAge: 3,
    mileage: 5
  })
  const rec1b = await pollByPhone(BASE, salesToken, phone1)
  log('编辑后的记录快照:', rec1b)
  assert(eq(rec1b.buyExperience, '换购'), '编辑 buyExperience 未更新')
  assert(eq(rec1b.currentBrand, '奥迪'), 'currentBrand 未保存')
  assert(eq(rec1b.currentModel, 'A4L'), 'currentModel 未保存')
  assert(Number(rec1b.carAge) === 3, 'carAge 未保存')
  assert(Number(rec1b.mileage) === 5, 'mileage 未保存')

  // 探测：后端是否强校验“离店不早于进店”和“销售顾问随 receptionStatus 必填”
  const phone2 = randPhone('138')
  const badTime = {
    visitDate: today(),
    enterTime: '10:00',
    leaveTime: '09:00',
    receptionDuration: 30,
    visitorCount: 1,
    receptionStatus: 'sales',
    storeId: store.id,
    customerName: '必填校验-样例2',
    customerPhone: phone2,
    businessSource: '自然到店',
    channelCategory: '线下',
    channelLevel1: '展厅到店',
    testDrive: false,
    bargaining: false,
    dealDone: false,
    userGender: '男',
    userAge: 30,
    buyExperience: '首购'
  }
  await saveClue(BASE, salesToken, badTime)
  const rec2 = await pollByPhone(BASE, salesToken, phone2)
  const warnings = []
  if (rec2 && rec2.id) warnings.push('后端未强制校验离店时间不早于进店时间（建议前端拦截）')
  if (!rec2.salesConsultant)
    warnings.push('后端未强制要求销售顾问在 receptionStatus=sales 时必填（建议前端拦截）')

  log('校验通过：所有填写字段均正确落库；以下为提示：')
  warnings.forEach((w) => log('WARN:', w))
  console.log(JSON.stringify({ ok: true, phone: phone1, id: rec1.id, warnings }, null, 2))
}

main().catch((err) => {
  console.error('执行失败:', err?.message || err)
  process.exitCode = 1
})
