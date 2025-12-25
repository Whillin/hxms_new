#!/usr/bin/env node
/**
 * Local setup script:
 * - Ensure brand "上汽奥迪" exists (id=5) under group id=1
 * - Create sales department under brand ("上汽销售部门") if missing
 * - Create region ("上海区域") and store ("上汽奥迪上海店") if missing
 * - Create two inviter specialists (role R_APPOINTMENT) under the store
 *
 * Requires backend dev server running at http://localhost:3002
 */

const API = 'http://localhost:3002'

async function getJson(url, init) {
  const res = await fetch(url, init)
  const text = await res.text()
  let data
  try {
    data = JSON.parse(text)
  } catch (e) {
    throw new Error(`HTTP ${res.status} ${res.statusText}: ${text}`)
  }
  if (!res.ok || data?.code !== 200) {
    throw new Error(`API error ${res.status}: ${JSON.stringify(data)}`)
  }
  return data.data
}

async function postJson(url, body) {
  return getJson(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
}

function findNodeByName(tree, name) {
  const stack = Array.isArray(tree) ? [...tree] : []
  while (stack.length) {
    const node = stack.pop()
    if (node?.name === name) return node
    const children = Array.isArray(node?.children) ? node.children : []
    for (const c of children) stack.push(c)
  }
  return null
}

function findChildByType(parent, type, name) {
  const children = Array.isArray(parent?.children) ? parent.children : []
  for (const c of children) {
    if (c.type === type && (!name || c.name === name)) return c
  }
  return null
}

async function ensureDepartment(body) {
  try {
    await postJson(`${API}/api/department/save`, body)
    return true
  } catch (e) {
    throw e
  }
}

async function ensureEmployee(body) {
  try {
    await postJson(`${API}/api/employee/save`, body)
    return true
  } catch (e) {
    throw e
  }
}

async function main() {
  console.log('[setup] fetching department tree...')
  const tree = await getJson(`${API}/api/department/tree`)
  const group = findNodeByName(tree, '华星名仕集团') || tree[0]
  if (!group || group.type !== 'group') throw new Error('Missing group root "华星名仕集团"')

  const brand = findChildByType(group, 'brand', '上汽奥迪')
  if (!brand) throw new Error('Missing brand "上汽奥迪" under group')
  const brandId = brand.id

  // department under brand
  let dept = findChildByType(brand, 'department', '上汽销售部门')
  if (!dept) {
    console.log('[setup] creating sales department under 上汽奥迪...')
    await ensureDepartment({
      name: '上汽销售部门',
      type: 'department',
      parentId: brandId,
      enabled: true
    })
    const tree2 = await getJson(`${API}/api/department/tree`)
    const brand2 = findNodeByName(tree2, '上汽奥迪')
    dept = findChildByType(brand2, 'department', '上汽销售部门')
    if (!dept) throw new Error('Failed to create 上汽销售部门')
  }
  const deptId = dept.id

  // region under department
  let region = findChildByType(dept, 'region', '上海区域')
  if (!region) {
    console.log('[setup] creating region 上海区域...')
    await ensureDepartment({ name: '上海区域', type: 'region', parentId: deptId, enabled: true })
    const tree3 = await getJson(`${API}/api/department/tree`)
    const dept3 = findNodeByName(tree3, '上汽销售部门')
    region = findChildByType(dept3, 'region', '上海区域')
    if (!region) throw new Error('Failed to create 上海区域')
  }
  const regionId = region.id

  // store under region
  let store = findChildByType(region, 'store', '上汽奥迪上海店')
  if (!store) {
    console.log('[setup] creating store 上汽奥迪上海店...')
    await ensureDepartment({
      name: '上汽奥迪上海店',
      type: 'store',
      parentId: regionId,
      enabled: true
    })
    const tree4 = await getJson(`${API}/api/department/tree`)
    const region4 = findNodeByName(tree4, '上海区域')
    store = findChildByType(region4, 'store', '上汽奥迪上海店')
    if (!store) throw new Error('Failed to create 上汽奥迪上海店')
  }
  const storeId = store.id

  console.log(`[setup] brand=${brandId} dept=${deptId} region=${regionId} store=${storeId}`)

  // inviter specialists
  const today = new Date().toISOString().slice(0, 10)
  const inviters = [
    { name: '邀约专员甲', phone: '13900001001', gender: 'male', status: '1' },
    { name: '邀约专员乙', phone: '13900001002', gender: 'female', status: '1' }
  ]
  for (const inv of inviters) {
    console.log(`[setup] creating inviter ${inv.name} ...`)
    await ensureEmployee({
      name: inv.name,
      phone: inv.phone,
      gender: inv.gender,
      status: inv.status,
      role: 'R_APPOINTMENT',
      brandId,
      regionId,
      storeId,
      hireDate: today
    })
  }

  console.log('[setup] done. You can now test inviter field behavior in leads form.')
}

main().catch((e) => {
  console.error('[setup] failed:', e?.message || e)
  process.exit(1)
})
