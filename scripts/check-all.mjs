#!/usr/bin/env node
// 全接口自检脚本：登录后依次调用各个公开/鉴权接口，并尽量避免破坏性操作
// 用法：node scripts/check-all.mjs --base http://host/api --user Admin --pass 123456 [--verbose]

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
const BASE = OPTS.base || process.env.HXMS_BASE || 'http://106.52.174.194/api'
const ADMIN_USER = OPTS.user || process.env.HXMS_USER || 'Admin'
const ADMIN_PASS = OPTS.pass || process.env.HXMS_PASS || '123456'
const VERBOSE = !!OPTS.verbose

function log(...args) {
  console.log(...args)
}
function vLog(...args) {
  if (VERBOSE) console.log(...args)
}

async function fetchJson(url, { method = 'GET', headers = {}, body } = {}) {
  const res = await fetch(url, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...headers
    },
    body: body ? JSON.stringify(body) : undefined
  })
  let json
  try {
    json = await res.json()
  } catch {
    json = { code: res.status, msg: 'non-json', data: null }
  }
  return { status: res.status, json }
}

async function login(userName, password) {
  const { status, json } = await fetchJson(`${BASE}/auth/login`, {
    method: 'POST',
    body: { userName, password }
  })
  return { status, json }
}

async function refresh(refreshToken) {
  const { status, json } = await fetchJson(`${BASE}/auth/refresh`, {
    method: 'POST',
    body: { refreshToken }
  })
  return { status, json }
}

