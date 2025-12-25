#!/usr/bin/env node
// 端到端测试：按用户要求覆盖三种商机场景并断言
// 用法：node scripts/test-opportunity-e2e.mjs --base http://localhost:3001/api --user Admin --pass 123456

// 解析命令行参数
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
const BASE = (OPTS.base || 'http://localhost:3001/api').replace(/\/$/, '')
const USER = OPTS.user || 'Admin'
const PASS = OPTS.pass || '123456'
const VERBOSE = !!OPTS.verbose

function vLog(...a) {
  if (VERBOSE) console.log(...a)
}
function log(...a) {
  console.log('[e2e]', ...a)
}
function assert(cond, msg) {
  if (!cond) throw new Error(msg)
}

// fetch 封装（Node 18+ 原生支持）
async function fetchJson(
  url,
  { method = 'GET', headers = {}, body, token, expectJson = true } = {}
) {
  const h = { 'Content-Type': 'application/json', ...headers }
  if (token) h['Authorization'] = `Bearer ${token}`
  const t0 = Date.now()
  const res = await fetch(url, {
    method,
    headers: h,
    body: body ? JSON.stringify(body) : undefined
  })
  const ms = Date.now() - t0
  let json = undefined
  try {
    json = expectJson ? await res.json() : undefined
  } catch (_) {}
  const code = json?.code ?? (res.ok ? 0 : res.status)
  const msg = json?.msg ?? json?.message ?? ''
  return { status: res.status, code, msg, json, ms }
}

// 登录，返回 token
async function login() {
  const { status, json } = await fetchJson(`${BASE}/auth/login`, {
    method: 'POST',
    body: { userName: USER, password: PASS }
  })
  assert(status >= 200 && status < 300, `登录失败: ${status} ${JSON.stringify(json)}`)
  const token = json?.data?.token || json?.token
  assert(!!token, '登录未返回 token')
  return token
}

// 获取门店选项（取第一个）
async function pickStore(token) {
  const r = await fetchJson(`${BASE}/customer/store-options`, { method: 'GET', token })
  assert(r.status === 200 && Array.isArray(r.json?.data), `获取门店选项失败: ${r.status}`)
  const stores = r.json.data
  assert(stores.length > 0, '门店选项为空，请先初始化门店')
  const store = stores[0]
  return { id: store.id, name: store.name || store.label || `store#${store.id}` }
}

// 查找或创建当前门店在职顾问，返回顾问名称
async function findOrCreateConsultant(token, storeId) {
  // 先查找在职顾问
  const q = new URLSearchParams({
    current: '1',
    size: '50',
    storeId: String(storeId),
    status: '1',
    role: 'R_SALES'
  })
  const r = await fetchJson(`${BASE}/employee/list?${q.toString()}`, { method: 'GET', token })
  assert(r.status === 200, `员工列表查询失败: ${r.status}`)
  const list = r.json?.data?.records || []
  if (list.length > 0) return list[0]?.name || list[0]?.userName || list[0]?.nickname || '顾问A'

  // 无在职顾问则创建一个
  const name = `E2E顾问-${Date.now()}`
  const phone = `139${String(Date.now()).slice(-8)}`
  const body = {
    name,
    phone,
    role: 'R_SALES',
    status: '1',
    storeId,
    gender: '男',
    hireDate: new Date().toISOString().slice(0, 10)
  }
  const s = await fetchJson(`${BASE}/employee/save`, { method: 'POST', token, body })
  assert(
    s.status >= 200 && s.status < 300 && s.code === 200,
    `创建顾问失败: ${s.status} ${JSON.stringify(s.json)}`
  )
  return name
}

function today(offsetDays = 0) {
  const d = new Date()
  if (offsetDays) d.setDate(d.getDate() + offsetDays)
  return d.toISOString().slice(0, 10)
}

function randPhone() {
  return `138${String(10000000 + Math.floor(Math.random() * 90000000)).slice(-8)}`
}

async function pollOpportunities(token, { storeId, phone }, { tries = 30, intervalMs = 500 } = {}) {
  for (let i = 0; i < tries; i++) {
    const params = new URLSearchParams({
      current: '1',
      size: '10',
      customerPhone: phone,
      storeId: String(storeId)
    })
    const r = await fetchJson(`${BASE}/opportunity/list?${params.toString()}`, {
      method: 'GET',
      token
    })
    if (r.status === 200) {
      const records = r.json?.data?.records || []
      if (records.length > 0) return records
    }
    await new Promise((res) => setTimeout(res, intervalMs))
  }
  return []
}

async function fetchCustomers(token, { storeId, phone }) {
  const params = new URLSearchParams({
    current: '1',
    size: '10',
    userPhone: phone,
    storeId: String(storeId)
  })
  const r = await fetchJson(`${BASE}/customer/list?${params.toString()}`, { method: 'GET', token })
  return r.json?.data?.records || []
}

