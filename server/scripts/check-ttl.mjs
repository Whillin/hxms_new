// Verify access/refresh TTLs via API login and refresh
const base = 'http://localhost:3001'

function decodePayload(jwt) {
  const part = jwt.split('.')[1]
  const norm = part.replace(/-/g, '+').replace(/_/g, '/')
  const padLen = norm.length % 4
  const padded = padLen === 2 ? norm + '==' : padLen === 3 ? norm + '=' : norm
  const json = Buffer.from(padded, 'base64').toString('utf8')
  return JSON.parse(json)
}

function ttlSeconds(jwt) {
  const p = decodePayload(jwt)
  return p.exp - p.iat
}

async function main() {
  const loginResp = await fetch(`${base}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userName: 'admin', password: '123456' })
  })
  const loginData = await loginResp.json()
  if (loginResp.status !== 200) {
    console.error('Login failed:', loginResp.status, loginData)
    process.exit(1)
  }
  const { token, refreshToken } = loginData.data || {}
  console.log('login.status=', loginResp.status)
  console.log('access_ttl_seconds=', ttlSeconds(token))
  console.log('refresh_ttl_seconds=', ttlSeconds(refreshToken))

  const refreshResp = await fetch(`${base}/api/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken })
  })
  const refreshData = await refreshResp.json()
  if (refreshResp.status !== 200) {
    console.error('Refresh failed:', refreshResp.status, refreshData)
    process.exit(1)
  }
  const { token: token2, newRefreshToken } = refreshData.data || {}
  console.log('refresh.status=', refreshResp.status)
  console.log('access_ttl_seconds_after_refresh=', ttlSeconds(token2))
  console.log('refresh_ttl_seconds_after_refresh=', ttlSeconds(newRefreshToken))
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
