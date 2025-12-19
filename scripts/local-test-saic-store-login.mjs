#!/usr/bin/env node
/**
 * Login and verify user info for SAIC Shanghai store account
 */

const API = 'http://localhost:3001'
import http from 'node:http'
import https from 'node:https'
import { URL } from 'node:url'

function httpRequest(method, url, body, headers = {}) {
  return new Promise((resolve, reject) => {
    try {
      const u = new URL(url)
      const lib = u.protocol === 'https:' ? https : http
      const req = lib.request(
        {
          hostname: u.hostname,
          port: u.port || (u.protocol === 'https:' ? 443 : 80),
          path: u.pathname + (u.search || ''),
          method,
          headers
        },
        (res) => {
          let text = ''
          res.setEncoding('utf8')
          res.on('data', (chunk) => {
            text += chunk
          })
          res.on('end', () => {
            let data
            try {
              data = JSON.parse(text)
            } catch (e) {
              return reject(new Error(`HTTP ${res.statusCode} ${res.statusMessage}: ${text}`))
            }
            if (
              !res.statusCode ||
              res.statusCode < 200 ||
              res.statusCode >= 300 ||
              data?.code !== 200
            ) {
              return reject(new Error(`API error ${res.statusCode}: ${JSON.stringify(data)}`))
            }
            resolve(data.data)
          })
        }
      )
      req.on('error', reject)
      if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
        req.write(JSON.stringify(body || {}))
      }
      req.end()
    } catch (e) {
      reject(e)
    }
  })
}

async function postJson(url, body) {
  const headers = { 'Content-Type': 'application/json' }
  try {
    const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) })
    const text = await res.text()
    let data
    try {
      data = JSON.parse(text)
    } catch (e) {
      throw new Error(`HTTP ${res.status} ${res.statusText}: ${text}`)
    }
    if (!res.ok || data?.code !== 200)
      throw new Error(`API error ${res.status}: ${JSON.stringify(data)}`)
    return data.data
  } catch (err) {
    console.warn('[postJson] fetch failed, fallback http:', err?.message || err)
    return httpRequest('POST', url, body, headers)
  }
}

async function getJson(url, token) {
  const headers = token ? { Authorization: `Bearer ${token}` } : undefined
  try {
    const res = await fetch(url, { method: 'GET', headers })
    const text = await res.text()
    let data
    try {
      data = JSON.parse(text)
    } catch (e) {
      throw new Error(`HTTP ${res.status} ${res.statusText}: ${text}`)
    }
    if (!res.ok || data?.code !== 200)
      throw new Error(`API error ${res.status}: ${JSON.stringify(data)}`)
    return data.data
  } catch (err) {
    console.warn('[getJson] fetch failed, fallback http:', err?.message || err)
    return httpRequest('GET', url, undefined, headers)
  }
}

async function main() {
  console.log('[login] using saic_shanghai_store ...')
  const login = await postJson(`${API}/api/auth/login`, {
    userName: 'saic_shanghai_store',
    password: 'SaicShanghai123!'
  })
  const token = login.token
  console.log('[login] token acquired')

  const info = await getJson(`${API}/api/user/info`, token)
  console.log(
    '[user.info]',
    JSON.stringify(
      {
        userId: info.userId,
        employeeId: info.employeeId,
        storeId: info.storeId,
        brandId: info.brandId,
        brandName: info.brandName,
        roles: info.roles
      },
      null,
      2
    )
  )

  const stores = await getJson(`${API}/api/customer/store-options`, token)
  console.log('[store-options]', JSON.stringify(stores, null, 2))
}

main().catch((e) => {
  console.error('[login] failed:', e?.message || e)
  process.exit(1)
})
