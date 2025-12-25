#!/usr/bin/env node
// 写接口轻量并发压测：clue/save、employee/save、customer/save
// 用法示例：
// node scripts/loadtest-write.mjs --base=http://106.52.174.194/api --user=Admin --pass=123456 --endpoints=clue,employee,customer --concurrency=5 --requests=50

const args = (() => {
  const out = {}
  for (const a of process.argv.slice(2)) {
    const m = a.match(/^--([^=]+)=(.*)$/)
    if (m) out[m[1]] = m[2]
  }
  return out
})()

const BASE = (args.base || 'http://localhost:3002/api').replace(/\/$/, '')
const USER = args.user || 'Admin'
const PASS = args.pass || '123456'
const ENDPOINTS = (args.endpoints || 'clue,employee,customer')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)
const CONCURRENCY = Number(args.concurrency || 5)
const REQUESTS = Number(args.requests || 50)
const SIMULATE_IPS = String(args.simulateIps || 'false') === 'true'

function makeUrl(path) {
  return `${BASE}${path.startsWith('/') ? '' : '/'}${path}`
}
function now() {
  return Date.now()
}

async function fetchJson(url, { method = 'GET', headers = {}, body, token, xff } = {}) {
  const h = { 'Content-Type': 'application/json', ...headers }
  if (token) h['Authorization'] = `Bearer ${token}`
  if (xff) h['X-Forwarded-For'] = xff
  const t0 = now()
  const res = await fetch(url, {
    method,
    headers: h,
    body: body ? JSON.stringify(body) : undefined
  })
  let json = undefined
  try {
    json = await res.json()
  } catch {
    // 忽略 JSON 解析错误
  }
  const ms = now() - t0
  const code = json?.code ?? (res.ok ? 0 : res.status)
  const msg = json?.msg ?? json?.message ?? ''
  return { status: res.status, code, msg, json, ms }
}

function extractToken(loginJson) {
  return (
    loginJson?.data?.token ||
    loginJson?.data?.accessToken ||
    loginJson?.data?.jwt ||
    loginJson?.token ||
    ''
  )
}

async function login() {
  const r = await fetchJson(makeUrl('/auth/login'), {
    method: 'POST',
    body: { username: USER, password: PASS }
  })
  const token = extractToken(r.json)
  if (!token) throw new Error('login failed')
  return token
}

function percentile(arr, p) {
  if (!arr.length) return 0
  const sorted = arr.slice().sort((a, b) => a - b)
  const idx = Math.floor((p / 100) * (sorted.length - 1))
  return sorted[idx]
}

async function runQueue(tasks, limit) {
  const results = []
  let i = 0
  const runners = Array.from({ length: Math.min(limit, tasks.length) }).map(async () => {
    while (i < tasks.length) {
      const cur = i++
      try {
        results[cur] = await tasks[cur]()
      } catch (e) {
        results[cur] = { error: String(e) }
      }
    }
  })
  await Promise.all(runners)
  return results
}

function makeClueSave(i) {
  const storeId = Number(args.store || 11)
  const date = new Date().toISOString().slice(0, 10)
  const body = {
    customerName: `邀约测试${i}`,
    customerPhone: `139${String(10000000 + i).slice(-8)}`,
    storeId,
    visitDate: date,
    salesConsultant: `邀约专员-${storeId}-${(i % 3) + 1}`,
    businessSource: '线上',
    channelCategory: '线上',
    channelLevel1: '新媒体开发',
    channelLevel2: '新媒体（公司抖音）',
    visitCategory: '首次',
    receptionStatus: 'sales',
    visitorCount: 1,
    opportunityLevel: 'A',
    isAddWeChat: i % 2 === 0,
    testDrive: i % 3 === 0,
    dealDone: i % 4 === 0
  }
  return body
}
function makeEmployeeSave(i) {
  const body = {
    name: `并发员工${i}`,
    phone: `137${String(10000000 + i).slice(-8)}`,
    gender: 'male',
    status: '1',
    role: 'R_APPOINTMENT',
    storeId: 1,
    hireDate: '2023-01-01'
  }
  return body
}
function makeCustomerSave(i) {
  const body = {
    name: `并发客户${i}`,
    phone: `139${String(10000000 + i).slice(-8)}`,
    source: '测试',
    level: 'A'
  }
  return body
}

async function main() {
  const token = await login()
  const summary = {}

  for (const ep of ENDPOINTS) {
    const tasks = []
    const latencies = []
    let ok = 0,
      fail = 0,
      limited = 0
    const isClue = ep === 'clue'
    const isEmp = ep === 'employee'
    const isCus = ep === 'customer'

    for (let i = 0; i < REQUESTS; i++) {
      tasks.push(async () => {
        let url = ''
        let body = {}
        // 模拟不同客户端 IP，以避免被全局限流拦截（测试环境）
        const xff = SIMULATE_IPS
          ? `10.${isClue ? 1 : isEmp ? 2 : 3}.${(i / 254) | 0}.${(i % 254) + 1}`
          : undefined
        if (isClue) {
          url = makeUrl('/clue/save')
          body = makeClueSave(i)
        } else if (isEmp) {
          url = makeUrl('/employee/save')
          body = makeEmployeeSave(i)
        } else if (isCus) {
          url = makeUrl('/customer/save')
          body = makeCustomerSave(i)
        }
        const r = await fetchJson(url, { method: 'POST', token, body, xff })
        latencies.push(r.ms)
        if (r.status === 429) {
          limited++
        } else if (r.code === 200 || r.status === 201) {
          ok++
        } else {
          fail++
        }
        return r
      })
    }

    const results = await runQueue(tasks, CONCURRENCY)
    summary[ep] = {
      requests: REQUESTS,
      concurrency: CONCURRENCY,
      ok,
      fail,
      limited,
      p50: percentile(latencies, 50),
      p90: percentile(latencies, 90),
      p95: percentile(latencies, 95),
      max: Math.max(...latencies),
      min: Math.min(...latencies)
    }
  }

  console.log(JSON.stringify({ base: BASE, summary }, null, 2))
}

main().catch((e) => {
  console.error(e)
  process.exit(2)
})
