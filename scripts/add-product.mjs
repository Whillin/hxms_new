// Add a product via backend API and verify by listing
const base = 'http://localhost:3001'

async function main() {
  const name = `AI自动添加_${Date.now()}`
  const payload = { name, brand: 'AI品牌', series: 'NEV', categories: [] }

  const saveRes = await fetch(base + '/api/product/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  const saveJson = await saveRes.json()
  console.log('[save]', JSON.stringify(saveJson))

  const listRes = await fetch(
    base + '/api/product/list?current=1&size=5&name=' + encodeURIComponent(name)
  )
  const listJson = await listRes.json()
  console.log('[list]', JSON.stringify(listJson))

  const rec = listJson?.data?.records?.find?.((r) => r?.name === name)
  console.log('[result]', JSON.stringify({ ok: !!rec, id: rec?.id, name: rec?.name }))
}

main().catch((err) => {
  console.error('[error]', err)
  process.exit(1)
})