function bearer(token) {
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function main() {
  log(`[CHECK] Base=${BASE}`)
  log('[STEP] Public endpoints')
  const pubResults = {}
  pubResults['health/live'] = await fetchJson(`${BASE}/health/live`)
  pubResults['health/ready'] = await fetchJson(`${BASE}/health/ready`)
  pubResults['metrics'] = await fetchJson(`${BASE}/metrics`)
  pubResults['auth/debug-di'] = await fetchJson(`${BASE}/auth/debug-di`)

  log('[STEP] Admin login')
  const loginRes = await login(ADMIN_USER, ADMIN_PASS)
  vLog('[Login Raw]', loginRes)
  const token = loginRes?.json?.data?.token
  const refreshToken = loginRes?.json?.data?.refreshToken
  if (!token) {
    console.error('[FATAL] Admin login failed:', loginRes)
    printSummary(pubResults, {}, {})
    process.exit(2)
  }

  log('[STEP] Auth refresh')
  const refreshRes = refreshToken ? await refresh(refreshToken) : { status: 0, json: {} }

  log('[STEP] Safe authenticated GETs')
  const authedGetResults = {}
  authedGetResults['user/info'] = await fetchJson(`${BASE}/user/info`, {
    headers: bearer(token)
  })
  authedGetResults['user/debug'] = await fetchJson(`${BASE}/user/debug`, {
    headers: bearer(token)
  })
  authedGetResults['user/list'] = await fetchJson(new URL(`${BASE}/user/list?current=1&size=10`).toString(), {
    headers: bearer(token)
  })
  authedGetResults['customer/list'] = await fetchJson(new URL(`${BASE}/customer/list?current=1&size=10`).toString(), {
    headers: bearer(token)
  })
  authedGetResults['customer/store-options'] = await fetchJson(`${BASE}/customer/store-options`, {
    headers: bearer(token)
  })
  authedGetResults['employee/list'] = await fetchJson(new URL(`${BASE}/employee/list?current=1&size=5`).toString(), {
    headers: bearer(token)
  })
  authedGetResults['clue/list'] = await fetchJson(new URL(`${BASE}/clue/list?current=1&size=5`).toString(), {
    headers: bearer(token)
  })
  authedGetResults['role/list'] = await fetchJson(new URL(`${BASE}/role/list?current=1&size=5`).toString())
  authedGetResults['channel/options'] = await fetchJson(`${BASE}/channel/options`)
  authedGetResults['category/all'] = await fetchJson(`${BASE}/category/all`)
  authedGetResults['category/tree'] = await fetchJson(`${BASE}/category/tree`)
  authedGetResults['department/list'] = await fetchJson(`${BASE}/department/list`)
  authedGetResults['department/tree'] = await fetchJson(`${BASE}/department/tree`)

  log('[STEP] Non-destructive POSTs (echo/update against existing)')
  const postResults = {}
  // customer/save echo: if there is a record, update with same values
  const page = authedGetResults['customer/list']?.json?.data
  const first = Array.isArray(page?.records) && page.records.length ? page.records[0] : null
  if (first) {
    const payload = {
      id: Number(first.id),
      userName: String(first.userName || ''),
      userPhone: String(first.userPhone || ''),
      userGender: String(first.userGender || '未知'),
      userAge: Number(first.userAge || 0),
      buyExperience: String(first.buyExperience || '首购'),
      userPhoneModel: first.userPhoneModel || '',
      currentBrand: first.currentBrand || '',
      currentModel: first.currentModel || '',
      carAge: Number(first.carAge || 0),
      mileage: Number(first.mileage || 0),
      livingArea: Array.isArray(first.livingArea)
        ? first.livingArea.join('/')
        : String(first.livingArea || '')
    }
    postResults['customer/save'] = await fetchJson(`${BASE}/customer/save`, {
      method: 'POST',
      headers: bearer(token),
      body: payload
    })
  } else {
    postResults['customer/save'] = { status: 200, json: { code: 200, msg: 'skipped: no sample' } }
  }

  // user/reset-password: create a temp user via register then reset
  const suffix = Date.now().toString().slice(-6)
  const tmpUser = `autotest_${suffix}`
  const registerRes = await fetchJson(`${BASE}/auth/register`, {
    method: 'POST',
    body: { userName: tmpUser, password: '123456', name: 'Autotest', phone: `139${suffix}` }
  })
  postResults['auth/register'] = registerRes
  const resetRes = await fetchJson(`${BASE}/user/reset-password`, {
    method: 'POST',
    headers: bearer(token),
    body: { userName: tmpUser, newPassword: '1234567' }
  })
  postResults['user/reset-password'] = resetRes

  // role permissions save on a temporary role, then cleanup delete
  const tmpRoleCode = `R_AUTOTEST_${suffix}`
  const roleSaveRes = await fetchJson(`${BASE}/role/save`, {
    method: 'POST',
    body: { roleName: 'AutoTest', roleCode: tmpRoleCode, description: 'temporary role', enabled: true }
  })
  postResults['role/save'] = roleSaveRes
  // fetch role list to get id
  const roleListRes = await fetchJson(new URL(`${BASE}/role/list?roleCode=${encodeURIComponent(tmpRoleCode)}`).toString())
  const createdRole = (roleListRes?.json?.data?.records || []).find((r) => r.roleCode === tmpRoleCode)
  const roleId = createdRole?.roleId || createdRole?.id
  if (roleId) {
    const permSaveRes = await fetchJson(`${BASE}/role/permissions/save`, {
      method: 'POST',
      body: { roleId, keys: ['User_view', 'User_edit'] }
    })
    postResults['role/permissions/save'] = permSaveRes
    const permGetRes = await fetchJson(new URL(`${BASE}/role/permissions?roleId=${roleId}`).toString())
    postResults['role/permissions'] = permGetRes
    const roleDelRes = await fetchJson(`${BASE}/role/delete`, { method: 'POST', body: { roleId } })
    postResults['role/delete'] = roleDelRes
  } else {
    postResults['role/permissions/save'] = { status: 200, json: { code: 200, msg: 'skipped: roleId missing' } }
    postResults['role/permissions'] = { status: 200, json: { code: 200, msg: 'skipped: roleId missing' } }
    postResults['role/delete'] = { status: 200, json: { code: 200, msg: 'skipped: roleId missing' } }
  }

  // category/product: create product, associate with a category, query, then cleanup
  const categoriesAll = authedGetResults['category/all']?.json?.data || []
  const someCat = categoriesAll.find((c) => c.level === 1) || categoriesAll[0]
  const prodName = `AutoModel_${suffix}`
  const prodCreate = await fetchJson(`${BASE}/product/save`, {
    method: 'POST',
    body: { name: prodName, brand: 'AutoBrand', series: 'AutoSeries', price: 123456, status: 1, sales: 0, engineType: 'ICE' }
  })
  postResults['product/save(create)'] = prodCreate
  // get product id via list
  const prodList = await fetchJson(new URL(`${BASE}/product/list?name=${encodeURIComponent(prodName)}&current=1&size=5`).toString())
  const prod = (prodList?.json?.data?.records || []).find((m) => m.name === prodName)
  const prodId = prod?.id
  if (prodId) {
    if (someCat) {
      const assocRes = await fetchJson(`${BASE}/product/save`, {
        method: 'POST',
        body: { id: prodId, name: prodName, categories: [someCat.id] }
      })
      postResults['product/save(update categories)'] = assocRes
      const prodCats = await fetchJson(`${BASE}/product/${prodId}/categories`)
      postResults['product/:id/categories'] = prodCats
    }
    const delRes = await fetchJson(`${BASE}/product/${prodId}`, { method: 'DELETE' })
    postResults['product/delete'] = delRes
  } else {
    postResults['product/save(update categories)'] = { status: 200, json: { code: 200, msg: 'skipped: productId missing' } }
    postResults['product/:id/categories'] = { status: 200, json: { code: 200, msg: 'skipped: productId missing' } }
    postResults['product/delete'] = { status: 200, json: { code: 200, msg: 'skipped: productId missing' } }
  }

  // category: create brand and child, query products, then cleanup
  const newBrand = await fetchJson(`${BASE}/category/save`, {
    method: 'POST',
    body: { name: `AutoBrand_${suffix}`, sortOrder: 99, status: 'active' }
  })
  postResults['category/save(brand)'] = newBrand
  const brandId = newBrand?.json?.data?.id
  if (brandId) {
    const child = await fetchJson(`${BASE}/category/save`, {
      method: 'POST',
      body: { name: `AutoChild_${suffix}`, parentId: brandId, sortOrder: 1, status: 'active' }
    })
    postResults['category/save(child)'] = child
    const childId = child?.json?.data?.id
    if (childId) {
      const productsRes = await fetchJson(`${BASE}/category/${childId}/products`)
      postResults['category/:id/products'] = productsRes
      const delChild = await fetchJson(`${BASE}/category/${childId}`, { method: 'DELETE' })
      postResults['category/delete(child)'] = delChild
    }
    const delBrand = await fetchJson(`${BASE}/category/${brandId}`, { method: 'DELETE' })
    postResults['category/delete(brand)'] = delBrand
  }

  // clue: create then delete (using phone filter to locate id)
  const stores = authedGetResults['customer/store-options']?.json?.data || []
  const anyStore = stores[0]
  const cluePhone = `138${suffix}`
  const clueSave = await fetchJson(`${BASE}/clue/save`, {
    method: 'POST',
    headers: bearer(token),
    body: {
      visitDate: '2025-01-01',
      customerName: '自检客户',
      customerPhone: cluePhone,
      storeId: anyStore?.id || 1,
      opportunityLevel: 'A'
    }
  })
  postResults['clue/save'] = clueSave
  // locate clue by phone
  const clueListByPhone = await fetchJson(new URL(`${BASE}/clue/list?current=1&size=5&customerPhone=${encodeURIComponent(cluePhone)}`).toString(), {
    headers: bearer(token)
  })
  const clueItem = (clueListByPhone?.json?.data?.records || []).find((r) => String(r.customerPhone) === cluePhone)
  if (clueItem?.id) {
    const clueDel = await fetchJson(`${BASE}/clue/delete`, {
      method: 'POST',
      headers: bearer(token),
      body: { id: clueItem.id }
    })
    postResults['clue/delete'] = clueDel
  } else {
    postResults['clue/delete'] = { status: 200, json: { code: 200, msg: 'skipped: clue id missing' } }
  }

  // employee: create then delete (find by phone)
  const empPhone = `137${String(suffix).padStart(8, '0')}`
  const empSave = await fetchJson(`${BASE}/employee/save`, {
    method: 'POST',
    body: {
      name: '自检员工',
      phone: empPhone,
      gender: 'male',
      status: '1',
      role: 'R_SALES',
      storeId: anyStore?.id || 1,
      hireDate: '2025-01-01'
    }
  })
  postResults['employee/save'] = empSave
  const empList = await fetchJson(new URL(`${BASE}/employee/list?current=1&size=5&phone=${encodeURIComponent(empPhone)}`).toString(), {
    headers: bearer(token)
  })
  const empItem = (empList?.json?.data?.records || []).find((e) => String(e.phone) === empPhone)
  if (empItem?.id) {
    const empDel = await fetchJson(`${BASE}/employee/delete`, {
      method: 'POST',
      body: { id: empItem.id }
    })
    postResults['employee/delete'] = empDel
  } else {
    postResults['employee/delete'] = { status: 200, json: { code: 200, msg: 'skipped: employee id missing' } }
  }

  // dangerous admin endpoints skipped by default (require explicit confirmation):
  // department/rebuild-codes, department/normalize-types

  printSummary(pubResults, authedGetResults, postResults, refreshRes)
}

function printSummary(pub, getAuthed, posts, refreshRes) {
  const wrap = (name, res) => ({ name, status: res?.status ?? 0, code: res?.json?.code, msg: res?.json?.msg })
  const summary = {
    public: Object.entries(pub).map(([k, v]) => wrap(k, v)),
    authedGet: Object.entries(getAuthed).map(([k, v]) => wrap(k, v)),
    posts: Object.entries(posts).map(([k, v]) => wrap(k, v)),
    refresh: wrap('auth/refresh', refreshRes)
  }
  log(JSON.stringify(summary, null, 2))
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})