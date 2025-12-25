#!/usr/bin/env node
// 初始化部门层级脚本：集团 -> 品牌 -> 销售部 -> 大区 -> 门店
// 用法示例：
//   node scripts/check-department.mjs --base http://localhost:3002/api --user Admin --pass 123456 
// 可选参数：--group, --brand, --region, --store 自定义名称

// Node 18+ 原生支持 fetch，无需引入 node-fetch

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
  console.log('[dept]', ...args)
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

function flattenTree(nodes) {
  const out = []
  const walk = (list, parentId = null) => {
    for (const n of list || []) {
      out.push({ ...n, parentId })
      if (Array.isArray(n.children) && n.children.length) {
        walk(n.children, n.id)
      }
    }
  }
  walk(nodes)
  return out
}

async function findDepartment(base, token, { type, name }) {
  const { status, json } = await fetchJson(`${base}/department/list?type=${encodeURIComponent(type)}&name=${encodeURIComponent(name)}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` }
  })
  assert(status === 200, `查询部门失败: ${status}`)
  const flat = flattenTree(json?.data || [])
  return flat.find((n) => n.type === type && n.name === name)
}

async function ensureDepartment(base, token, { type, name, parentId }) {
  let existed = await findDepartment(base, token, { type, name })
  if (existed?.id) return existed

  const { status, json } = await fetchJson(`${base}/department/save`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ name, type, parentId, enabled: true })
  })
  assert(status >= 200 && status < 300, `保存部门失败: ${status} ${JSON.stringify(json)}`)
  // 重新查询以拿到 id
  existed = await findDepartment(base, token, { type, name })
  assert(existed?.id, `保存后未找到部门: ${type} ${name}`)
  return existed
}

async function main() {
  const args = parseArgs()
  const BASE = String(args.base || 'http://localhost:3010/api')
  const USER = String(args.user || 'Admin')
  const PASS = String(args.pass || '123456')

  const GROUP_NAME = String(args.group || '集团A')
  const BRAND_NAME = String(args.brand || '品牌A')
  const SALES_NAME = '销售部'
  const REGION_NAME = String(args.region || '大区A')
  const STORE_NAME = String(args.store || '门店A')

  log('使用后端:', BASE)
  const token = await login(BASE, USER, PASS)
  log('登录成功, token 获取完成')

  // 集团
  const group = await ensureDepartment(BASE, token, { type: 'group', name: GROUP_NAME, parentId: null })
  log('集团就绪:', group)

  // 品牌
  const brand = await ensureDepartment(BASE, token, { type: 'brand', name: BRAND_NAME, parentId: group.id })
  log('品牌就绪:', brand)

  // 销售部（品牌下）
  const sales = await ensureDepartment(BASE, token, { type: 'department', name: SALES_NAME, parentId: brand.id })
  log('销售部就绪:', sales)

  // 大区（品牌下）
  const region = await ensureDepartment(BASE, token, { type: 'region', name: REGION_NAME, parentId: brand.id })
  log('大区就绪:', region)

  // 门店（大区下）
  const store = await ensureDepartment(BASE, token, { type: 'store', name: STORE_NAME, parentId: region.id })
  log('门店就绪:', store)

  // 输出树验证（品牌下）
  const brandTreeRes = await fetchJson(`${BASE}/department/tree?brandId=${brand.id}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` }
  })
  assert(brandTreeRes.status === 200, '品牌树获取失败')
  const flat = flattenTree(brandTreeRes.json?.data || [])
  const summary = flat.map((n) => `${n.type}:${n.name}`).join(' / ')
  log('品牌树:', summary)

  console.log(JSON.stringify({
    ok: true,
    groupId: group.id,
    brandId: brand.id,
    salesDepartmentId: sales.id,
    regionId: region.id,
    storeId: store.id
  }, null, 2))
}

main().catch((err) => {
  console.error('执行失败:', err?.message || err)
  process.exitCode = 1
})