import { Body, Controller, Get, Post, Query } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, Like, Between } from 'typeorm'
import { Role } from '../roles/role.entity'
import { RolePermission } from '../roles/role-permission.entity'

// 前端类型：Api.SystemManage.RoleListItem
type RoleListItem = {
  roleId: number
  roleName: string
  roleCode: string
  description: string
  enabled: boolean
  createTime: string
}

function toItem(row: Role): RoleListItem {
  return {
    roleId: row.id,
    roleName: row.roleName,
    roleCode: row.roleCode,
    description: row.description,
    enabled: !!row.enabled,
    createTime: (row.createTime instanceof Date
      ? row.createTime
      : new Date(row.createTime)
    ).toISOString()
  }
}

@Controller('api/role')
export class RoleController {
  constructor(
    @InjectRepository(Role) private readonly repo: Repository<Role>,
    @InjectRepository(RolePermission) private readonly permRepo: Repository<RolePermission>
  ) {}

  private async seedIfEmpty() {
    const count = await this.repo.count()
    if (count === 0) {
      const seeds: Omit<Role, 'id' | 'createTime' | 'updateTime'>[] = [
        {
          roleName: '超级管理员',
          roleCode: 'R_SUPER',
          description: '系统最高权限，可访问所有模块',
          enabled: true
        },
        {
          roleName: '管理员',
          roleCode: 'R_ADMIN',
          description: '系统管理权限，可访问管理模块',
          enabled: true
        },
        {
          roleName: '普通用户',
          roleCode: 'R_USER',
          description: '基础使用权限，仅访问基础模块',
          enabled: true
        }
      ]
      await this.repo.save(seeds.map((s) => this.repo.create(s)))
    }
  }

  /** 角色列表（分页+搜索） */
  @Get('list')
  async list(@Query() query: Record<string, any>) {
    await this.seedIfEmpty()

    const current = Number(query.current || 1)
    const size = Number(query.size || 10)
    const roleName = String(query.roleName || '')
    const roleCode = String(query.roleCode || '')
    const description = String(query.description || '')
    const enabled = query.enabled
    const startTime = query.startTime ? String(query.startTime) : ''
    const endTime = query.endTime ? String(query.endTime) : ''

    const where: any = {}
    if (roleName) where.roleName = Like(`%${roleName}%`)
    if (roleCode) where.roleCode = Like(`%${roleCode}%`)
    if (description) where.description = Like(`%${description}%`)
    if (typeof enabled !== 'undefined' && enabled !== '') {
      const e = String(enabled)
      where.enabled = e === 'true' || e === '1'
    }
    if (startTime && endTime) {
      const start = new Date(startTime)
      const endDate = new Date(endTime)
      // 包含当天整天
      endDate.setHours(23, 59, 59, 999)
      where.createTime = Between(start, endDate)
    }

    const [rows, total] = await this.repo.findAndCount({
      where,
      order: { id: 'ASC' },
      skip: (current - 1) * size,
      take: size
    })

    return {
      code: 200,
      msg: '获取成功',
      data: { records: rows.map(toItem), total, current, size }
    }
  }

  /** 保存角色（新增/编辑） */
  @Post('save')
  async save(@Body() body: Partial<Role> & { roleId?: number }) {
    const incoming = body || {}

    // 必填校验
    const required = ['roleName', 'roleCode', 'description'] as const
    for (const key of required) {
      if (!(incoming as any)[key] || String((incoming as any)[key]).trim() === '') {
        return { code: 400, msg: `缺少必填字段：${key}`, data: false }
      }
    }

    // 规范化 enabled
    const enabledVal = incoming.enabled
    const enabled = typeof enabledVal === 'boolean' ? enabledVal : String(enabledVal) === 'true'

    // roleCode 唯一性校验
    const existingByCode = await this.repo.findOne({ where: { roleCode: incoming.roleCode! } })

    if (incoming.roleId || (incoming as any).id) {
      const id = Number(incoming.roleId ?? (incoming as any).id)
      const exists = await this.repo.findOne({ where: { id } })
      if (!exists) return { code: 404, msg: '未找到角色', data: false }

      if (existingByCode && existingByCode.id !== id) {
        return { code: 400, msg: '角色编码已存在', data: false }
      }

      exists.roleName = incoming.roleName!
      exists.roleCode = incoming.roleCode!
      exists.description = incoming.description!
      exists.enabled = enabled
      await this.repo.save(exists)
    } else {
      if (existingByCode) {
        return { code: 400, msg: '角色编码已存在', data: false }
      }
      const record = this.repo.create({
        roleName: incoming.roleName!,
        roleCode: incoming.roleCode!,
        description: incoming.description!,
        enabled
      })
      await this.repo.save(record)
    }

    return { code: 200, msg: '保存成功', data: true }
  }

  /** 删除角色 */
  @Post('delete')
  async delete(@Body() body: { roleId?: number; id?: number }) {
    const id = Number(body?.roleId ?? body?.id)
    if (!id || Number.isNaN(id)) {
      return { code: 400, msg: '缺少有效的ID', data: false }
    }
    const res = await this.repo.delete(id)
    const ok = !!res.affected && res.affected > 0
    if (!ok) return { code: 404, msg: '未找到角色', data: false }
    // 清理关联的权限
    await this.permRepo.delete({ roleId: id })
    return { code: 200, msg: '删除成功', data: true }
  }

  /** 获取角色权限键列表 */
  @Get('permissions')
  async getPermissions(@Query() query: { roleId?: number }) {
    const roleId = Number(query?.roleId)
    if (!roleId || Number.isNaN(roleId)) {
      return { code: 400, msg: '缺少有效的角色ID', data: [] }
    }
    const rows = await this.permRepo.find({ where: { roleId } })
    const keys = rows.map((r) => r.permissionKey)
    return { code: 200, msg: '获取成功', data: keys }
  }

  /** 保存角色权限键列表（全量覆盖） */
  @Post('permissions/save')
  async savePermissions(@Body() body: { roleId?: number; keys?: string[] }) {
    const roleId = Number(body?.roleId)
    const keys = Array.isArray(body?.keys) ? (body?.keys as string[]) : []
    if (!roleId || Number.isNaN(roleId)) {
      return { code: 400, msg: '缺少有效的角色ID', data: false }
    }

    // 验证角色存在
    const exists = await this.repo.findOne({ where: { id: roleId } })
    if (!exists) return { code: 404, msg: '未找到角色', data: false }

    // 覆盖保存
    await this.permRepo.delete({ roleId })
    const toInsert = keys
      .map((k) => String(k).trim())
      .filter((k) => !!k)
      .map((k) => this.permRepo.create({ roleId, permissionKey: k }))
    if (toInsert.length) await this.permRepo.save(toInsert)

    return { code: 200, msg: '保存成功', data: true }
  }
}
