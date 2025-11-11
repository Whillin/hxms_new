import { Body, Controller, Get, Post, Query, Req, UseGuards, Inject } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, Like, Between, In } from 'typeorm'
import { JwtGuard } from '../auth/jwt.guard'
import { Clue } from '../clues/clue.entity'
import { DataScopeService } from '../common/data-scope.service'
import { Department } from '../departments/department.entity'
import { UserService } from '../users/user.service'
import { Customer } from '../customers/customer.entity'
import { Channel } from '../channels/channel.entity'
import { ProductModel } from '../products/product-model.entity'
import { Employee } from '../employees/employee.entity'
import { InjectQueue } from '@nestjs/bull'
import { Queue } from 'bull'
import { FeatureFlagsService } from '../common/feature-flags.service'

@Controller('api/clue')
export class ClueController {
  constructor(
    @InjectRepository(Clue) private readonly repo: Repository<Clue>,
    @InjectRepository(Department) private readonly deptRepo: Repository<Department>,
    @InjectRepository(Customer) private readonly customerRepo: Repository<Customer>,
    @InjectRepository(Channel) private readonly channelRepo: Repository<Channel>,
    @InjectRepository(ProductModel) private readonly productModelRepo: Repository<ProductModel>,
    @InjectRepository(Employee) private readonly empRepo: Repository<Employee>,
    @Inject(DataScopeService) private readonly dataScopeService: DataScopeService,
    @Inject(UserService) private readonly userService: UserService,
    @InjectQueue('clue-processing') private clueQueue: Queue,
    @Inject(FeatureFlagsService) private readonly features: FeatureFlagsService
  ) {}

