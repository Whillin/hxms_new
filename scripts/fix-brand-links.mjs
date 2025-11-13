#!/usr/bin/env node
// 目的：确保现有产品（如 p711、p7+、A4L）绑定到正确的品牌子分类，从而让 /api/product/list 的 brandName 过滤生效。
// 用法示例：
//   node scripts/fix-brand-links.mjs --base http://localhost:3002/api

function parseArgs() {
  const out = {}
  for (let i = 2; i < process.argv.length; i++) {
    const a = process.argv[i]
    if (a.startsWith('--')) {
      const [k, v] = a.slice(2).split('=')
      if (v !== undefined) out[k] = v
      else if (process.argv[i + 1] && !process.argv[i + 1].startsWith('--')) out[k] = process.argv[++i]
      else out[k] = 'true'
    }
  }
  return out
}

const OPTS = parseArgs()
const BASE = String(OPTS.base || 'http://localhost:3002/api').replace(/\/$/, '')

async function fetchJson(url, init = {}) {
  const res = await fetch(url, init)
  const text = await res.text()
  try {
    const json = JSON.parse(text)
    return { status: res.status, json }
  } catch {
    return { status: res.status, text }
  }
}

async function ensureSeededCategories() {
  // 访问 /api/category/tree 以触发 SEED_ENABLED=true 时的种子逻辑
  await fetchJson(`${BASE}/category/tree`)
  const { json } = await fetchJson(`${BASE}/category/all`)
  const rows = json?.data || []
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error('分类列表为空，请检查后端 SEED_ENABLED 配置或数据库权限')
  }
  // 构建便捷索引
  const byName = new Map(rows.map((r) => [String(r.name), r]))
  const brandAudi = byName.get('奥迪')
  const brandXpeng = byName.get('小鹏')
  if (!brandAudi || !brandXpeng) {
    throw new Error('未找到品牌根分类（奥迪/小鹏）')
  }
  let audiChildren = rows.filter((r) => r.parentId === brandAudi.id)
  let xpengChildren = rows.filter((r) => r.parentId === brandXpeng.id)
  // 若缺少子分类，则自动创建
  const createChild = async (parentId, name) => {
    const { json: saveJson } = await fetchJson(`${BASE}/category/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, parentId, sortOrder: 1, status: 'active' })
    })
    if ((saveJson?.code ?? 200) >= 400) throw new Error(`创建子分类失败: ${name}`)
    return saveJson?.data
  }
  if (!audiChildren.length) {
    await createChild(brandAudi.id, 'CKD(ICE)')
    await createChild(brandAudi.id, 'NEV')
    await createChild(brandAudi.id, 'FBU')
    const { json: fresh } = await fetchJson(`${BASE}/category/all`)
    const all = fresh?.data || []
    audiChildren = all.filter((r) => r.parentId === brandAudi.id)
    xpengChildren = all.filter((r) => r.parentId === brandXpeng.id)
  }
  if (!xpengChildren.length) {
    await createChild(brandXpeng.id, 'NEV')
    const { json: fresh2 } = await fetchJson(`${BASE}/category/all`)
    const all2 = fresh2?.data || []
    audiChildren = all2.filter((r) => r.parentId === brandAudi.id)
    xpengChildren = all2.filter((r) => r.parentId === brandXpeng.id)
  }
  const audiICE = audiChildren.find((r) => String(r.name).includes('CKD')) || audiChildren[0]
  const xpengNEV = xpengChildren.find((r) => String(r.name).includes('NEV')) || xpengChildren[0]
  if (!audiICE || !xpengNEV) {
    throw new Error('未找到目标子分类（奥迪 CKD(ICE) 或 小鹏 NEV）')
  }
  return { rows, brandAudi, brandXpeng, audiICE, xpengNEV }
}

async function listProducts() {
  const { json } = await fetchJson(`${BASE}/product/list?current=1&size=100`)
  const page = json?.data || {}
  const records = Array.isArray(page.records) ? page.records : []
  return records
}

async function getProductCategories(id) {
  const { json } = await fetchJson(`${BASE}/product/${id}/categories`)
  return Array.isArray(json?.data) ? json.data : []
}

async function updateProductCategories(id, name, catIds) {
  const { json, status } = await fetchJson(`${BASE}/product/save`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, name, categories: catIds })
  })
  if (!(status >= 200 && status < 300) || (json?.code ?? 200) >= 400) {
    throw new Error(`更新产品分类失败: id=${id} status=${status} code=${json?.code} msg=${json?.msg}`)
  }
  return json
}

async function verifyBrandList(brandName) {
  const { json } = await fetchJson(`${BASE}/product/list?current=1&size=50&brandName=${encodeURIComponent(brandName)}`)
  const page = json?.data || {}
  const records = Array.isArray(page.records) ? page.records : []
  return records.map((r) => ({ id: r.id, name: r.name }))
}

async function main() {
  console.log('[fix] BASE =', BASE)
  const { audiICE, xpengNEV } = await ensureSeededCategories()
  console.log('[fix] categories ready:', { audiICE: audiICE?.id, xpengNEV: xpengNEV?.id })

  const products = await listProducts()
  const byName = new Map(products.map((p) => [String(p.name), p]))

  const targets = [
    { name: 'A4L', catId: audiICE?.id },
    { name: 'p711', catId: xpengNEV?.id },
    { name: 'p7+', catId: xpengNEV?.id }
  ]

  for (const t of targets) {
    const p = byName.get(t.name)
    if (!p) {
      console.log(`[skip] 未找到产品: ${t.name}`)
      continue
    }
    const existCatIds = await getProductCategories(p.id)
    const desired = [t.catId].filter((x) => typeof x === 'number')
    const equal = desired.length === existCatIds.length && desired.every((id) => existCatIds.includes(id))
    if (equal) {
      console.log(`[ok] 已绑定，无需更新: ${p.name} -> ${existCatIds.join(',')}`)
    } else {
      console.log(`[update] ${p.name} 绑定分类为: ${desired.join(',')}`)
      await updateProductCategories(p.id, p.name, desired)
    }
  }

  const xpList = await verifyBrandList('小鹏')
  const auList = await verifyBrandList('奥迪')
  console.log('[verify] 小鹏:', xpList)
  console.log('[verify] 奥迪:', auList)
}

main().catch((err) => {
  console.error('[error]', err)
  process.exit(1)
})