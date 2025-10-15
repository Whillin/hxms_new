import { Injectable } from '@nestjs/common'
import fs from 'fs'
import path from 'path'
import bcrypt from 'bcryptjs'

export interface UserRecord {
  id: number
  userName: string
  passwordHash: string
  roles: string[]
  enabled: boolean
  createdAt: string
}

@Injectable()
export class UserService {
  private readonly dataFile = path.resolve(process.cwd(), 'data', 'users.json')
  private cache: UserRecord[] | null = null

  private ensureDataFile() {
    const dir = path.dirname(this.dataFile)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    if (!fs.existsSync(this.dataFile)) {
      const adminPasswordHash = bcrypt.hashSync('123456', 10)
      const initial: UserRecord[] = [
        {
          id: 1,
          userName: 'Admin',
          passwordHash: adminPasswordHash,
          roles: ['R_ADMIN', 'R_SUPER'],
          enabled: true,
          createdAt: new Date().toISOString()
        }
      ]
      fs.writeFileSync(this.dataFile, JSON.stringify(initial, null, 2), 'utf-8')
    }
  }

  private load(): UserRecord[] {
    if (this.cache) return this.cache
    this.ensureDataFile()
    const raw = fs.readFileSync(this.dataFile, 'utf-8')
    this.cache = JSON.parse(raw) as UserRecord[]
    return this.cache
  }

  private save(users: UserRecord[]): void {
    this.cache = users
    fs.writeFileSync(this.dataFile, JSON.stringify(users, null, 2), 'utf-8')
  }

  findByUserName(userName: string): UserRecord | null {
    const users = this.load()
    return users.find((u) => u.userName.toLowerCase() === userName.toLowerCase()) || null
  }

  verifyPassword(user: UserRecord, password: string): boolean {
    return bcrypt.compareSync(password, user.passwordHash)
  }

  createUser(userName: string, password: string): UserRecord {
    const users = this.load()
    const exists = this.findByUserName(userName)
    if (exists) {
      throw new Error('用户名已存在')
    }
    const nextId = users.length > 0 ? Math.max(...users.map((u) => u.id)) + 1 : 1
    const passwordHash = bcrypt.hashSync(password, 10)
    const record: UserRecord = {
      id: nextId,
      userName,
      passwordHash,
      roles: ['R_USER'],
      enabled: true,
      createdAt: new Date().toISOString()
    }
    users.push(record)
    this.save(users)
    return record
  }
}
