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
    @Inject(UserService) private readonly userService: UserService
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
    // 获取用户与范围
    const scope = await this.dataScopeService.getScope(req.user)
    const userId = Number(req?.user?.sub)
    const user = userId ? await this.userService.findById(userId) : null
    const employeeId = user?.employeeId

    // 解析并校验归属门店
    let storeId: number | undefined =
      typeof body.storeId === 'number' ? Number(body.storeId) : undefined

    // 若未提供门店：优先在“可见范围唯一门店”与“本人归属门店”间自动填充
    if (!storeId) {
      if (Array.isArray(scope.storeIds) && scope.storeIds.length === 1) {
        storeId = scope.storeIds[0]
      } else if (typeof employeeId === 'number') {
        try {
          const self = await this.empRepo.findOne({ where: { id: employeeId } })
          if (self?.storeId) storeId = self.storeId
        } catch (err) {
          console.warn('resolve employee storeId failed', err)
        }
      }
      if (!storeId) {
        return { code: 400, msg: '请指定线索归属门店', data: false }
      }
    }

    // 范围合规校验
    if (scope.level === 'store' && Array.isArray(scope.storeIds) && scope.storeIds.length) {
      if (!scope.storeIds.includes(storeId)) {
        return { code: 403, msg: '无权保存到该门店', data: false }
      }
    }
    if (scope.level === 'region' && typeof scope.regionId === 'number') {
      const regionOk = await this.isStoreInRegion(storeId, scope.regionId)
      if (!regionOk) return { code: 403, msg: '门店不属于当前区域', data: false }
    }
    if (scope.level === 'brand' && typeof scope.brandId === 'number') {
      const brandOk = await this.isStoreInBrand(storeId, scope.brandId)
      if (!brandOk) return { code: 403, msg: '门店不属于当前品牌', data: false }
    }

    // 计算品牌/区域（根据门店沿父链）
    const { regionId, brandId } = await this.findAncestors(storeId)

    // 生成或更新记录
    const livingArea = Array.isArray(body.livingArea)
      ? (body.livingArea as any[]).join('/')
      : body.livingArea || ''

    // 规范化：落库客户与渠道并回填外键
    let customerId: number | undefined
    const phone = String(body.customerPhone || '').trim()
    const name = String(body.customerName || '').trim() || '未命名客户'
    if (phone) {
      const living = livingArea
      // 仍按门店+手机号+客户姓名三项查重
      const existCustomer = await this.customerRepo.findOne({ where: { phone, storeId, name } })
      if (existCustomer) {
        existCustomer.name = name || existCustomer.name
        existCustomer.gender = String(body.userGender || existCustomer.gender || '未知') as any
        existCustomer.age = Number(body.userAge ?? existCustomer.age ?? 0)
        existCustomer.buyExperience = String(
          body.buyExperience || existCustomer.buyExperience || '首购'
        ) as any
        existCustomer.phoneModel = body.userPhoneModel ?? existCustomer.phoneModel
        existCustomer.currentBrand = body.currentBrand ?? existCustomer.currentBrand
        existCustomer.currentModel = body.currentModel ?? existCustomer.currentModel
        existCustomer.carAge = Number(body.carAge ?? existCustomer.carAge ?? 0)
        existCustomer.mileage = Number(body.mileage ?? existCustomer.mileage ?? 0)
        existCustomer.livingArea = living ?? existCustomer.livingArea
        try {
          const saved = await this.customerRepo.save(existCustomer)
          customerId = saved.id
        } catch (err: any) {
          if (err?.code === 'ER_DUP_ENTRY') {
            return { code: 400, msg: '该门店手机号已存在', data: false }
          }
          throw err
        }
      } else {
        const created = this.customerRepo.create({
          name,
          phone,
          storeId: storeId!,
          gender: String(body.userGender || '未知') as any,
          age: Number(body.userAge || 0),
          buyExperience: String(body.buyExperience || '首购') as any,
          phoneModel: body.userPhoneModel || undefined,
          currentBrand: body.currentBrand || undefined,
          currentModel: body.currentModel || undefined,
          carAge: Number(body.carAge || 0),
          mileage: Number(body.mileage || 0),
          livingArea: living
        })
        try {
          const saved = await this.customerRepo.save(created)
          customerId = saved.id
        } catch (err: any) {
          if (err?.code === 'ER_DUP_ENTRY') {
            return { code: 400, msg: '该门店手机号已存在', data: false }
          }
          throw err
        }
      }
    }

    let channelId: number | undefined
    const category = String(body.channelCategory || '线下')
    const src = String(body.businessSource || '自然到店')
    const lvl1 = body.channelLevel1 || ''
    const lvl2 = body.channelLevel2 || ''
    const compoundKey = `${category}|${src}|${lvl1}|${lvl2}`
    {
      let existChannel = await this.channelRepo.findOne({ where: { compoundKey } })
      if (!existChannel) {
        existChannel = this.channelRepo.create({
          category,
          businessSource: src,
          level1: lvl1 || undefined,
          level2: lvl2 || undefined,
          compoundKey
        })
      }
      const saved = await this.channelRepo.save(existChannel)
      channelId = saved.id
    }

    // 解析车型ID：优先使用传入ID；否则根据名称查找
    let focusModelIdResolved: number | undefined =
      typeof body.focusModelId === 'number' ? Number(body.focusModelId) : undefined
    if (!focusModelIdResolved && body.focusModelName) {
      const pm = await this.productModelRepo.findOne({
        where: { name: String(body.focusModelName) }
      })
      focusModelIdResolved = pm?.id
    }
    let dealModelIdResolved: number | undefined =
      typeof body.dealModelId === 'number' ? Number(body.dealModelId) : undefined
    if (!dealModelIdResolved && body.dealModelName) {
      const pm2 = await this.productModelRepo.findOne({
        where: { name: String(body.dealModelName) }
      })
      dealModelIdResolved = pm2?.id
    }

    const incoming: Partial<Clue> = {
      visitDate: String(body.visitDate || ''),
      enterTime: body.enterTime || '',
      leaveTime: body.leaveTime || '',
      receptionDuration: Number(body.receptionDuration || 0),
      visitorCount: Number(body.visitorCount || 1),
      receptionStatus: String(body.receptionStatus || 'sales') as any,
      salesConsultant: body.salesConsultant || '',
      customerName: String(body.customerName || ''),
      visitPurpose: String(body.visitPurpose || '看车') as any,
      isAddWeChat: !!body.isAddWeChat,
      visitCategory: String(body.visitCategory || '首次') as any,
      customerPhone: String(body.customerPhone || ''),
      customerId,
      focusModelId: typeof focusModelIdResolved === 'number' ? focusModelIdResolved : undefined,
      focusModelName: body.focusModelName || '',
      testDrive: !!body.testDrive,
      bargaining: !!body.bargaining,
      dealDone: !!body.dealDone,
      dealModelId: typeof dealModelIdResolved === 'number' ? dealModelIdResolved : undefined,
      dealModelName: body.dealModelName || '',
      businessSource: category === '线下' && !src ? '自然到店' : src,
      channelCategory: category,
      channelLevel1: lvl1 || '',
      channelLevel2: lvl2 || '',
      channelId,
      convertOrRetentionModel: body.convertOrRetentionModel || '',
      referrer: body.referrer || '',
      contactTimes: Number(body.contactTimes || 1),
      opportunityLevel: String(body.opportunityLevel || 'H') as any,
      userGender: String(body.userGender || '未知') as any,
      userAge: Number(body.userAge || 0),
      buyExperience: String(body.buyExperience || '首购') as any,
      userPhoneModel: body.userPhoneModel || '',
      currentBrand: body.currentBrand || '',
      currentModel: body.currentModel || '',
      carAge: Number(body.carAge || 0),
      mileage: Number(body.mileage || 0),
      livingArea,
      storeId,
      regionId,
      brandId,
      departmentId: typeof body.departmentId === 'number' ? Number(body.departmentId) : undefined,
      createdBy: typeof employeeId === 'number' ? employeeId : undefined
    }

    // 业务校验：年龄与时间
    const ageNum = Number(body.userAge || 0)
    if (ageNum && ageNum < 18) {
      return { code: 400, msg: '使用者年龄必须大于等于18岁', data: false }
    }

    const toMin = (t: string) => {
      const m = String(t || '').trim()
      if (!m) return NaN
      const [hh, mm] = m.split(':')
      const h = Number(hh)
      const mi = Number(mm)
      if (!Number.isFinite(h) || !Number.isFinite(mi)) return NaN
      return h * 60 + mi
    }
    const enterMin = toMin(body.enterTime)
    const leaveMin = toMin(body.leaveTime)
    if (Number.isFinite(enterMin) && Number.isFinite(leaveMin)) {
      if (leaveMin < enterMin) {
        return { code: 400, msg: '离店时间不能早于进店时间', data: false }
      }
      incoming.receptionDuration = leaveMin - enterMin
      incoming.enterTime = String(body.enterTime || '')
      incoming.leaveTime = String(body.leaveTime || '')
    }

    if (body.id) {
      const id = Number(body.id)
      const exists = await this.repo.findOne({ where: { id } })
      if (!exists) return { code: 404, msg: '线索不存在', data: false }

      // 范围校验：仅允许在可见范围内改动
      if (!this.isInScope(exists, scope, employeeId)) {
        return { code: 403, msg: '无权修改该线索', data: false }
      }

      Object.assign(exists, incoming)
      await this.repo.save(exists)
    } else {
      const record = this.repo.create(incoming as any)
      await this.repo.save(record)
    }

    return { code: 200, msg: '保存成功', data: true }
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
