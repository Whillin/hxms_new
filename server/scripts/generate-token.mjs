// Generate JWT tokens for existing users without logging in
// Usage: node server/scripts/generate-token.mjs <userId> <userName> <rolesComma>
// Example: node server/scripts/generate-token.mjs 18 陈纪杭 R_USER,R_SALES

import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
import jwt from 'jsonwebtoken'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load env from server/.env
dotenv.config({ path: path.resolve(path.dirname(__dirname), '.env') })

const [, , idArg, nameArg, rolesArg] = process.argv
if (!idArg || !nameArg || !rolesArg) {
  console.error('Usage: node server/scripts/generate-token.mjs <userId> <userName> <rolesComma>')
  process.exit(1)
}

const sub = Number(idArg)
if (!sub || Number.isNaN(sub)) {
  console.error('Invalid userId:', idArg)
  process.exit(1)
}

const userName = String(nameArg)
const roles = String(rolesArg)
  .split(',')
  .map((r) => r.trim())
  .filter(Boolean)
const secret = process.env.JWT_SECRET || 'hxms_dev_secret'
const accessTtl = process.env.JWT_EXPIRES_IN || '2h'
const refreshTtl = process.env.JWT_REFRESH_EXPIRES_IN || '7d'

const payload = { sub, userName, roles }
const token = jwt.sign(payload, secret, { expiresIn: accessTtl })
const refreshToken = jwt.sign(payload, secret, { expiresIn: refreshTtl })

function decodePayload(jwtStr) {
  const part = jwtStr.split('.')[1]
  const norm = part.replace(/-/g, '+').replace(/_/g, '/')
  const padLen = norm.length % 4
  const padded = padLen === 2 ? norm + '==' : padLen === 3 ? norm + '=' : norm
  const json = Buffer.from(padded, 'base64').toString('utf8')
  return JSON.parse(json)
}

const p1 = decodePayload(token)
const p2 = decodePayload(refreshToken)

const result = {
  payload,
  token,
  refreshToken,
  access_exp: p1.exp,
  refresh_exp: p2.exp
}

console.log(JSON.stringify(result, null, 2))
