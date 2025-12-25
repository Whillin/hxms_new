// Seed inviter employees and online clues into backend for visible stores
const base = process.env.API_BASE || 'http://localhost:3002'

async function jsonFetch(url, options = {}) {
  const res = await fetch(url, options)
  let body
  try {
    body = await res.json()
  } catch {
    body = null
  }
  return { status: res.status, body }
}

async function loginAdmin() {
  const payload = { userName: 'Admin', password: '123456' }
  const { body } = await jsonFetch(`${base}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  if (!body || body.code !== 200 || !body.data?.token) {
    throw new Error(`login failed: ${JSON.stringify(body)}`)
  }
  return body.data.token
}

function extractStoreIds(tree) {
  const ids = []
  const dfs = (nodes) => {
    if (!Array.isArray(nodes)) return
    for (const n of nodes) {
      if (String(n?.type) === 'store' && typeof n?.id === 'number') {
        ids.push(Number(n.id))
      }
      if (Array.isArray(n?.children)) dfs(n.children)
    }
  }
  dfs(tree)
  return Array.from(new Set(ids))
}

async function getStoreIds() {
  const { body } = await jsonFetch(`${base}/api/department/list`)
  const tree = body?.data || []
  const ids = extractStoreIds(tree)
  if (ids.length) return ids
  // fallback
  return [11, 12, 20, 21]
}

async function saveEmployee(inviterName, phone, storeId) {
  const payload = {
    name: inviterName,
    phone,
    gender: 'other',
    status: 1,
    role: 'R_APPOINTMENT',
    storeId,
    hireDate: '2025-01-01'
  }
  const { body } = await jsonFetch(`${base}/api/employee/save`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  return body?.code === 200
}

async function saveClue(token, payload) {
  const { body } = await jsonFetch(`${base}/api/clue/save`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  })
  return body?.code === 200
}

async function main() {
  const token = await loginAdmin()
  const storeIds = await getStoreIds()
  const date = '2025-12-25'
  let createdEmployees = 0
  let createdClues = 0

  for (const sid of storeIds) {
    for (let i = 1; i <= 2; i++) {
      const name = `邀约专员-${sid}-${i}`
      const phone = `138${String(sid).padStart(4, '0')}${String(i).padStart(6, '0')}`.slice(0, 11)
      const ok = await saveEmployee(name, phone, sid)
      if (ok) createdEmployees++
      for (let k = 0; k < 5; k++) {
        const cluePayload = {
          storeId: sid,
          inviter: name,
          businessSource: '线上',
          channelCategory: '线上',
          channelLevel1: '新媒体开发',
          channelLevel2: '新媒体（公司抖音）',
          customerName: `客户-${name}-${k}`,
          customerPhone:
            `139${String(sid).padStart(4, '0')}${String(i).padStart(3, '0')}${String(k).padStart(4, '0')}`.slice(
              0,
              11
            ),
          visitCategory: '首次',
          visitDate: date,
          enterTime: date,
          leaveTime: date,
          receptionStatus: 'sales',
          userAge: 28,
          userGender: '未知',
          buyExperience: '首购',
          visitPurpose: '看车',
          contactTimes: 1,
          opportunityLevel: 'A'
        }
        const ok2 = await saveClue(token, cluePayload)
        if (ok2) createdClues++
      }
    }
  }
  console.log(
    JSON.stringify({
      ok: true,
      stores: storeIds,
      createdEmployees,
      createdClues
    })
  )
}

main().catch((e) => {
  console.error(JSON.stringify({ ok: false, error: String(e?.message || e) }))
  process.exit(1)
})
