import { Controller, Get, Post, Body, Query, Req, UseGuards, Inject } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, Like, Between, In } from 'typeorm'
import { JwtGuard } from '../auth/jwt.guard'
import { Opportunity } from '../opportunities/opportunity.entity'
import { OpportunityService } from '../opportunities/opportunity.service'
import { UserService } from '../users/user.service'
import { DataScopeService } from '../common/data-scope.service'

@Controller('api/opportunity')
export class OpportunityController {
  constructor(
    @InjectRepository(Opportunity) private readonly repo: Repository<Opportunity>,
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
          if (typeof scope.employeeId === 'number') whereBranches.push({ ownerId: scope.employeeId })
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
    if (query.status)
      qb.andWhere('o.status = :status', { status: String(query.status) })
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
}