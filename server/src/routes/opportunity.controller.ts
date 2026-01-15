import { Controller, Get, Post, Body, Query, Req, UseGuards, Inject } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, Like, Between, In } from 'typeorm'
import { JwtGuard } from '../auth/jwt.guard'
import { Opportunity } from '../opportunities/opportunity.entity'
import { OpportunityFollow } from '../opportunities/opportunity-follow.entity'
import { OpportunityService } from '../opportunities/opportunity.service'
import { UserService } from '../users/user.service'
import { DataScopeService } from '../common/data-scope.service'

@Controller('api/opportunity')
export class OpportunityController {
  constructor(
    @InjectRepository(Opportunity) private readonly repo: Repository<Opportunity>,
    @InjectRepository(OpportunityFollow)
    private readonly followRepo: Repository<OpportunityFollow>,
    @Inject(DataScopeService) private readonly scopeService: DataScopeService,
    @Inject(OpportunityService) private readonly opportunityService: OpportunityService,
    @Inject(UserService) private readonly userService: UserService
  ) {}

  /** 商机列表：支持“本人/下属/门店/区域/品牌/全部”数据范围与常用筛选 */
  @UseGuards(JwtGuard)
  @Get('list')
  async list(@Req() req: any, @Query() query: any) {
    const current = Math.max(1, Number(query.current || 1))
    const size = Math.max(1, Math.min(100, Number(query.size || 10)))
    const scope = await this.scopeService.getScope(req.user)
    const roles: string[] = Array.isArray(req.user?.roles) ? req.user.roles : []
    const isSales = roles.includes('R_SALES')
    const isSalesManager = roles.includes('R_SALES_MANAGER')
    const whereBranches: any[] = []
    // 角色优先规则：
    // - 销售顾问：仅看“本人”
    // - 销售经理：看“本部门”（下属）
    // 其他角色按数据范围（all/region/brand/department/store/self）原逻辑
    if (isSales) {
      // 统一使用 DataScopeService 的解析结果，销售顾问应为 self 且携带 employeeId
      if (typeof scope.employeeId === 'number') whereBranches.push({ ownerId: scope.employeeId })
      else whereBranches.push({})
    } else if (isSalesManager && typeof scope.departmentId === 'number') {
      whereBranches.push({ ownerDepartmentId: scope.departmentId })
    } else {
      switch (scope.level) {
        case 'all':
          whereBranches.push({})
          break
        case 'self':
          if (typeof scope.employeeId === 'number')
            whereBranches.push({ ownerId: scope.employeeId })
          else whereBranches.push({})
          break
        case 'department': {
          if (typeof scope.departmentId === 'number')
            whereBranches.push({ ownerDepartmentId: scope.departmentId })
          const ids = Array.isArray(scope.storeIds) ? scope.storeIds : []
          if (ids.length) whereBranches.push({ storeId: In(ids) })
          if (!whereBranches.length) whereBranches.push({})
          break
        }
        case 'store':
          // 默认门店层级：按门店过滤（非销售/销售经理角色）
          whereBranches.push({ storeId: In(scope.storeIds || []) })
          break
        case 'region':
          if (typeof scope.regionId === 'number') whereBranches.push({ regionId: scope.regionId })
          else whereBranches.push({})
          break
        case 'brand':
          if (typeof scope.brandId === 'number') whereBranches.push({ brandId: scope.brandId })
          else whereBranches.push({})
          break
        default:
          whereBranches.push({})
          break
      }
    }

    // 搜索过滤
    const filters: any = {}
    if (query.customerName) filters.customerName = Like(`%${String(query.customerName)}%`)
    if (query.customerPhone) filters.customerPhone = Like(`%${String(query.customerPhone)}%`)
    if (query.opportunityLevel) filters.opportunityLevel = String(query.opportunityLevel)
    if (query.status) filters.status = String(query.status)
    if (Array.isArray(query.daterange) && query.daterange.length === 2) {
      const [start, end] = query.daterange
      filters.latestVisitDate = Between(String(start), String(end))
    }

    // 改用 QueryBuilder，避免 where 数组产生 OR 行为，确保范围限制为 AND
    const qb = this.repo.createQueryBuilder('o')
    qb.where('1=1')
    if (isSales && typeof scope.employeeId === 'number') {
      qb.andWhere('o.ownerId = :employeeId', { employeeId: scope.employeeId })
    } else if (isSalesManager && typeof scope.departmentId === 'number') {
      qb.andWhere('o.ownerDepartmentId = :deptId', { deptId: scope.departmentId })
      const ids = Array.isArray(scope.storeIds) ? scope.storeIds : []
      if (ids.length) qb.andWhere('o.storeId IN (:...storeIds)', { storeIds: ids })
    } else {
      switch (scope.level) {
        case 'all':
          break
        case 'self':
          if (typeof scope.employeeId === 'number')
            qb.andWhere('o.ownerId = :employeeId', { employeeId: scope.employeeId })
          break
        case 'department':
          if (typeof scope.departmentId === 'number')
            qb.andWhere('o.ownerDepartmentId = :deptId', { deptId: scope.departmentId })
          if (Array.isArray(scope.storeIds) && scope.storeIds.length)
            qb.andWhere('o.storeId IN (:...storeIds)', { storeIds: scope.storeIds })
          break
        case 'store':
          if (Array.isArray(scope.storeIds) && scope.storeIds.length)
            qb.andWhere('o.storeId IN (:...storeIds)', { storeIds: scope.storeIds })
          else qb.andWhere('1=0')
          break
        case 'region':
          if (typeof scope.regionId === 'number')
            qb.andWhere('o.regionId = :regionId', { regionId: scope.regionId })
          break
        case 'brand':
          if (typeof scope.brandId === 'number')
            qb.andWhere('o.brandId = :brandId', { brandId: scope.brandId })
          break
        default:
          break
      }
    }

    // 搜索过滤
    if (query.customerName)
      qb.andWhere('o.customerName LIKE :customerName', {
        customerName: `%${String(query.customerName)}%`
      })
    if (query.customerPhone)
      qb.andWhere('o.customerPhone LIKE :customerPhone', {
        customerPhone: `%${String(query.customerPhone)}%`
      })
    if (query.opportunityLevel)
      qb.andWhere('o.opportunityLevel = :oppLevel', {
        oppLevel: String(query.opportunityLevel)
      })
    if (query.status) qb.andWhere('o.status = :status', { status: String(query.status) })
    if (Array.isArray(query.daterange) && query.daterange.length === 2) {
      const [start, end] = query.daterange
      qb.andWhere('o.latestVisitDate BETWEEN :start AND :end', {
        start: String(start),
        end: String(end)
      })
    }

    qb.orderBy('o.updatedAt', 'DESC')
    qb.skip((current - 1) * size)
    qb.take(size)

    const [rows, total] = await qb.getManyAndCount()

    const payload = {
      records: rows.map((r) => ({
        id: r.id,
        opportunityCode: r.opportunityCode || '',
        customerName: r.customerName,
        customerPhone: r.customerPhone,
        status: r.status,
        opportunityLevel: r.opportunityLevel,
        focusModelId: r.focusModelId,
        focusModelName: r.focusModelName,
        testDrive: !!r.testDrive,
        bargaining: !!r.bargaining,
        ownerId: r.ownerId,
        ownerName: r.ownerName || '',
        storeId: r.storeId,
        regionId: r.regionId,
        brandId: r.brandId,
        departmentId: r.departmentId,
        ownerDepartmentId: r.ownerDepartmentId,
        openDate: r.openDate,
        latestVisitDate: r.latestVisitDate,
        channelCategory: r.channelCategory,
        businessSource: r.businessSource,
        channelLevel1: r.channelLevel1,
        channelLevel2: r.channelLevel2,
        createdAt: (r.createdAt as any)?.toISOString?.() || ''
      })),
      total,
      current,
      size
    }

    return { code: 200, msg: 'ok', data: payload }
  }