  @UseGuards(JwtGuard)
  @Get('list')
  async list(@Req() req: any, @Query() query: any) {
    const current = Math.max(1, Number(query.current || 1))
    const size = Math.max(1, Math.min(100, Number(query.size || 10)))

    const scope = await this.dataScopeService.getScope(req.user)

    // 数据范围过滤
    const where: any = {}
    switch (scope.level) {
      case 'all':
        break
      case 'self':
        if (typeof scope.employeeId === 'number') where.createdBy = scope.employeeId
        break
      case 'department':
        if (typeof scope.departmentId === 'number') where.departmentId = scope.departmentId
        if (Array.isArray(scope.storeIds) && scope.storeIds.length)
          where.storeId = In(scope.storeIds)
        break
      case 'store':
        where.storeId = In(scope.storeIds || [])
        break
      case 'region':
        if (typeof scope.regionId === 'number') where.regionId = scope.regionId
        break
      case 'brand':
        if (typeof scope.brandId === 'number') where.brandId = scope.brandId
        break
      default:
        break
    }

    // 搜索过滤
    if (query.customerName) where.customerName = Like(`%${String(query.customerName)}%`)
    if (query.customerPhone) where.customerPhone = Like(`%${String(query.customerPhone)}%`)
    if (query.opportunityLevel) where.opportunityLevel = String(query.opportunityLevel)
    if (query.dealDone === 'true') where.dealDone = true
    if (query.dealDone === 'false') where.dealDone = false
    if (Array.isArray(query.daterange) && query.daterange.length === 2) {
      const [start, end] = query.daterange
      where.visitDate = Between(String(start), String(end))
    }

    const [records, total] = await this.repo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (current - 1) * size,
      take: size
    })

    const payload = {
      records: records.map((r) => ({
        id: r.id,
        visitDate: r.visitDate,
        enterTime: r.enterTime || '',
        leaveTime: r.leaveTime || '',
        receptionDuration: r.receptionDuration || 0,
        visitorCount: r.visitorCount || 1,
        receptionStatus: r.receptionStatus || 'sales',
        salesConsultant: r.salesConsultant || '',
        customerName: r.customerName,
        visitPurpose: r.visitPurpose || '看车',
        isAddWeChat:
          typeof (r as any).isAddWeChat === 'boolean'
            ? !!(r as any).isAddWeChat
            : !!(r as any).isReserved,
        visitCategory: r.visitCategory || '首次',
        customerPhone: r.customerPhone,
        focusModelId: r.focusModelId,
        focusModelName: r.focusModelName,
        testDrive: !!r.testDrive,
        bargaining: !!r.bargaining,
        dealDone: !!r.dealDone,
        dealModelId: r.dealModelId,
        dealModelName: r.dealModelName,
        businessSource: r.businessSource,
        channelCategory: r.channelCategory,
        channelLevel1: r.channelLevel1,
        channelLevel2: r.channelLevel2,
        convertOrRetentionModel: r.convertOrRetentionModel,
        referrer: r.referrer,
        contactTimes: r.contactTimes,
        opportunityLevel: r.opportunityLevel,
        userGender: r.userGender,
        userAge: r.userAge,
        buyExperience: r.buyExperience,
        userPhoneModel: r.userPhoneModel,
        currentBrand: r.currentBrand,
        currentModel: r.currentModel,
        carAge: r.carAge,
        mileage: Number(r.mileage || 0),
        livingArea: r.livingArea || '',
        customerSnapshot: (r as any).customerSnapshot || undefined,
        channelSnapshot: (r as any).channelSnapshot || undefined,
        productSnapshot: (r as any).productSnapshot || undefined,
        brandId: r.brandId,
        regionId: r.regionId,
        storeId: r.storeId,
        departmentId: r.departmentId,
        createdBy: r.createdBy,
        createdAt: (r.createdAt as any)?.toISOString?.() || ''
      })),
      total,
      current,
      size
    }

    return { code: 200, msg: 'ok', data: payload }
  }

  @UseGuards(JwtGuard)
  @Post('save')
  async save(@Req() req: any, @Body() body: any) {
    // 后端功能开关：QUEUE_SAVE_CLUE（默认启用）。
    // 当开关关闭时，走本地直存逻辑，便于本地开发无需 Redis。
    const useQueue = this.features.isEnabled('QUEUE_SAVE_CLUE', true)
    if (!useQueue) {
      // ===== 直存逻辑（最小必填字段） =====
      const userId = Number(req?.user?.sub)
      const currentUser = userId ? await this.userService.findById(userId) : null
      const employeeId = currentUser?.employeeId
      const { customerName, customerPhone, storeId, visitDate } = body || {}
      if (!customerName || !customerPhone || !storeId || !visitDate) {
        return { code: 400, msg: '缺少必填字段', data: false }
      }

      // 部门层级解析：获取品牌/大区
      const ancestors = await this.findAncestors(Number(storeId))

      // 客户表：如不存在则创建，存在则忽略
      let customer = await this.customerRepo.findOne({
        where: {
          storeId: Number(storeId),
          phone: String(customerPhone),
          name: String(customerName)
        }
      })
      if (!customer) {
        customer = this.customerRepo.create({
          storeId: Number(storeId),
          name: String(customerName),
          phone: String(customerPhone)
        })
        try {
          customer = await this.customerRepo.save(customer)
        } catch {
          // 并发或唯一约束冲突时，重新查询拿到记录
          customer = await this.customerRepo.findOne({
            where: {
              storeId: Number(storeId),
              phone: String(customerPhone),
              name: String(customerName)
            }
          })
        }
      }

      // 构建线索并保存
      const clue = this.repo.create({
        visitDate: String(visitDate),
        customerName: String(customerName),
        customerPhone: String(customerPhone),
        businessSource: String(body.businessSource || '自然到店'),
        channelCategory: String(body.channelCategory || '线下'),
        channelLevel1: body.channelLevel1 || undefined,
        channelLevel2: body.channelLevel2 || undefined,
        storeId: Number(storeId),
        regionId: ancestors.regionId,
        brandId: ancestors.brandId,
        departmentId: Number(storeId),
        customerId: customer?.id,
        opportunityLevel: String(body.opportunityLevel || 'B'),
        userGender: String(body.userGender || '未知') as any,
        userAge: Number(body.userAge || 0),
        buyExperience: String(body.buyExperience || '首购') as any,
        createdBy: typeof employeeId === 'number' ? employeeId : undefined
      })
      const saved = await this.repo.save(clue)
      return { code: 201, msg: '直存成功', data: { id: saved.id } }
    }

    // 队列路径：添加到后台处理
    await this.clueQueue.add('save-clue', { user: req.user, body })
    return { code: 200, msg: '线索保存任务已提交到后台处理', data: true }
  }

  @UseGuards(JwtGuard)
  @Post('delete')
  async delete(@Req() req: any, @Body() body: any) {
    const id = Number(body.id)
    if (!id) return { code: 400, msg: '缺少ID', data: false }

    const scope = await this.dataScopeService.getScope(req.user)
    const record = await this.repo.findOne({ where: { id } })
    if (!record) return { code: 404, msg: '线索不存在', data: false }

    const userId = Number(req?.user?.sub)
    const user = userId ? await this.userService.findById(userId) : null
    const employeeId = user?.employeeId

    if (!this.isInScope(record, scope, employeeId)) {
      return { code: 403, msg: '无权删除该线索', data: false }
    }

    await this.repo.delete(id)
    return { code: 200, msg: '删除成功', data: true }
  }

  // === 辅助方法 ===
  private async findAncestors(
    id: number
  ): Promise<{ storeId?: number; regionId?: number; brandId?: number }> {
    const getById = async (deptId: number) => await this.deptRepo.findOne({ where: { id: deptId } })
    let regionId: number | undefined
    let brandId: number | undefined
    let cur = await getById(id)
    const guard = new Set<number>()
    while (cur && typeof cur.parentId === 'number' && !guard.has(cur.parentId!)) {
      guard.add(cur.parentId!)
      const p = await getById(cur.parentId!)
      if (!p) break
      if (p.type === 'region') regionId = p.id
      if (p.type === 'brand') brandId = p.id
      cur = p
    }
    return { storeId: id, regionId, brandId }
  }

  private async isStoreInRegion(storeId: number, regionId: number): Promise<boolean> {
    const { regionId: r } = await this.findAncestors(storeId)
    return r === regionId
  }
  private async isStoreInBrand(storeId: number, brandId: number): Promise<boolean> {
    const { brandId: b } = await this.findAncestors(storeId)
    return b === brandId
  }
  private isInScope(record: Clue, scope: any, employeeId?: number | null): boolean {
    switch (scope.level) {
      case 'all':
        return true
      case 'self':
        return typeof employeeId === 'number' && record.createdBy === employeeId
      case 'department':
        return (
          (typeof scope.departmentId === 'number' && record.departmentId === scope.departmentId) ||
          (Array.isArray(scope.storeIds) && scope.storeIds.includes(record.storeId))
        )
      case 'store':
        return Array.isArray(scope.storeIds) && scope.storeIds.includes(record.storeId)
      case 'region':
        return typeof scope.regionId === 'number' && record.regionId === scope.regionId
      case 'brand':
        return typeof scope.brandId === 'number' && record.brandId === scope.brandId
      default:
        return false
    }
  }
}
