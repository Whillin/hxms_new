// Update an existing product via backend API and verify by listing (pagination aware)
// 1) GET /api/product/list -> pick latest product from data.records
// 2) POST /api/product/save -> update fields
// 3) GET /api/product/list -> verify change

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

async function main() {
  console.log(`[list] fetching products from ${BASE}/api/product/list`)
  const list = await request('/api/product/list?current=1&size=10')
  const page = list?.data || {}
  const products = Array.isArray(page.records) ? page.records : []
  if (!Array.isArray(products)) {
    console.log('[list] unexpected response shape:', list)
    return
  }
  if (products.length === 0) {
    console.log('[list] empty, creating a new product first')
    const bodyCreate = {
      name: `AI编辑创建_${nowTag()}`,
      brand: 'AI品牌',
      series: 'NEV',
      engineType: 'NEV',
      status: 1,
      price: Math.round(Math.random() * 100000) / 100
    }
    const createRes = await request('/api/product/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyCreate)
    })
    console.log('[save-create] response:', JSON.stringify(createRes))
    if (createRes.code !== 0) return
    products.push(createRes.data)
  }

  // Pick the latest by id
  const target = products.slice().sort((a, b) => (b.id || 0) - (a.id || 0))[0]
  if (!target || !target.id) {
    console.log('[pick] cannot find target product with id:', target)
    return
  }
  console.log(`[pick] id=${target.id} name=${target.name}`)

  // Prepare update body
  const updatedPrice = Math.round((Number(target.price || 0) + 123.45) * 100) / 100
  const bodyUpdate = {
    id: target.id,
    name: `${String(target.name || '未命名')}_AI编辑_${nowTag()}`,
    price: updatedPrice,
    status: 1,
    engineType: (target.engineType || target.series || 'NEV').toUpperCase()
  }

  console.log('[save-update] body:', JSON.stringify(bodyUpdate))
  const saveRes = await request('/api/product/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(bodyUpdate)
  })
  console.log('[save-update] response:', JSON.stringify(saveRes))

  console.log('[list-after] fetching products for verification')
  const listAfter = await request('/api/product/list?current=1&size=10')
  const pageAfter = listAfter?.data || {}
  const productsAfter = Array.isArray(pageAfter.records) ? pageAfter.records : []
  const changed = productsAfter.find((p) => p.id === target.id)
  console.log('[verify] before:', JSON.stringify(target))
  console.log('[verify] after :', JSON.stringify(changed))

  if (
    changed &&
    Number(changed.price) === Number(bodyUpdate.price) &&
    String(changed.name).includes('_AI编辑_')
  ) {
    console.log('[result] update verified ✅')
  } else {
    console.log('[result] update NOT verified ❌')
  }
}

main().catch((err) => {
  console.error('[error]', err)
})
