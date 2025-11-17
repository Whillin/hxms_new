#!/usr/bin/env node
/**
 * Register a login account for SAIC Audi Shanghai store
 * Binds to employee: 邀约专员甲 (phone: 13900001001)
 */

const API = 'http://localhost:3002'

async function postJson(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  const text = await res.text()
  let data
  try { data = JSON.parse(text) } catch (e) { throw new Error(`HTTP ${res.status} ${res.statusText}: ${text}`) }
  if (!res.ok || data?.code !== 200) {
    throw new Error(`API error ${res.status}: ${JSON.stringify(data)}`)
  }
  return data.data
}

async function main() {
  const payload = {
    userName: 'saic_shanghai_store',
    password: 'SaicShanghai123!',
    name: '邀约专员甲',
    phone: '13900001001'
  }
  console.log('[register] creating user saic_shanghai_store ...')
  const result = await postJson(`${API}/api/auth/register`, payload)
  console.log('[register] success:', result ? 'token issued' : 'ok')
}

main().catch((e) => {
  console.error('[register] failed:', e?.message || e)
  process.exit(1)
})