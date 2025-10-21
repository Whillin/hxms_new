import { Body, Controller, Get, Post, Query, Req, UseGuards, Inject } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, Like, In } from 'typeorm'
import { Employee } from '../employees/employee.entity'
import { Department } from '../departments/department.entity'
import { EmployeeStoreLink } from '../employees/employee-store.entity'
import { JwtGuard } from '../auth/jwt.guard'
import { DataScopeService } from '../common/data-scope.service'

function requiredLevelByRole(role?: string): 'brand' | 'region' | 'store' {
  const map: Record<string, 'brand' | 'region' | 'store'> = {
    R_BRAND_GM: 'brand',
    R_REGION_GM: 'region',
    R_STORE_DIRECTOR: 'store',
    R_STORE_MANAGER: 'store',
    R_FRONT_DESK: 'store',
    R_SALES_MANAGER: 'store',
    R_SALES: 'store',
    R_APPOINTMENT: 'store',
    R_TECH: 'store',
    R_FINANCE: 'store',
    R_HR: 'store',
    R_ADMIN: 'brand'
  }
  return (role && map[role]) || 'store'
}

// 初始示例数据，用于首次访问时回填数据库
const SEED_EMPLOYEES: Omit<Employee, 'id' | 'createdAt' | 'updatedAt'>[] = Array.from({
  length: 25
}).map((_, i) => {
  const id = i + 1
  const genders: Employee['gender'][] = ['male', 'female', 'other']
  const roles = [
    'R_SALES',
    'R_TECH',
    'R_FINANCE',
    'R_HR',
    'R_STORE_MANAGER',
    'R_REGION_GM',
    'R_BRAND_GM'
  ]
  const role = roles[i % roles.length]
  const levelMap: Record<string, 'brand' | 'region' | 'store'> = {
    R_BRAND_GM: 'brand',
    R_REGION_GM: 'region',
    R_STORE_DIRECTOR: 'store',
    R_STORE_MANAGER: 'store',
    R_FRONT_DESK: 'store',
    R_SALES_MANAGER: 'store',
    R_SALES: 'store',
    R_APPOINTMENT: 'store',
    R_TECH: 'store',
    R_FINANCE: 'store',
    R_HR: 'store',
    R_ADMIN: 'brand'
  }
  const level = levelMap[role] ?? 'store'
  const brandId = (i % 3) + 1
  const regionId = (i % 4) + 1
  const storeId = (i % 5) + 1
  return {
    name: `员工${id}`,
    phone: `1380000${String(1000 + id).slice(-4)}`,
    gender: genders[id % genders.length],
    status: id % 5 === 0 ? '2' : '1',
    role,
    brandId: level === 'brand' ? brandId : undefined,
    regionId: level === 'region' ? regionId : undefined,
    storeId: level === 'store' ? storeId : undefined,
    hireDate: new Date(Date.now() - id * 86400000).toISOString().slice(0, 10)
  }
})

@Controller('api/employee')
export class EmployeeController {
  constructor(
    @InjectRepository(Employee) private readonly repo: Repository<Employee>,
    @InjectRepository(Department) private readonly deptRepo: Repository<Department>,
    @InjectRepository(EmployeeStoreLink) private readonly linkRepo: Repository<EmployeeStoreLink>,
    @Inject(DataScopeService) private readonly dataScopeService: DataScopeService
  ) {}

  private async seedIfEmpty() {
    const count = await this.repo.count()
    if (count === 0) {
      await this.repo.save(SEED_EMPLOYEES.map((e) => this.repo.create(e)))
    }
  }

  /**
   * 员工列表（分页+搜索）
   * 支持参数：current, size, name, phone, role, gender, status, brandId, regionId, storeId
   */
  @UseGuards(JwtGuard)
  @Get('list')
  async list(@Req() req: any, @Query() query: Record<string, any>) {
    await this.seedIfEmpty()

    const current = Number(query.current || 1)
    const size = Number(query.size || 10)
    const name = String(query.name || '')
    const phone = String(query.phone || '')
    const role = String(query.role || '')
    const gender = String(query.gender || '')
    const status = String(query.status || '')
    const brandId = query.brandId !== undefined ? Number(query.brandId) : undefined
    const regionId = query.regionId !== undefined ? Number(query.regionId) : undefined
    const storeId = query.storeId !== undefined ? Number(query.storeId) : undefined
    const departmentId = query.departmentId !== undefined ? Number(query.departmentId) : undefined

    const where: any = {}
    if (name) where.name = Like(`%${name}%`)
    if (phone) where.phone = Like(`%${phone}%`)
    if (role) where.role = role
    if (gender) where.gender = gender
    if (status) where.status = status
    if (typeof brandId === 'number' && !Number.isNaN(brandId)) where.brandId = brandId
    if (typeof regionId === 'number' && !Number.isNaN(regionId)) where.regionId = regionId
    if (typeof storeId === 'number' && !Number.isNaN(storeId)) where.storeId = storeId
    if (typeof departmentId === 'number' && !Number.isNaN(departmentId))
      where.departmentId = departmentId

    // 数据范围过滤（基于登录用户的岗位与部门）
    const roles: string[] = Array.isArray(req.user?.roles) ? req.user.roles : []
    const userId: number = Number(req.user?.sub)
    const isAdmin =
      roles.includes('R_ADMIN') || roles.includes('R_SUPER') || roles.includes('R_INFO')

    if (!isAdmin && userId && !Number.isNaN(userId)) {
      const scope = await this.dataScopeService.getScope(req.user)
      const scopeWhere = this.dataScopeService.buildWhereForStandard(scope, { storeId })
      Object.assign(where, scopeWhere)
    }

    const [records, total] = await this.repo.findAndCount({
      where,
      order: { id: 'ASC' },
      skip: (current - 1) * size,
      take: size
    })

    return {
      code: 200,
      msg: '获取成功',
      data: { records, total, current, size, pages: Math.ceil(total / size) }
    }
  }

