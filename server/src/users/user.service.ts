import { Injectable, OnModuleInit } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, Like } from 'typeorm'
import bcrypt from 'bcryptjs'
import { User } from './user.entity'
import { Employee } from '../employees/employee.entity'
import { Role } from '../roles/role.entity'

@Injectable()
export class UserService implements OnModuleInit {
  constructor(
    @InjectRepository(User) private readonly repo: Repository<User>,
    @InjectRepository(Employee) private readonly employeeRepo: Repository<Employee>,
    @InjectRepository(Role) private readonly roleRepo: Repository<Role>
  ) {}

  async onModuleInit(): Promise<void> {
    // 禁用默认管理员播种，除非显式开启
    if (process.env.SEED_ENABLED !== 'true') return
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
    console.log('Searching for userName:', userName)
    console.log('Length:', userName.length)
    console.log('Hex:', Buffer.from(userName, 'utf8').toString('hex'))
    const user = await this.repo.findOne({ where: { userName } })
    console.log('Found user:', user ? user.id : 'null')
    return user || null
  }

  verifyPassword(user: User, password: string): boolean {
    return bcrypt.compareSync(password, user.passwordHash)
  }

  // 新增：按ID查找用户
  async findById(id: number): Promise<User | null> {
    if (!id || Number.isNaN(id)) return null
    return (await this.repo.findOne({ where: { id } })) || null
  }

  // 新增：保存用户（用于资料更新）
  async save(user: User): Promise<User> {
    return await this.repo.save(user)
  }

