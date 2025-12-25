#!/usr/bin/env node

const BASE = process.env.BASE || 'http://localhost:3002'
const USERNAME = process.env.USER || '陈纪杭'
const PASSWORD = process.env.PASS || '123456'

async function jsonFetch(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  })
  const data = await res.json().catch(() => ({}))
  return { status: res.status, data }
}

async function main() {
  console.log('=== Login as ===', USERNAME)
  const login = await jsonFetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    body: JSON.stringify({ username: USERNAME, password: PASSWORD })
  })
  if (!login?.data?.data?.token) {
    console.error('Login failed:', login)
    process.exit(1)
  }
  const token = login.data.data.token
  const headers = { Authorization: `Bearer ${token}` }

  const me = await jsonFetch(`${BASE}/api/user/info`, { headers })
  console.log('user info:', me.data)
  const info = me.data?.data || {}

  const storeId = Number(info.storeId)
  const brand = info.brandName || info.brand
  if (!storeId || !brand) {
    console.error('Missing storeId or brand:', { storeId, brand })
  }

  // 1) Verify clue save response code & data
  const now = new Date()
  const visitDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const clueBody = {
    storeId,
    visitDate,
    receptionStatus: 'sales',
    salesConsultant: String(info.name || ''),
    customerName: '测试线索用户',
    customerPhone: `1${Math.floor(Math.random() * 9)}${String(Date.now()).slice(-9)}`,
    focusModelName: '',
    testDrive: false,
    bargaining: false,
    dealDone: false,
    channelLevel1: '店内到店'
  }
  const clueSave = await jsonFetch(`${BASE}/api/clue/save`, {
    method: 'POST',
    headers: { ...headers },
    body: JSON.stringify(clueBody)
  })
  console.log('clue save response:', clueSave.data)

  // 2) Check product list by brand filters
  const prodByBrandName = await jsonFetch(
    `${BASE}/api/product/list?current=1&size=50&status=1&brandName=${encodeURIComponent(brand)}&includeChildren=true`,
    { headers }
  )
  const namesA = (prodByBrandName.data?.records || []).map((r) => r.name)
  console.log('product names by brandName:', namesA)

  const prodByBrand = await jsonFetch(
    `${BASE}/api/product/list?current=1&size=50&status=1&brand=${encodeURIComponent(brand)}`,
    { headers }
  )
  const namesA2 = (prodByBrand.data?.records || []).map((r) => r.name)
  console.log('product names by brand:', namesA2)

  // 3) Try get categoryId by brand and query by categoryId
  const catResp = await jsonFetch(`${BASE}/api/category/list`, { headers })
  const tree = catResp.data?.data || []
  const node = Array.isArray(tree)
    ? tree.find((n) => n?.level === 1 && String(n?.name) === brand)
    : undefined
  let namesB = []
  if (node?.id) {
    const prodByCat = await jsonFetch(
      `${BASE}/api/product/list?current=1&size=50&status=1&categoryId=${node.id}&includeChildren=true`,
      { headers }
    )
    namesB = (prodByCat.data?.records || []).map((r) => r.name)
    console.log('product names by categoryId:', namesB)
  } else {
    console.log('brand node not found in category tree:', brand)
  }

  const hasA4L = namesA.concat(namesA2).concat(namesB).includes('A4L')
  console.log('Contains A4L?', hasA4L)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
