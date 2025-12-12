import { Controller, Get, Post, Body, Query, Req, UseGuards, Inject } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, Like, In, Between } from 'typeorm'
import { JwtGuard } from '../auth/jwt.guard'
import { Customer } from '../customers/customer.entity'
import { DataScopeService } from '../common/data-scope.service'
import { Department } from '../departments/department.entity'

@Controller('api/customer')
export class CustomerController {
  constructor(
    @InjectRepository(Customer) private readonly repo: Repository<Customer>,
    @Inject(DataScopeService) private readonly dataScopeService: DataScopeService,
    @InjectRepository(Department) private readonly deptRepo: Repository<Department>
  ) {}

  private async seedDemoOrgIfEmpty(): Promise<void> {
    const countStores = await this.deptRepo.count({ where: { type: 'store' as any } })
    if (countStores > 0) return

    const group = this.deptRepo.create({ name: '华星名仕集团', type: 'group', enabled: true })
    const savedGroup = await this.deptRepo.save(group)

    const brand = this.deptRepo.create({
      name: '华星名仕品牌',
      type: 'brand' as any,
      parentId: savedGroup.id,
      enabled: true,
      code: '01'
    })
    const savedBrand = await this.deptRepo.save(brand)

    const dept = this.deptRepo.create({
      name: '销售部门',
      type: 'department' as any,
      parentId: savedBrand.id,
      enabled: true,
      code: '01'
    })
    const savedDept = await this.deptRepo.save(dept)

    const region = this.deptRepo.create({
      name: '成都区域',
      type: 'region' as any,
      parentId: savedDept.id,
      enabled: true,
      code: '0101'
    })
    const savedRegion = await this.deptRepo.save(region)

    const store = this.deptRepo.create({
      name: '成都一店',
      type: 'store' as any,
      parentId: savedRegion.id,
      enabled: true,
      code: '010101'
    })
    await this.deptRepo.save(store)
  }

  @UseGuards(JwtGuard)
  @Get('list')
  async list(@Req() req: any, @Query() query: any) {
    const current = Math.max(1, Number(query.current || 1))
    const size = Math.max(1, Math.min(100, Number(query.size || 10)))
    const roles: string[] = Array.isArray(req.user?.roles) ? req.user.roles : []
    const excluded = ['R_SALES', 'R_SALES_MANAGER', 'R_APPOINTMENT', 'R_FRONT_DESK']
    const hasExcluded = roles.some((r) => excluded.includes(String(r).trim()))
    if (hasExcluded) {
      return {
        code: 403,
        msg: '无权限查看客户列表',
        data: { records: [], total: 0, current, size }
      }
    }

    const scope = await this.dataScopeService.getScope(req.user)
    const allowedStoreIds = await this.dataScopeService.resolveAllowedStoreIds(scope)

    // 解析门店筛选参数
    const storeIdParam =
      query.storeId !== undefined && query.storeId !== '' ? Number(query.storeId) : undefined

    // 数据范围与门店过滤：
    // - 当 scope.level 为 'all'（管理员/信息岗），不限制门店；若传入 storeId 则按该值精确过滤
    // - 其他范围：若传入 storeId，需在可见门店集合内，否则返回空；未传入则按集合过滤
    const where: any = {}
    if (scope.level === 'all') {
      if (typeof storeIdParam === 'number' && !Number.isNaN(storeIdParam)) {
        where.storeId = storeIdParam
      }
    } else {
      if (typeof storeIdParam === 'number' && !Number.isNaN(storeIdParam)) {
        if (!allowedStoreIds.includes(storeIdParam)) {
          return {
            code: 200,
            msg: 'ok',
            data: { records: [], total: 0, current, size }
          }
        }
        where.storeId = storeIdParam
      } else {
        where.storeId = In(allowedStoreIds.length ? allowedStoreIds : [-1])
      }
    }

    // 搜索条件
    if (query.userName) where.name = Like(`%${String(query.userName)}%`)
    if (query.userPhone) where.phone = Like(`%${String(query.userPhone)}%`)
    if (query.userGender) where.gender = String(query.userGender)
    if (query.buyExperience) where.buyExperience = String(query.buyExperience)
    if (query.currentBrand) where.currentBrand = Like(`%${String(query.currentBrand)}%`)
    if (query.currentModel) where.currentModel = Like(`%${String(query.currentModel)}%`)

    const [records, total] = await this.repo.findAndCount({
      where,
      order: { updatedAt: 'DESC' },
      skip: (current - 1) * size,
      take: size,
      cache: { id: `customer_list_${JSON.stringify(where)}`, milliseconds: 60000 } // 添加查询缓存，1分钟
    })

    const payload = {
      records: records.map((r) => ({
        id: r.id,
        userName: r.name,
        userPhone: r.phone,
        userGender: r.gender,
        userAge: r.age,
        buyExperience: r.buyExperience,
        userPhoneModel: r.phoneModel || '',
        currentBrand: r.currentBrand || '',
        currentModel: r.currentModel || '',
        carAge: r.carAge,
        mileage: Number(r.mileage || 0),
        livingArea: r.livingArea || '',
        storeId: r.storeId
      })),
      total,
      current,
      size
    }

    return { code: 200, msg: 'ok', data: payload }
  }

