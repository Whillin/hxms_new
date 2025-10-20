import path from 'path'
import dotenv from 'dotenv'
import { AuthService } from './src/auth/auth.service'

dotenv.config({ path: path.resolve(process.cwd(), '.env') })

function decodePayload(jwt: string): any {
  const part = jwt.split('.')[1]
  const norm = part.replace(/-/g, '+').replace(/_/g, '/')
  const padLen = norm.length % 4
  const padded = padLen === 2 ? norm + '==' : padLen === 3 ? norm + '=' : norm
  const json = Buffer.from(padded, 'base64').toString('utf8')
  return JSON.parse(json)
}

async function main() {
  const svc = new AuthService()
  const token = svc.signToken({ userId: 'demo' })
  const refresh = svc.signRefreshToken({ userId: 'demo' })
  const p1 = decodePayload(token)
  const p2 = decodePayload(refresh)
  const ttl1 = p1.exp - p1.iat
  const ttl2 = p2.exp - p2.iat
  console.log(`access_ttl_seconds=${ttl1}`)
  console.log(`refresh_ttl_seconds=${ttl2}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