  /** 保存/更新商机（不回写线索） */
  @UseGuards(JwtGuard)
  @Post('save')
  async save(@Req() req: any, @Body() body: any) {
    // 禁用新增，仅允许更新已有商机
    const id = body?.id !== undefined && body?.id !== null ? Number(body.id) : undefined
    if (typeof id !== 'number' || Number.isNaN(id)) {
      return { code: 400, msg: '不支持新增商机', data: false }
    }
    const saved = await this.opportunityService.upsertDirect(body)
    return { code: saved ? 200 : 404, msg: saved ? '保存成功' : '未找到该商机', data: !!saved }
  }

  /** 商机跟进记录列表：数据范围沿用商机列表 */
  @UseGuards(JwtGuard)
  @Get('follow/list')
  async followList(@Req() req: any, @Query() query: any) {
    const current = Math.max(1, Number(query.current || 1))
    const size = Math.max(1, Math.min(100, Number(query.size || 10)))
    const scope = await this.scopeService.getScope(req.user)
    const roles: string[] = Array.isArray(req.user?.roles) ? req.user.roles : []
    const isSales = roles.includes('R_SALES')
    const isSalesManager = roles.includes('R_SALES_MANAGER')

    const qb = this.followRepo.createQueryBuilder('f')
    qb.where('1=1')

    if (isSales && typeof scope.employeeId === 'number') {
      qb.andWhere('f.ownerId = :employeeId', { employeeId: scope.employeeId })
    } else if (isSalesManager && typeof scope.departmentId === 'number') {
      qb.andWhere('f.ownerDepartmentId = :deptId', { deptId: scope.departmentId })
      const ids = Array.isArray(scope.storeIds) ? scope.storeIds : []
      if (ids.length) qb.andWhere('f.storeId IN (:...storeIds)', { storeIds: ids })
    } else {
      switch (scope.level) {
        case 'all':
          break
        case 'self':
          if (typeof scope.employeeId === 'number')
            qb.andWhere('f.ownerId = :employeeId', { employeeId: scope.employeeId })
          break
        case 'department':
          if (typeof scope.departmentId === 'number')
            qb.andWhere('f.ownerDepartmentId = :deptId', { deptId: scope.departmentId })
          if (Array.isArray(scope.storeIds) && scope.storeIds.length)
            qb.andWhere('f.storeId IN (:...storeIds)', { storeIds: scope.storeIds })
          break
        case 'store':
          if (Array.isArray(scope.storeIds) && scope.storeIds.length)
            qb.andWhere('f.storeId IN (:...storeIds)', { storeIds: scope.storeIds })
          else qb.andWhere('1=0')
          break
        case 'region':
          if (typeof scope.regionId === 'number')
            qb.andWhere('f.regionId = :regionId', { regionId: scope.regionId })
          break
        case 'brand':
          if (typeof scope.brandId === 'number')
            qb.andWhere('f.brandId = :brandId', { brandId: scope.brandId })
          break
        default:
          break
      }
    }

    if (query.opportunityId) {
      const oppId = Number(query.opportunityId)
      if (!Number.isNaN(oppId) && oppId > 0) qb.andWhere('f.opportunityId = :oppId', { oppId })
    }
    if (query.method)
      qb.andWhere('f.method = :method', {
        method: String(query.method)
      })
    if (query.status)
      qb.andWhere('f.status = :status', {
        status: String(query.status)
      })
    if (query.keyword) {
      const kw = `%${String(query.keyword)}%`
      qb.andWhere(
        '(f.content LIKE :kw OR f.followResult LIKE :kw OR f.customerName LIKE :kw OR f.customerPhone LIKE :kw OR f.opportunityCode LIKE :kw)',
        { kw }
      )
    }

    qb.orderBy('f.createdAt', 'DESC')
    qb.skip((current - 1) * size)
    qb.take(size)

    const [rows, total] = await qb.getManyAndCount()

    const payload = {
      records: rows.map((r) => ({
        id: r.id,
        opportunityId: r.opportunityId,
        opportunityName: r.opportunityCode || '',
        content: r.content,
        followResult: r.followResult || '',
        nextContactTime: r.nextContactTime,
        status: r.status,
        method: r.method,
        createdAt: (r.createdAt as any)?.toISOString?.().replace('T', ' ').slice(0, 19) || ''
      })),
      total,
      current,
      size
    }

    return { code: 200, msg: 'ok', data: payload }
  }

