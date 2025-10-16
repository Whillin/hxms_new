import { Injectable, OnModuleInit } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import bcrypt from 'bcryptjs'
import { User } from './user.entity'

@Injectable()
export class UserService implements OnModuleInit {
  constructor(@InjectRepository(User) private readonly repo: Repository<User>) {}

  async onModuleInit(): Promise<void> {
    const exists = await this.repo.findOne({ where: { userName: 'Admin' } })
    if (!exists) {
      const adminPasswordHash = bcrypt.hashSync('123456', 10)
      const record = this.repo.create({
        userName: 'Admin',
        passwordHash: adminPasswordHash,
        roles: ['R_ADMIN', 'R_SUPER'],
        enabled: true
      })
      await this.repo.save(record)
    }
  }

  async findByUserName(userName: string): Promise<User | null> {
    return (await this.repo.findOne({ where: { userName } })) || null
  }

  verifyPassword(user: User, password: string): boolean {
    return bcrypt.compareSync(password, user.passwordHash)
  }

  async createUser(userName: string, password: string): Promise<User> {
    const exists = await this.findByUserName(userName)
    if (exists) {
      throw new Error('用户名已存在')
    }
    const passwordHash = bcrypt.hashSync(password, 10)
    const record = this.repo.create({
      userName,
      passwordHash,
      roles: ['R_USER'],
      enabled: true
    })
    return await this.repo.save(record)
  }
}