  // 新增：按ID删除用户
  async deleteById(id: number): Promise<boolean> {
    if (!id || Number.isNaN(id)) return false
    const existing = await this.repo.findOne({ where: { id } })
    if (!existing) return false
    await this.repo.delete(id)
    return true
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
    const roles: string[] = ['R_USER']
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

  // 新增：按用户名重置密码（用于管理员重置功能）
  async resetPasswordByUserName(userName: string, newPassword: string): Promise<boolean> {
    if (!userName || !newPassword) return false
    const existing = await this.repo.findOne({ where: { userName } })
    if (!existing) return false
    const passwordHash = bcrypt.hashSync(newPassword, 10)
    existing.passwordHash = passwordHash
    await this.repo.save(existing)
    return true
  }

  // 新增：按用户ID重置密码（用于管理员重置功能）
  async resetPasswordByUserId(id: number, newPassword: string): Promise<boolean> {
    const userId = Number(id)
    if (!userId || Number.isNaN(userId) || !newPassword) return false
    const existing = await this.repo.findOne({ where: { id: userId } })
    if (!existing) return false
    const passwordHash = bcrypt.hashSync(newPassword, 10)
    existing.passwordHash = passwordHash
    await this.repo.save(existing)
    return true
  }

  /**
   * 归一化并兜底用户角色：
   * - 过滤掉已被删除的角色编码（当字典存在时）
   * - 当角色字典为空时，信任传入角色不做过滤
   * - 仅当最终集合为空时才兜底为 `R_FRONT_DESK`
   * - 始终保留高权限角色：`R_ADMIN`、`R_SUPER`
   */
  async sanitizeRoles(roles: string[] | undefined): Promise<string[]> {
    const incoming = Array.isArray(roles)
      ? roles.map((r) => String(r).trim()).filter((r) => !!r)
      : []

    // 加载现有角色编码集合
    const rows = await this.roleRepo.find({ select: { roleCode: true } })
    const validSet = new Set(rows.map((r) => r.roleCode))

    let filtered: string[]
    if (validSet.size === 0) {
      // 角色字典为空：不做过滤，直接使用传入集合
      filtered = incoming
    } else {
      // 字典存在：仅保留有效编码
      filtered = incoming.filter((code) => validSet.has(code))
      // 保留高权限角色，避免因字典缺失导致误降级
      const preserve = ['R_ADMIN', 'R_SUPER']
      preserve.forEach((k) => {
        if (incoming.includes(k) && !filtered.includes(k)) filtered.push(k)
      })
    }

    const out = new Set<string>(filtered)
    if (out.size === 0) {
      out.add('R_FRONT_DESK')
    }

    return Array.from(out)
  }

  // 新增：用户列表（分页与筛选），返回给前端的视图结构
  async listUsers(
    params: Partial<{
      current: number
      size: number
      userName: string
      userPhone: string
      userEmail: string
      userGender: string
      status: string
      roleCode: string
    }>
  ) {
    const current = Number(params.current || 1)
    const size = Number(params.size || 20)
    const where: any = {}

    if (params.userName) where.userName = Like(`%${String(params.userName).trim()}%`)
    // 状态与 enabled 的简单映射：1=启用，4=停用，其他不筛选
    if (params.status === '1') where.enabled = true
    if (params.status === '4') where.enabled = false

    const roleCode = typeof params.roleCode === 'string' ? String(params.roleCode).trim() : ''

    // 当存在角色筛选时，先取全部再过滤并分页；否则走数据库分页
    if (roleCode) {
      const allUsers = await this.repo.find({ where, order: { id: 'ASC' } })
      const filteredUsers = allUsers.filter(
        (u) => Array.isArray(u.roles) && u.roles.includes(roleCode)
      )
      const total = filteredUsers.length
      const start = (current - 1) * size
      const paged = filteredUsers.slice(start, start + size)

      const employeeIds = paged
        .map((u) => u.employeeId)
        .filter((id): id is number => typeof id === 'number')
      const employees = employeeIds.length
        ? await this.employeeRepo.find({
            where: employeeIds.length ? employeeIds.map((id) => ({ id })) : []
          })
        : []
      const empMap = new Map<number, Employee>()
      employees.forEach((e) => empMap.set(e.id, e))

      const records = await Promise.all(
        paged.map(async (u) => {
          const emp = typeof u.employeeId === 'number' ? empMap.get(u.employeeId) || null : null
          const genderText =
            emp?.gender === 'male' ? '男' : emp?.gender === 'female' ? '女' : '未知'
          const status = u.enabled ? '1' : '4'
          const nowToStr = (d: Date | undefined) =>
            d ? new Date(d).toISOString().slice(0, 19).replace('T', ' ') : ''
          const userRoles = await this.sanitizeRoles(u.roles as string[])
          return {
            id: u.id,
            avatar: '',
            status,
            userName: u.userName,
            userGender: genderText,
            nickName: emp?.name || u.userName,
            userPhone: emp?.phone || '',
            userDept: '',
            roleName: userRoles.join(','),
            createTime: nowToStr(u.createdAt),
            loginIp: '',
            loginTime: nowToStr(u.updatedAt),
            key: u.id,
            phone: emp?.phone || '',
            mail: '',
            address: '',
            detailAddress: ''
          }
        })
      )

      return { records, total, current, size }
    }

    const [rows, total] = await this.repo.findAndCount({
      where,
      order: { id: 'ASC' },
      skip: (current - 1) * size,
      take: size
    })

    const employeeIds = rows
      .map((u) => u.employeeId)
      .filter((id): id is number => typeof id === 'number')
    const employees = employeeIds.length
      ? await this.employeeRepo.find({ where: employeeIds.map((id) => ({ id })) })
      : []
    const empMap = new Map<number, Employee>()
    employees.forEach((e) => empMap.set(e.id, e))

    const records = await Promise.all(
      rows.map(async (u) => {
        const emp = typeof u.employeeId === 'number' ? empMap.get(u.employeeId) || null : null
        const genderText = emp?.gender === 'male' ? '男' : emp?.gender === 'female' ? '女' : '未知'
        const status = u.enabled ? '1' : '4'
        const nowToStr = (d: Date | undefined) =>
          d ? new Date(d).toISOString().slice(0, 19).replace('T', ' ') : ''
        const userRoles = await this.sanitizeRoles(u.roles as string[])
        return {
          id: u.id,
          avatar: '',
          status,
          userName: u.userName,
          userGender: genderText,
          nickName: emp?.name || u.userName,
          userPhone: emp?.phone || '',
          userDept: '',
          roleName: userRoles.join(','),
          createTime: nowToStr(u.createdAt),
          loginIp: '',
          loginTime: nowToStr(u.updatedAt),
          key: u.id,
          phone: emp?.phone || '',
          mail: '',
          address: '',
          detailAddress: ''
        }
      })
    )

    return { records, total, current, size }
  }
}
