import { Body, Controller, Get, Post, Query, Req } from '@nestjs/common'
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
    const existing = await this.repo.find({
      select: ['id', 'roleCode', 'roleName', 'description', 'enabled']
    })
    console.log('[RoleController.seedIfEmpty] existing count =', existing.length)
    const byCode = new Map(existing.map((r) => [r.roleCode, r]))

    const seeds = [
      {
        roleCode: 'R_SUPER',
        roleName: '超级管理员',
        description: '系统的超级管理员，可访问所有功能',
        enabled: true
      },
      {
        roleCode: 'R_ADMIN',
        roleName: '系统管理员',
        description: '系统基础管理角色，可访问大部分功能',
        enabled: true
      },
      {
        roleCode: 'R_STAFF',
        roleName: '员工',
        description: '普通员工角色，可访问与其岗位相关功能',
        enabled: true
      },
      { roleCode: 'R_FINANCE', roleName: '财务', description: '财务相关操作与对账', enabled: true },
      { roleCode: 'R_SALE', roleName: '销售', description: '销售相关功能与报表', enabled: true }
    ]

    // 仅当表为空时进行种子插入，避免用户删除后被再次重建
    if (existing.length === 0) {
      console.log(
        '[RoleController.seedIfEmpty] roles table empty, seeding:',
        seeds.map((s) => s.roleCode)
      )
      const toCreate = seeds.map((s) => this.repo.create({ ...s }))
      if (toCreate.length) {
        await this.repo.save(toCreate)
        console.log(
          '[RoleController.seedIfEmpty] seeded roles:',
          toCreate.map((r) => r.roleCode)
        )
      }
      return
    }

    // 表不为空：只对已存在的标准角色进行名称/描述纠正，不补齐缺失项
    const toUpdate: Role[] = []
    for (const s of seeds) {
      const ex = byCode.get(s.roleCode) as Role | undefined
      if (!ex) continue // 不再自动补充缺失的标准角色
      const nameBad = !ex.roleName || ex.roleName.trim() === '' || ex.roleName.length > 50
      const descBad = !ex.description || ex.description.trim() === '' || ex.description.length > 200
      if (nameBad || descBad) {
        if (nameBad) ex.roleName = s.roleName
        if (descBad) ex.description = s.description
        if (typeof ex.enabled === 'undefined') ex.enabled = s.enabled as boolean
        toUpdate.push(ex)
      }
    }
    if (toUpdate.length) {
      await this.repo.save(toUpdate)
      console.log(
        '[RoleController.seedIfEmpty] corrected roles:',
        toUpdate.map((r) => r.roleCode)
      )
    }
  }

  /** 角色列表（分页+搜索） */
  @Get('list')
  async list(@Query() query: Record<string, any>) {
    if (process.env.SEED_ENABLED === 'true') {
      await this.seedIfEmpty()
    }

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
  async save(@Body() body: Partial<Role> & { roleId?: number }, @Req() req: any) {
    const incoming = body || {}
    const headers = req?.headers || {}
    console.log('[RoleController.save] incoming:', incoming)
    console.log('[RoleController.save] from:', {
      referer: headers['referer'] || headers['referrer'] || '',
      origin: headers['origin'] || '',
      ua: headers['user-agent'] || ''
    })

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
      console.log('[RoleController.save] updated role:', { id, roleCode: exists.roleCode })
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
      console.log('[RoleController.save] created role:', {
        id: record.id,
        roleCode: record.roleCode
      })
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

    // 归一化键名至 RouteName_action 格式：将 '.'、'-'、'\\' 替换为 '_'，压缩重复下划线
    const normalize = (k: string) =>
      String(k)
        .trim()
        .replace(/[.\\-]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_+|_+$/g, '')
    const normalizedKeys = Array.from(new Set(keys.map(normalize).filter((k) => !!k)))

    // 覆盖保存
    await this.permRepo.delete({ roleId })
    const toInsert = normalizedKeys.map((k) => this.permRepo.create({ roleId, permissionKey: k }))
    if (toInsert.length) await this.permRepo.save(toInsert)

    return { code: 200, msg: '保存成功', data: true }
  }
}