async function saveClue(token, body) {
  const r = await fetchJson(`${BASE}/clue/save`, { method: 'POST', token, body })
  assert(r.status >= 200 && r.status < 300, `提交线索失败: ${r.status} ${JSON.stringify(r.json)}`)
  return r
}

async function main() {
  log('后端地址:', BASE)
  const token = await login()
  log('登录成功')

  const store = await pickStore(token)
  log('选用门店:', store)

  const consultantName = await findOrCreateConsultant(token, store.id)
  log('使用顾问:', consultantName)

  const phone = randPhone()
  const name1 = `测试客户A-${String(Date.now()).slice(-6)}`
  const name2 = `测试客户B-${String(Date.now()).slice(-6)}`
  const name3 = `测试客户C-${String(Date.now()).slice(-6)}`

  // 场景一：新客户首次来店 -> 新建商机，状态跟进中
  const clue1 = {
    customerName: name1,
    customerPhone: phone,
    storeId: store.id,
    visitDate: today(),
    salesConsultant: consultantName,
    businessSource: '自然到店',
    channelCategory: '线下',
    opportunityLevel: 'B'
  }
  await saveClue(token, clue1)
  log('场景一：线索已提交，轮询商机列表...')
  const oppList1 = await pollOpportunities(token, { storeId: store.id, phone })
  assert(oppList1.length > 0, '场景一：未找到任何商机')
  const latest1 = oppList1[0]
  assert(latest1.status === '跟进中', `场景一：商机状态非跟进中: ${latest1.status}`)
  assert(latest1.customerPhone === phone, '场景一：商机手机号不匹配')
  assert(latest1.customerName === name1, `场景一：商机客户名不匹配: ${latest1.customerName}`)
  log('场景一通过：新建商机，状态=跟进中，oppId=', latest1.id)

  // 场景二：同客再次来店，线索客户信息改变 + 成交 -> 更新客户/商机为新姓名，状态=已成交
  const clue2 = {
    customerName: name2,
    customerPhone: phone,
    storeId: store.id,
    visitDate: today(0),
    salesConsultant: consultantName,
    businessSource: '自然到店',
    channelCategory: '线下',
    opportunityLevel: 'A',
    dealDone: true
  }
  await saveClue(token, clue2)
  log('场景二：线索已提交，轮询商机列表...')
  const oppList2 = await pollOpportunities(token, { storeId: store.id, phone })
  assert(oppList2.length > 0, '场景二：未找到任何商机')
  const latest2 = oppList2[0]
  assert(latest2.status === '已成交', `场景二：商机状态非已成交: ${latest2.status}`)
  assert(latest2.customerName === name2, `场景二：商机客户名未更新: ${latest2.customerName}`)
  const cusList2 = await fetchCustomers(token, { storeId: store.id, phone })
  const cus2 = cusList2.find((c) => c.userPhone === phone)
  assert(!!cus2, '场景二：客户列表未找到该手机号')
  assert(cus2.userName === name2, `场景二：客户表姓名未更新: ${cus2.userName}`)
  log('场景二通过：商机更新为已成交，客户姓名同步更新')

  // 场景三：同客再次来店（非成交），应新建新的商机（上一条已成交）
  const clue3 = {
    customerName: name3,
    customerPhone: phone,
    storeId: store.id,
    visitDate: today(0),
    salesConsultant: consultantName,
    businessSource: '自然到店',
    channelCategory: '线下',
    opportunityLevel: 'B',
    dealDone: false
  }
  await saveClue(token, clue3)
  log('场景三：线索已提交，轮询商机列表...')
  const oppList3 = await pollOpportunities(token, { storeId: store.id, phone })
  assert(oppList3.length > 1, '场景三：商机数量未增加（至少应为2条）')
  const latest3 = oppList3[0]
  const second3 = oppList3[1]
  assert(latest3.id !== latest2.id, '场景三：最新商机不是新增记录')
  assert(latest3.status === '跟进中', `场景三：新商机状态非跟进中: ${latest3.status}`)
  assert(latest3.customerName === name3, `场景三：新商机客户名不匹配: ${latest3.customerName}`)
  assert(second3.id === latest2.id, '场景三：上一条商机未位于第二项（按更新时间排序）')
  log('场景三通过：再次来店新建商机，状态=跟进中，oppId=', latest3.id)

  // 汇总输出
  const summary = {
    base: BASE,
    store,
    consultantName,
    phone,
    scenario1: { oppId: latest1.id, status: latest1.status, name: latest1.customerName },
    scenario2: { oppId: latest2.id, status: latest2.status, name: latest2.customerName },
    scenario3: {
      oppId: latest3.id,
      status: latest3.status,
      name: latest3.customerName,
      previousOppId: latest2.id
    }
  }
  console.log(JSON.stringify(summary, null, 2))
}

main().catch((err) => {
  console.error('[e2e] 失败:', err?.message || err)
  process.exit(2)
})