  /** 新增商机跟进记录 */
  @UseGuards(JwtGuard)
  @Post('follow/save')
  async saveFollow(@Req() req: any, @Body() body: any) {
    const oppId = Number(body?.opportunityId)
    if (!oppId || Number.isNaN(oppId)) {
      return { code: 400, msg: '缺少有效的商机ID', data: false }
    }
    const opp = await this.repo.findOne({ where: { id: oppId } })
    if (!opp) {
      return { code: 404, msg: '商机不存在', data: false }
    }

    const scope = await this.scopeService.getScope(req.user)
    const roles: string[] = Array.isArray(req.user?.roles) ? req.user.roles : []
    const isSales = roles.includes('R_SALES')
    const isSalesManager = roles.includes('R_SALES_MANAGER')

    let allowed = false
    if (isSales && typeof scope.employeeId === 'number') {
      allowed = opp.ownerId === scope.employeeId
    } else if (isSalesManager && typeof scope.departmentId === 'number') {
      const storeIds = Array.isArray(scope.storeIds) ? scope.storeIds : []
      const inStore = !storeIds.length || storeIds.includes(opp.storeId)
      allowed = opp.ownerDepartmentId === scope.departmentId && inStore
    } else {
      switch (scope.level) {
        case 'all':
          allowed = true
          break
        case 'self':
          allowed = typeof scope.employeeId === 'number' && opp.ownerId === scope.employeeId
          break
        case 'department':
          allowed =
            typeof scope.departmentId === 'number' &&
            opp.ownerDepartmentId === scope.departmentId &&
            (!Array.isArray(scope.storeIds) ||
              !scope.storeIds.length ||
              scope.storeIds.includes(opp.storeId))
          break
        case 'store':
          allowed =
            Array.isArray(scope.storeIds) &&
            scope.storeIds.length > 0 &&
            scope.storeIds.includes(opp.storeId)
          break
        case 'region':
          allowed = typeof scope.regionId === 'number' && opp.regionId === scope.regionId
          break
        case 'brand':
          allowed = typeof scope.brandId === 'number' && opp.brandId === scope.brandId
          break
        default:
          allowed = false
          break
      }
    }

    if (!allowed) {
      return { code: 403, msg: '无权限操作该商机', data: false }
    }

    const content = String(body.content || '').trim()
    const followResult = String(body.followResult || '').trim() || null
    const nextContactTime = String(body.nextContactTime || '').trim()
    const status = String(body.status || '跟进中')
    const method = String(body.method || '电话')

    const follow = this.followRepo.create({
      opportunityId: opp.id,
      storeId: opp.storeId,
      regionId: opp.regionId || null,
      brandId: opp.brandId || null,
      ownerId: opp.ownerId || null,
      ownerName: opp.ownerName || null,
      ownerDepartmentId: opp.ownerDepartmentId || null,
      opportunityCode: opp.opportunityCode || null,
      customerName: opp.customerName,
      customerPhone: opp.customerPhone,
      content,
      followResult,
      nextContactTime,
      status,
      method,
      creatorEmployeeId: (scope as any)?.employeeId || null
    })

    const saved = await this.followRepo.save(follow)

    const record = {
      id: saved.id,
      opportunityId: saved.opportunityId,
      opportunityName: saved.opportunityCode || '',
      content: saved.content,
      followResult: saved.followResult || '',
      nextContactTime: saved.nextContactTime,
      status: saved.status,
      method: saved.method,
      createdAt: (saved.createdAt as any)?.toISOString?.().replace('T', ' ').slice(0, 19) || ''
    }

    return { code: 200, msg: '保存成功', data: record }
  }

