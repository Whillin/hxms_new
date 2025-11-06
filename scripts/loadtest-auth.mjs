#!/usr/bin/env node
// 简易登录接口压测脚本：并发模拟登录以验证限流与性能
// 用法：node scripts/loadtest-auth.mjs --url http://host/api/auth/login --concurrency 20 --requests 200

import { argv } from 'node:process'

function parseArgs() {
  const args = {}
  for (let i = 2; i < argv.length; i++) {
    const [k, v] = argv[i].startsWith('--') ? argv[i].slice(2).split('=') : [argv[i], '']
    if (k === 'url') args.url = v || argv[++i]
    if (k === 'concurrency') args.concurrency = Number(v || argv[++i])
    if (k === 'requests') args.requests = Number(v || argv[++i])
    if (k === 'user') args.user = v || argv[++i]
    if (k === 'password') args.password = v || argv[++i]
  }
  return {
    url: args.url || 'http://localhost:3001/api/auth/login',
    concurrency: Number(args.concurrency || 20),
    requests: Number(args.requests || 200),
    user: args.user || 'test',
    password: args.password || 'wrong'
  }
}

async function once(url, user, password) {
  const start = performance.now()
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userName: user, password })
    })
    const ms = performance.now() - start
    return { status: res.status, ms }
  } catch (e) {
    const ms = performance.now() - start
    return { status: -1, ms }
  }
}

async function main() {
  const { url, concurrency, requests, user, password } = parseArgs()
  console.log(`[loadtest] url=${url} concurrency=${concurrency} requests=${requests}`)
  let completed = 0
  let ok = 0
  let limited = 0
  let failed = 0
  let totalMs = 0
  let maxMs = 0
  let minMs = Infinity

  const runBatch = async (n) => {
    const tasks = []
    for (let i = 0; i < n; i++) tasks.push(once(url, user, password))
    const results = await Promise.all(tasks)
    for (const r of results) {
      completed++
      totalMs += r.ms
      maxMs = Math.max(maxMs, r.ms)
      minMs = Math.min(minMs, r.ms)
      if (r.status === 200) ok++
      else if (r.status === 429) limited++
      else failed++
    }
  }

  const start = performance.now()
  let remaining = requests
  while (remaining > 0) {
    const batch = Math.min(concurrency, remaining)
    await runBatch(batch)
    remaining -= batch
    if (completed % (concurrency * 2) === 0) {
      console.log(`progress: ${completed}/${requests}`)
    }
  }
  const elapsed = performance.now() - start
  const avgMs = totalMs / completed
  console.log(
    JSON.stringify(
      {
        completed,
        ok,
        limited,
        failed,
        avgMs: Number(avgMs.toFixed(2)),
        minMs: Number(minMs.toFixed(2)),
        maxMs: Number(maxMs.toFixed(2)),
        elapsedMs: Number(elapsed.toFixed(2))
      },
      null,
      2
    )
  )
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})