  /** 保存员工（新增/编辑），所有字段必填 */
  @Post('save')
  async save(@Body() body: Partial<Employee> & { storeIds?: number[] }) {
    const incoming = body || {}

    // 基础必填校验
    const baseRequired = ['name', 'phone', 'gender', 'status', 'role', 'hireDate'] as const
    for (const key of baseRequired) {
      if (!(incoming as any)[key]) {
        return { code: 400, msg: `缺少必填字段：${key}`, data: false }
      }
    }

    // 手机号格式校验（中国大陆11位）
    const phoneStr = String(incoming.phone)
    if (!/^1[3-9]\d{9}$/.test(phoneStr)) {
      return { code: 400, msg: '手机号格式不正确', data: false }
    }

    // 规范化入职日期为 YYYY-MM-DD，避免超过 varchar(10)
    const normalizeDate = (v: any): string => {
      if (!v) return ''
      if (typeof v === 'string') return v.slice(0, 10)
      try {
        const d = new Date(v)
        const yyyy = d.getFullYear()
        const mm = String(d.getMonth() + 1).padStart(2, '0')
        const dd = String(d.getDate()).padStart(2, '0')
        return `${yyyy}-${mm}-${dd}`
      } catch {
        return String(v).slice(0, 10)
      }
    }
    incoming.hireDate = normalizeDate(incoming.hireDate)

    // 部门层级必填校验（基于角色要求）
    const level = requiredLevelByRole(incoming.role)
    if (level === 'brand' && typeof incoming.brandId !== 'number') {
      return { code: 400, msg: '请选择品牌层级部门', data: false }
    }
    if (level === 'region' && typeof incoming.regionId !== 'number') {
      return { code: 400, msg: '请选择区域层级部门', data: false }
    }
    if (level === 'store') {
      // store 层级允许单店或多店（storeId 或 storeIds）
      const hasSingle = typeof incoming.storeId === 'number'
      const hasMulti =
        Array.isArray((incoming as any).storeIds) && (incoming as any).storeIds.length > 0
      if (!hasSingle && !hasMulti) {
        return { code: 400, msg: '请选择门店层级部门', data: false }
      }
      if (hasMulti) {
        if (typeof incoming.brandId !== 'number' || typeof incoming.regionId !== 'number') {
          return { code: 400, msg: '请选择品牌与区域', data: false }
        }
        const storeIds = (incoming as any).storeIds as number[]
        const stores = await this.deptRepo.find({ where: { id: In(storeIds) } })
        if (stores.length !== storeIds.length) {
          return { code: 400, msg: '存在无效门店，请检查', data: false }
        }
        // 校验同品牌同区域：沿父链找到 region 与 brand
        const byId = new Map<number, Department>()
        stores.forEach((s) => byId.set(s.id, s))
        const getById = async (id: number) =>
          byId.get(id) || (await this.deptRepo.findOne({ where: { id } }))
        const findAncestors = async (id: number) => {
          let regionId: number | undefined
          let brandId: number | undefined
          let storeId: number | undefined
          let cur = await getById(id)
          const guard = new Set<number>()
          while (cur && typeof cur.parentId === 'number' && !guard.has(cur.parentId!)) {
            guard.add(cur.parentId!)
            const p = await getById(cur.parentId!)
            if (!p) break
            if (p.type === 'store') storeId = p.id
            if (p.type === 'region') regionId = p.id
            if (p.type === 'brand') brandId = p.id
            cur = p
          }
          return { storeId, regionId, brandId }
        }
        for (const sid of storeIds) {
          const { regionId, brandId } = await findAncestors(sid)
          if (regionId !== incoming.regionId || brandId !== incoming.brandId) {
            return { code: 400, msg: '请选择同品牌同区域的多家门店', data: false }
          }
        }
      }

      // 计算允许门店集合，用于校验小组归属
      const allowedStoreIds: number[] = hasMulti
        ? ((incoming as any).storeIds as number[])
        : typeof incoming.storeId === 'number'
          ? [incoming.storeId]
          : []

      // 销售经理必须选择小组（departmentId）
      if (
        incoming.role === 'R_SALES_MANAGER' &&
        typeof (incoming as any).departmentId !== 'number'
      ) {
        return { code: 400, msg: '销售经理必须选择所属门店小组', data: false }
      }

      // 若选择了小组，校验其归属门店是否在允许范围内
      if (typeof (incoming as any).departmentId === 'number') {
        const deptId = Number((incoming as any).departmentId)
        const dept = await this.deptRepo.findOne({ where: { id: deptId } })
        if (!dept || dept.type !== 'department') {
          return { code: 400, msg: '请选择有效的小组节点', data: false }
        }
        const getById2 = async (id: number) => await this.deptRepo.findOne({ where: { id } })
        const findStoreAncestor = async (id: number) => {
          let cur = await getById2(id)
          const guard = new Set<number>()
          while (cur && typeof cur.parentId === 'number' && !guard.has(cur.parentId!)) {
            guard.add(cur.parentId!)
            const p = await getById2(cur.parentId!)
            if (!p) break
            if (p.type === 'store') return p.id
            cur = p
          }
          return undefined as number | undefined
        }
        const deptStoreId = await findStoreAncestor(dept.id)
        if (typeof deptStoreId !== 'number' || !allowedStoreIds.includes(deptStoreId)) {
          return { code: 400, msg: '小组不属于所选门店，请检查', data: false }
        }
      }
    }

    // 手机号唯一性校验（先查重，再保存）
    const existingByPhone = await this.repo.findOne({ where: { phone: incoming.phone! } })

    // 更新或新增
    if (incoming.id) {
      const id = Number(incoming.id)
      const exists = await this.repo.findOne({ where: { id } })
      if (!exists) return { code: 404, msg: '未找到员工', data: false }

      if (existingByPhone && existingByPhone.id !== id) {
        return { code: 400, msg: '手机号已存在', data: false }
      }

      exists.name = incoming.name!
      exists.phone = incoming.phone!
      exists.gender = incoming.gender!
      exists.status = incoming.status!
      exists.role = incoming.role!
      exists.brandId = incoming.brandId
      exists.regionId = incoming.regionId
      exists.storeId = incoming.storeId
      ;(exists as any).departmentId = (incoming as any).departmentId
      exists.hireDate = incoming.hireDate!
      try {
        await this.repo.save(exists)
        // 维护多门店关联
        await this.linkRepo.delete({ employeeId: exists.id })
        const storeIds: number[] = Array.isArray((incoming as any).storeIds)
          ? ((incoming as any).storeIds as number[])
          : []
        const toInsert = (
          storeIds.length
            ? storeIds
            : typeof incoming.storeId === 'number'
              ? [incoming.storeId]
              : []
        ).map((sid) => this.linkRepo.create({ employeeId: exists.id, storeId: sid }))
        if (toInsert.length) await this.linkRepo.save(toInsert)
      } catch (err: any) {
        // 兜底处理数据库唯一约束
        if (err?.code === 'ER_DUP_ENTRY') {
          return { code: 400, msg: '手机号已存在', data: false }
        }
        throw err
      }
    } else {
      if (existingByPhone) {
        return { code: 400, msg: '手机号已存在', data: false }
      }
      const record = this.repo.create({
        name: incoming.name!,
        phone: incoming.phone!,
        gender: incoming.gender!,
        status: incoming.status!,
        role: incoming.role!,
        brandId: incoming.brandId,
        regionId: incoming.regionId,
        storeId: incoming.storeId,
        departmentId: (incoming as any).departmentId,
        hireDate: incoming.hireDate!
      })
      try {
        const saved = await this.repo.save(record)
        // 维护多门店关联
        const storeIds: number[] = Array.isArray((incoming as any).storeIds)
          ? ((incoming as any).storeIds as number[])
          : []
        const toInsert = (
          storeIds.length
            ? storeIds
            : typeof incoming.storeId === 'number'
              ? [incoming.storeId]
              : []
        ).map((sid) => this.linkRepo.create({ employeeId: saved.id, storeId: sid }))
        if (toInsert.length) await this.linkRepo.save(toInsert)
      } catch (err: any) {
        if (err?.code === 'ER_DUP_ENTRY') {
          return { code: 400, msg: '手机号已存在', data: false }
        }
        throw err
      }
    }

    return { code: 200, msg: '保存成功', data: true }
  }

  /** 删除员工 */
  @Post('delete')
  async delete(@Body() body: { id?: number }) {
    const id = Number(body?.id)
    if (!id || Number.isNaN(id)) {
      return { code: 400, msg: '缺少有效的ID', data: false }
    }
    const res = await this.repo.delete(id)
    const ok = !!res.affected && res.affected > 0
    if (!ok) return { code: 404, msg: '未找到员工', data: false }
    // 级联清理多门店关联
    await this.linkRepo.delete({ employeeId: id })
    return { code: 200, msg: '删除成功', data: true }
  }
}