  /** 删除商机跟进记录 */
  @UseGuards(JwtGuard)
  @Post('follow/delete')
  async deleteFollow(@Req() req: any, @Body() body: { id?: number }) {
    const id = Number(body?.id)
    if (!id || Number.isNaN(id)) {
      return { code: 400, msg: '缺少有效的跟进记录ID', data: false }
    }
    const follow = await this.followRepo.findOne({ where: { id } })
    if (!follow) {
      return { code: 404, msg: '跟进记录不存在', data: false }
    }

    const scope = await this.scopeService.getScope(req.user)
    const roles: string[] = Array.isArray(req.user?.roles) ? req.user.roles : []
    const isSales = roles.includes('R_SALES')
    const isSalesManager = roles.includes('R_SALES_MANAGER')

    let allowed = false
    if (isSales && typeof scope.employeeId === 'number') {
      allowed = follow.ownerId === scope.employeeId
    } else if (isSalesManager && typeof scope.departmentId === 'number') {
      const storeIds = Array.isArray(scope.storeIds) ? scope.storeIds : []
      const inStore = !storeIds.length || storeIds.includes(follow.storeId)
      allowed = follow.ownerDepartmentId === scope.departmentId && inStore
    } else {
      switch (scope.level) {
        case 'all':
          allowed = true
          break
        case 'self':
          allowed = typeof scope.employeeId === 'number' && follow.ownerId === scope.employeeId
          break
        case 'department':
          allowed =
            typeof scope.departmentId === 'number' &&
            follow.ownerDepartmentId === scope.departmentId &&
            (!Array.isArray(scope.storeIds) ||
              !scope.storeIds.length ||
              scope.storeIds.includes(follow.storeId))
          break
        case 'store':
          allowed =
            Array.isArray(scope.storeIds) &&
            scope.storeIds.length > 0 &&
            scope.storeIds.includes(follow.storeId)
          break
        case 'region':
          allowed = typeof scope.regionId === 'number' && follow.regionId === scope.regionId
          break
        case 'brand':
          allowed = typeof scope.brandId === 'number' && follow.brandId === scope.brandId
          break
        default:
          allowed = false
          break
      }
    }

    if (!allowed) {
      return { code: 403, msg: '无权限删除该跟进记录', data: false }
    }

    const res = await this.followRepo.delete(id)
    const ok = !!res.affected && res.affected > 0
    if (!ok) return { code: 500, msg: '删除失败', data: false }
    return { code: 200, msg: '删除成功', data: true }
  }

