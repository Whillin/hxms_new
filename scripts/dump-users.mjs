#!/usr/bin/env node
// Dump users list and filter by name
// Usage: node scripts/dump-users.mjs --base http://localhost:3002/api --user Admin --pass 123456 [--filter 卢小岚]

function parseArgs() {
  const args = process.argv.slice(2)
  const out = {}
  for (let i = 0; i < args.length; i++) {
    const a = args[i]
    if (a.startsWith('--')) {
      const [k, v] = a.split('=')
      const key = k.replace(/^--/, '')
      if (v !== undefined) out[key] = v
      else if (args[i + 1] && !args[i + 1].startsWith('--')) out[key] = args[++i]
      else out[key] = true
    }
  }
  return out
}

const OPTS = parseArgs()
const BASE = OPTS.base || 'http://localhost:3002/api'
const USER = OPTS.user || 'Admin'
const PASS = OPTS.pass || '123456'
const FILTER = OPTS.filter || ''

async function login(userName, password) {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userName, password })
  })
  const json = await res.json()
  return json?.data?.token || ''
}

async function listUsers(token) {
  const url = new URL(`${BASE}/user/list`)
  url.searchParams.set('current', '1')
  url.searchParams.set('size', '200')
  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` }
  })
  const json = await res.json()
  return json
}

(async () => {
  try {
    console.log(`[Dump] Base: ${BASE}`)
    const token = await login(USER, PASS)
    if (!token) {
      console.error('[Dump] Admin login failed')
      process.exit(2)
    }
    const list = await listUsers(token)
    const page = list?.data || {}
    const users = Array.isArray(page.records) ? page.records : []
    console.log(`[Dump] total=${page.total || 0} count=${users.length}`)
    const names = users.map((u) => ({ id: u.id, userName: u.userName, roles: u.roles }))
    console.log('[Dump] users:', JSON.stringify(names, null, 2))
    if (FILTER) {
      const found = names.find((u) => String(u.userName) === FILTER)
      console.log(`[Dump] filter="${FILTER}" exists=${!!found}`)
      if (found) console.log('[Dump] match:', JSON.stringify(found, null, 2))
    }
  } catch (e) {
    console.error('[Dump] failed:', e)
    process.exit(1)
  }
})()