  /** 返回当前用户允许的门店选项（受数据范围约束） */
  @UseGuards(JwtGuard)
  @Get('store-options')
  async storeOptions(@Req() req: any) {
    const roles: string[] = Array.isArray(req.user?.roles) ? req.user.roles : []
    const isAdmin = roles.includes('R_ADMIN') || roles.includes('R_SUPER') || roles.includes('R_INFO')
    if (!this.dataScopeService) {
      if (isAdmin) {
        await this.seedDemoOrgIfEmpty()
        const allStores = await this.deptRepo.find({ where: { type: 'store' as any } })
        const options = allStores.map((s) => ({ id: s.id, name: s.name }))
        return { code: 200, msg: 'ok', data: options }
      }
      return { code: 200, msg: 'ok', data: [] }
    }

    try {
      const scope = await this.dataScopeService.getScope(req.user)
      const allowedStoreIds = await this.dataScopeService.resolveAllowedStoreIds(scope)
      if (scope.level === 'all') {
        await this.seedDemoOrgIfEmpty()
        const allStores = await this.deptRepo.find({ where: { type: 'store' as any } })
        const options = allStores.map((s) => ({ id: s.id, name: s.name }))
        return { code: 200, msg: 'ok', data: options }
      }
      if (!allowedStoreIds.length) return { code: 200, msg: 'ok', data: [] }
      const stores = await this.deptRepo.find({ where: { id: In(allowedStoreIds) } })
      const options = stores.map((s) => ({ id: s.id, name: s.name }))
      return { code: 200, msg: 'ok', data: options }
    } catch (err) {
      if (isAdmin) {
        await this.seedDemoOrgIfEmpty()
        const allStores = await this.deptRepo.find({ where: { type: 'store' as any } })
        const options = allStores.map((s) => ({ id: s.id, name: s.name }))
        return { code: 200, msg: 'ok', data: options }
      }
      return { code: 200, msg: 'ok', data: [] }
    }
  }