  /** 更新商机跟进结果（仅允许修改跟进结果字段） */
  @UseGuards(JwtGuard)
  @Post('follow/updateResult')
  async updateFollowResult(@Req() req: any, @Body() body: { id?: number; followResult?: string }) {
    const id = Number(body?.id)
    if (!id || Number.isNaN(id)) {
      return { code: 400, msg: '缺少有效的跟进记录ID', data: false }
    }
    const follow = await this.followRepo.findOne({ where: { id } })
    if (!follow) {
      return { code: 404, msg: '跟进记录不存在', data: false }
    }

    const scope = await this.scopeService.getScope(req.user)
    const roles: string[] = Array.isArray(req.user?.roles) ? req.user.roles : []
    const isSales = roles.includes('R_SALES')
    const isSalesManager = roles.includes('R_SALES_MANAGER')

    let allowed = false
    if (isSales && typeof scope.employeeId === 'number') {
      allowed = follow.ownerId === scope.employeeId
    } else if (isSalesManager && typeof scope.departmentId === 'number') {
      const storeIds = Array.isArray(scope.storeIds) ? scope.storeIds : []
      const inStore = !storeIds.length || storeIds.includes(follow.storeId)
      allowed = follow.ownerDepartmentId === scope.departmentId && inStore
    } else {
      switch (scope.level) {
        case 'all':
          allowed = true
          break
        case 'self':
          allowed = typeof scope.employeeId === 'number' && follow.ownerId === scope.employeeId
          break
        case 'department':
          allowed =
            typeof scope.departmentId === 'number' &&
            follow.ownerDepartmentId === scope.departmentId &&
            (!Array.isArray(scope.storeIds) ||
              !scope.storeIds.length ||
              scope.storeIds.includes(follow.storeId))
          break
        case 'store':
          allowed =
            Array.isArray(scope.storeIds) &&
            scope.storeIds.length > 0 &&
            scope.storeIds.includes(follow.storeId)
          break
        case 'region':
          allowed = typeof scope.regionId === 'number' && follow.regionId === scope.regionId
          break
        case 'brand':
          allowed = typeof scope.brandId === 'number' && follow.brandId === scope.brandId
          break
        default:
          allowed = false
          break
      }
    }

    if (!allowed) {
      return { code: 403, msg: '无权限编辑该跟进记录', data: false }
    }

    follow.followResult = String(body.followResult || '').trim() || null
    const saved = await this.followRepo.save(follow)

    const record = {
      id: saved.id,
      opportunityId: saved.opportunityId,
      opportunityName: saved.opportunityCode || '',
      content: saved.content,
      followResult: saved.followResult || '',
      nextContactTime: saved.nextContactTime,
      status: saved.status,
      method: saved.method,
      createdAt: (saved.createdAt as any)?.toISOString?.().replace('T', ' ').slice(0, 19) || ''
    }

    return { code: 200, msg: '更新成功', data: record }
  }

  /** 删除商机（仅管理员/超级管理员） */
  @UseGuards(JwtGuard)
  @Post('delete')
  async delete(@Req() req: any, @Body() body: { id?: number }) {
    const roles: string[] = Array.isArray(req?.user?.roles) ? req.user.roles : []
    const isAdmin = roles.includes('R_ADMIN') || roles.includes('R_SUPER')
    if (!isAdmin) {
      return { code: 403, msg: '无权限：仅管理员可删除商机', data: false }
    }
    const id = Number(body?.id)
    if (!id || Number.isNaN(id)) {
      return { code: 400, msg: '缺少有效的ID', data: false }
    }
    const res = await this.repo.delete(id)
    const ok = !!res.affected && res.affected > 0
    if (!ok) return { code: 404, msg: '未找到商机', data: false }
    return { code: 200, msg: '删除成功', data: true }
  }
}
