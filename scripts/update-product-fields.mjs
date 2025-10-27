// Update multiple editable fields and verify via list
// Fields: name, engineType, price, status, sales

const BASE = 'http://localhost:3001'

async function request(path, options = {}) {
  const url = `${BASE}${path}`
  const res = await fetch(url, options)
  const text = await res.text()
  try {
    return JSON.parse(text)
  } catch {
    return { raw: text }
  }
}

function nowTag() {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

function pickLatestById(list) {
  return list.slice().sort((a, b) => (b.id || 0) - (a.id || 0))[0]
}

function summary(p) {
  if (!p) return 'undefined'
  const { id, name, engineType, price, status, sales, updatedAt } = p
  return { id, name, engineType, price, status, sales, updatedAt }
}

async function main() {
  console.log(`[list] GET ${BASE}/api/product/list`)
  const listRes = await request('/api/product/list?current=1&size=20')
  const page = listRes?.data || {}
  const products = Array.isArray(page.records) ? page.records : []

  if (!Array.isArray(products)) {
    console.log('[list] unexpected response shape:', listRes)
    return
  }

  let target = pickLatestById(products)
  if (!target) {
    console.log('[list] empty, creating one')
    const createBody = {
      name: `AI创建_${nowTag()}`,
      brand: 'AI品牌',
      series: 'NEV',
      engineType: 'NEV',
      status: 1,
      price: Math.round(Math.random() * 100000) / 100,
      sales: Math.floor(Math.random() * 1000)
    }
    const createRes = await request('/api/product/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(createBody)
    })
    if (createRes?.code !== 0) {
      console.log('[save-create] failed:', JSON.stringify(createRes))
      return
    }
    // refresh list
    const listRes2 = await request('/api/product/list?current=1&size=20')
    const page2 = listRes2?.data || {}
    const products2 = Array.isArray(page2.records) ? page2.records : []
    target = pickLatestById(products2)
  }

  console.log('[pick] before:', JSON.stringify(summary(target)))

  // Determine new values
  const newEngineType =
    (target.engineType || target.series || 'NEV').toUpperCase() === 'NEV' ? 'HEV' : 'NEV'
  const newPrice =
    Math.round(((Number(target.price) || 0) + Math.random() * 500 + 99.99) * 100) / 100
  const newStatus = Number(target.status) === 1 ? 0 : 1
  const newSales = (Number(target.sales) || 0) + Math.floor(10 + Math.random() * 90)

  const updateBody = {
    id: target.id,
    name: `${String(target.name || '未命名')}_AI批量编辑_${nowTag()}`,
    engineType: newEngineType,
    price: newPrice,
    status: newStatus,
    sales: newSales
  }

  console.log('[save-update] body:', JSON.stringify(updateBody))
  const saveRes = await request('/api/product/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updateBody)
  })
  console.log('[save-update] response:', JSON.stringify(saveRes))

  console.log('[list-after] verify list')
  const listAfter = await request('/api/product/list?current=1&size=20')
  const pageAfter = listAfter?.data || {}
  const productsAfter = Array.isArray(pageAfter.records) ? pageAfter.records : []
  const changed = productsAfter.find((p) => p.id === target.id)

  console.log('[verify] after:', JSON.stringify(summary(changed)))

  const ok =
    changed &&
    String(changed.name).includes('_AI批量编辑_') &&
    String(changed.engineType) === String(updateBody.engineType) &&
    Number(changed.price) === Number(updateBody.price) &&
    Number(changed.status) === Number(updateBody.status) &&
    Number(changed.sales) === Number(updateBody.sales)

  console.log(ok ? '[result] verified ✅' : '[result] NOT verified ❌')
}

main().catch((err) => console.error('[error]', err))
