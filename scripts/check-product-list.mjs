// Fetch /api/product/list and print summary for a specific id
const BASE = process.env.API_BASE || 'http://localhost:3001'

async function request(path) {
  const res = await fetch(`${BASE}${path}`)
  const text = await res.text()
  try {
    return JSON.parse(text)
  } catch {
    return { raw: text }
  }
}

function summary(p) {
  if (!p) return null
  const { id, name, engineType, price, status, sales, updatedAt } = p
  return { id, name, engineType, price, status, sales, updatedAt }
}

async function main() {
  const id = process.argv[2] ? Number(process.argv[2]) : undefined
  const listRes = await request('/api/product/list?current=1&size=50')
  const page = listRes?.data || {}
  const products = Array.isArray(page.records) ? page.records : []
  let target
  if (id) target = products.find((p) => p.id === id)
  else target = products.slice().sort((a, b) => (b.id || 0) - (a.id || 0))[0]
  console.log('[list-summary]', summary(target))
}

main().catch((err) => console.error('[error]', err))
