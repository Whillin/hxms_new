// Verify TTLs via front-end proxy on port 3008
const base = 'http://localhost:3008'

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
    body: JSON.stringify({ userName: 'Admin', password: '123456' })
  })
  const loginData = await loginResp.json()
  console.log('login.status=', loginResp.status)
  const { token, refreshToken } = loginData?.data || {}
  if (!token || !refreshToken) {
    console.error('login.data=', loginData)
    process.exit(1)
  }
  console.log('access_ttl_seconds=', ttlSeconds(token))
  console.log('refresh_ttl_seconds=', ttlSeconds(refreshToken))

  const refreshResp = await fetch(`${base}/api/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken })
  })
  const refreshData = await refreshResp.json()
  console.log('refresh.status=', refreshResp.status)
  const { token: token2, refreshToken: newRefreshToken } = refreshData?.data || {}
  if (!token2 || !newRefreshToken) {
    console.error('refresh.data=', refreshData)
    process.exit(1)
  }
  console.log('access_ttl_seconds_after_refresh=', ttlSeconds(token2))
  console.log('refresh_ttl_seconds_after_refresh=', ttlSeconds(newRefreshToken))
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
