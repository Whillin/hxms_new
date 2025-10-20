import { Injectable, OnModuleInit } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import bcrypt from 'bcryptjs'
import { User } from './user.entity'
import { Employee } from '../employees/employee.entity'

@Injectable()
export class UserService implements OnModuleInit {
  constructor(
    @InjectRepository(User) private readonly repo: Repository<User>,
    @InjectRepository(Employee) private readonly employeeRepo: Repository<Employee>
  ) {}

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

  async createUser(
    userName: string,
    password: string,
    name?: string,
    phone?: string
  ): Promise<User> {
    const exists = await this.findByUserName(userName)
    if (exists) {
      throw new Error('用户名已存在')
    }

    // 要求姓名与手机号同时匹配同一员工
    if (!name || !phone) {
      throw new Error('姓名与手机号必填')
    }

    const employee = (await this.employeeRepo.findOne({ where: { name, phone } })) || null
    if (!employee) {
      throw new Error('姓名与手机号不匹配或不存在')
    }
    if (employee.status !== '1') {
      throw new Error('员工不在职，无法注册')
    }

    // 检查是否已为该员工创建过账号
    const bound = await this.repo.findOne({ where: { employeeId: employee.id } })
    if (bound) {
      throw new Error('该员工已注册账号')
    }

    // 保险加载员工角色，避免由于列选择或实体映射导致缺失
    let resolvedRole: string | undefined
    try {
      const e = await this.employeeRepo.findOne({
        where: { id: employee.id },
        select: { role: true, status: true }
      })
      resolvedRole = (e?.role ?? employee.role)?.trim()
    } catch {
      resolvedRole = employee.role?.trim()
    }

    const passwordHash = bcrypt.hashSync(password, 10)
    const roles = ['R_USER']
    if (resolvedRole) roles.push(resolvedRole)

    const record = this.repo.create({
      userName,
      passwordHash,
      roles,
      enabled: true,
      employeeId: employee.id
    })
    return await this.repo.save(record)
  }
}