  /** 编辑保存客户（仅支持更新已有记录） */
  @UseGuards(JwtGuard)
  @Post('save')
  async save(@Req() req: any, @Body() body: any) {
    const id = Number(body?.id)
    if (!id || Number.isNaN(id)) return { code: 400, msg: '缺少有效的ID', data: false }
    const exists = await this.repo.findOne({ where: { id } })
    if (!exists) return { code: 404, msg: '未找到客户', data: false }

    // 范围校验：必须有权操作该客户所在门店
    const scope = await this.dataScopeService.getScope(req.user)
    const allowedStoreIds = await this.dataScopeService.resolveAllowedStoreIds(scope)
    if (scope.level !== 'all') {
      if (!allowedStoreIds.length || !allowedStoreIds.includes(Number(exists.storeId))) {
        return { code: 403, msg: '无权编辑该门店客户', data: false }
      }
    }

    // 更新字段（不改门店归属）
    exists.name = String(body.userName ?? exists.name)
    exists.phone = String(body.userPhone ?? exists.phone)
    exists.gender = String(body.userGender ?? exists.gender) as any
    exists.age = Number(body.userAge ?? exists.age ?? 0)
    exists.buyExperience = String(body.buyExperience ?? exists.buyExperience) as any
    exists.phoneModel = body.userPhoneModel ?? exists.phoneModel
    exists.currentBrand = body.currentBrand ?? exists.currentBrand
    exists.currentModel = body.currentModel ?? exists.currentModel
    exists.carAge = Number(body.carAge ?? exists.carAge ?? 0)
    exists.mileage = Number(body.mileage ?? exists.mileage ?? 0)
    const livingArea = Array.isArray(body.livingArea)
      ? (body.livingArea as any[]).join('/')
      : String(body.livingArea ?? exists.livingArea ?? '')
    exists.livingArea = livingArea

    try {
      await this.repo.save(exists)
      return { code: 200, msg: '保存成功', data: true }
    } catch (err: any) {
      // 唯一约束：同门店+手机号+姓名
      if (err?.code === 'ER_DUP_ENTRY') {
        return { code: 400, msg: '该门店已存在相同姓名与手机号的客户', data: false }
      }
      throw err
    }
  }

  /** 删除客户 */
  @UseGuards(JwtGuard)
  @Post('delete')
  async delete(@Req() req: any, @Body() body: any) {
    const id = Number(body?.id)
    if (!id || Number.isNaN(id)) return { code: 400, msg: '缺少有效的ID', data: false }
    const exists = await this.repo.findOne({ where: { id } })
    if (!exists) return { code: 404, msg: '未找到客户', data: false }

    // 范围校验
    const scope = await this.dataScopeService.getScope(req.user)
    const allowedStoreIds = await this.dataScopeService.resolveAllowedStoreIds(scope)
    if (scope.level !== 'all') {
      if (!allowedStoreIds.length || !allowedStoreIds.includes(Number(exists.storeId))) {
        return { code: 403, msg: '无权删除该门店客户', data: false }
      }
    }

    await this.repo.delete(id)
    return { code: 200, msg: '删除成功', data: true }
  }

  @UseGuards(JwtGuard)
  @Get('new-week-count')
  async newWeekCount(@Req() req: any, @Query() query: any) {
    const scope = await this.dataScopeService.getScope(req.user)
    const allowedStoreIds = await this.dataScopeService.resolveAllowedStoreIds(scope)
    const storeId = query.storeId ? Number(query.storeId) : undefined
    const now = new Date()
    const day = now.getDay()
    const diffToMonday = (day + 6) % 7
    const monday = new Date(now)
    monday.setDate(now.getDate() - diffToMonday)
    monday.setHours(0, 0, 0, 0)
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    sunday.setHours(23, 59, 59, 999)
    const prevMonday = new Date(monday)
    prevMonday.setDate(monday.getDate() - 7)
    const prevSunday = new Date(sunday)
    prevSunday.setDate(sunday.getDate() - 7)
    const fmtFull = (d: Date) => d.toISOString().slice(0, 19).replace('T', ' ')
    const whereCur: any = { createdAt: Between(fmtFull(monday), fmtFull(sunday)) }
    const wherePrev: any = { createdAt: Between(fmtFull(prevMonday), fmtFull(prevSunday)) }
    if (storeId) {
      if (scope.level !== 'all' && (!allowedStoreIds.length || !allowedStoreIds.includes(storeId))) {
        return { code: 403, msg: '无权访问该门店', data: { count: 0, changePercent: 0 } }
      }
      whereCur.storeId = storeId
      wherePrev.storeId = storeId
    } else if (allowedStoreIds.length) {
      whereCur.storeId = In(allowedStoreIds)
      wherePrev.storeId = In(allowedStoreIds)
    }
    const cur = await this.repo.count({ where: whereCur })
    const prev = await this.repo.count({ where: wherePrev })
    const changePercent = prev === 0 ? (cur > 0 ? 100 : 0) : Math.round(((cur - prev) / prev) * 100)
    return { code: 200, msg: 'ok', data: { count: cur, changePercent } }
  }
}
