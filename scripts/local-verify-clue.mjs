/**
 * 本地验证脚本：线索新增与编辑
 * - 验证未填必填字段时后端（mock）拒绝提交
 * - 验证提交后可在列表中查询到
 * - 验证二次编辑不会新增记录，总数保持不变
 */

const host = 'http://localhost:3011'

async function getJSON(url) {
  const res = await fetch(url)
  const txt = await res.text()
  try {
    return JSON.parse(txt)
  } catch {
    throw new Error(`Invalid JSON from ${url}: ${txt.slice(0, 200)}`)
  }
}

async function postJSON(url, data) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  const txt = await res.text()
  try {
    return JSON.parse(txt)
  } catch {
    throw new Error(`Invalid JSON from ${url}: ${txt.slice(0, 200)}`)
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg)
}

async function main() {
  console.log('# Step A: 空列表查询')
  const listA = await getJSON(`${host}/api/clue/list?current=1&size=10`)
  console.log('listA =', listA)
  assert(listA.code === 200, '列表接口不可用')

  console.log('\n# Step B: 必填校验（缺少手机号）')
  const badSave = await postJSON(`${host}/api/clue/save`, {
    id: 900001,
    customerName: '王五',
    // customerPhone 缺失
    storeId: 11,
    visitDate: '2025-11-14',
    receptionStatus: 'sales'
  })
  console.log('badSave =', badSave)
  assert(badSave.code === 400, '未填必填字段却通过了保存')

  console.log('\n# Step C: 新增线索（完整必填）')
  const okSave = await postJSON(`${host}/api/clue/save`, {
    id: 900001,
    customerName: '王五',
    customerPhone: '13900001111',
    storeId: 11,
    visitDate: '2025-11-14',
    receptionStatus: 'sales',
    salesConsultant: '张三',
    enterTime: '2025-11-14 10:00:00',
    leaveTime: '2025-11-14 12:00:00'
  })
  console.log('okSave =', okSave)
  assert(okSave.code === 200 && okSave.data === true, '新增线索保存失败')

  console.log('\n# Step D: 列表查询（按手机号过滤）')
  const listD = await getJSON(`${host}/api/clue/list?current=1&size=10&customerPhone=13900001111`)
  console.log('listD =', listD)
  assert(
    listD.code === 200 && listD.data && listD.data.total === 1,
    `新增后列表数量异常：${JSON.stringify(listD)}`
  )

  console.log('\n# Step E: 编辑线索（更改销售顾问）')
  const editSave = await postJSON(`${host}/api/clue/save`, {
    id: 900001,
    customerName: '王五',
    customerPhone: '13900001111',
    storeId: 11,
    visitDate: '2025-11-14',
    receptionStatus: 'sales',
    salesConsultant: '李四'
  })
  console.log('editSave =', editSave)
  assert(editSave.code === 200 && editSave.data === true, '编辑线索保存失败')

  console.log('\n# Step F: 再次查询（总数不变，销售顾问已更新）')
  const listF = await getJSON(`${host}/api/clue/list?current=1&size=10&customerPhone=13900001111`)
  console.log('listF =', listF)
  assert(listF.code === 200 && listF.data.total === 1, '编辑导致新增记录，数量不正确')
  const rec = listF.data.records.find((r) => String(r.customerPhone) === '13900001111')
  assert(rec && rec.salesConsultant === '李四', '编辑后的销售顾问未生效')

  console.log('\n✅ 所有校验通过：必填拦截正常，新增显示正常，编辑不新增且更新字段成功')
}

main().catch((err) => {
  console.error('❌ 校验失败：', err)
  process.exitCode = 1
})
