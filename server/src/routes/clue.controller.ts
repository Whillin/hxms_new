import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UseGuards,
  Inject,
  Optional
} from '@nestjs/common'
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
import { EmployeeStoreLink } from '../employees/employee-store.entity'
import { InjectQueue } from '@nestjs/bull'
import { Queue } from 'bull'
import { FeatureFlagsService } from '../common/feature-flags.service'
import { OpportunityService } from '../opportunities/opportunity.service'
import { Opportunity } from '../opportunities/opportunity.entity'
import { OnlineChannel } from '../channels/online-channel.entity'

@Controller('api/clue')
export class ClueController {
  constructor(
    @InjectRepository(Clue) private readonly repo: Repository<Clue>,
    @InjectRepository(Department) private readonly deptRepo: Repository<Department>,
    @InjectRepository(Customer) private readonly customerRepo: Repository<Customer>,
    @InjectRepository(Channel) private readonly channelRepo: Repository<Channel>,
    @InjectRepository(ProductModel) private readonly productModelRepo: Repository<ProductModel>,
    @InjectRepository(Employee) private readonly empRepo: Repository<Employee>,
    @InjectRepository(EmployeeStoreLink)
    private readonly empLinkRepo: Repository<EmployeeStoreLink>,
    @Inject(DataScopeService) private readonly dataScopeService: DataScopeService,
    @Inject(UserService) private readonly userService: UserService,
    @Optional() @InjectQueue('clue-processing') private clueQueue: Queue | undefined,
    @Inject(FeatureFlagsService) private readonly features: FeatureFlagsService,
    @Inject(OpportunityService) private readonly oppService: OpportunityService,
    @InjectRepository(Opportunity) private readonly oppRepo: Repository<Opportunity>,
    @InjectRepository(OnlineChannel) private readonly onlineDictRepo: Repository<OnlineChannel>
  ) {}

  @UseGuards(JwtGuard)
  @Get('list')
  async list(@Req() req: any, @Query() query: any) {
    const current = Math.max(1, Number(query.current || 1))
    const size = Math.max(1, Math.min(100, Number(query.size || 10)))

    const scope = await this.dataScopeService.getScope(req.user)

    // 数据范围过滤（支持部门范围下“部门 OR 门店”的可见性）
    const whereClauses: any[] = []
    switch (scope.level) {
      case 'all':
        whereClauses.push({})
        break
      case 'self':
        if (typeof scope.employeeId === 'number') whereClauses.push({ createdBy: scope.employeeId })
        else whereClauses.push({})
        break
      case 'department': {
        if (typeof scope.departmentId === 'number')
          whereClauses.push({ departmentId: scope.departmentId })
        const ids = Array.isArray(scope.storeIds) ? scope.storeIds : []
        if (ids.length) whereClauses.push({ storeId: In(ids) })
        if (!whereClauses.length) whereClauses.push({})
        break
      }
      case 'store': {
        whereClauses.push({ storeId: In(scope.storeIds || []) })
        break
      }
      case 'region':
        if (typeof scope.regionId === 'number') whereClauses.push({ regionId: scope.regionId })
        else whereClauses.push({})
        break
      case 'brand':
        if (typeof scope.brandId === 'number') whereClauses.push({ brandId: scope.brandId })
        else whereClauses.push({})
        break
      default:
        whereClauses.push({})
        break
    }

    // 搜索过滤（同时应用到每个 OR 分支）
    const searchFilters: any = {}
    if (query.customerName) searchFilters.customerName = Like(`%${String(query.customerName)}%`)
    if (query.customerPhone) searchFilters.customerPhone = Like(`%${String(query.customerPhone)}%`)
    if (query.opportunityLevel) searchFilters.opportunityLevel = String(query.opportunityLevel)
    if (query.dealDone === 'true') searchFilters.dealDone = true
    if (query.dealDone === 'false') searchFilters.dealDone = false
    if (Array.isArray(query.daterange) && query.daterange.length === 2) {
      const [start, end] = query.daterange
      searchFilters.visitDate = Between(String(start), String(end))
    }

    const where = whereClauses.map((c) => ({ ...c, ...searchFilters }))

    const [records, total] = await this.repo.findAndCount({
      where: where.length === 1 ? where[0] : where,
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

  @Get('seed-online/open')
  async seedOnlineOpen(@Query() query: any) {
    const storeId = Number(query.storeId || 1)
    const date = String(query.date || new Date().toISOString().slice(0, 10))
    const count = Math.max(1, Number(query.count || 50))
    const dict = await this.onlineDictRepo.find({ where: { enabled: true } })
    // 选择一个当前门店在职员工作为默认顾问
    const owner = await this.empRepo.findOne({ where: { storeId, status: '1' as any } })
    const savedIds: number[] = []
    let seq = 0
    for (const ch of dict) {
      for (let i = 0; i < count; i++) {
        seq += 1
        const phone =
          `139${String(storeId).padStart(2, '0')}${String(ch.id).padStart(3, '0')}${String(i).padStart(4, '0')}`.slice(
            0,
            11
          )
        const clue = this.repo.create({
          visitDate: date,
          customerName: `测试用户${seq}`,
          customerPhone: phone,
          businessSource: '线上投放',
          channelCategory: '线上',
          channelLevel1: ch.level1,
          channelLevel2: ch.level2,
          storeId,
          salesConsultantId: owner?.id,
          opportunityLevel: 'B',
          userGender: '未知',
          userAge: 0,
          contactTimes: 1,
          visitCategory: i % 4 === 0 ? ('首次' as any) : ('再次' as any)
        } as Partial<Clue>)
        const saved = await this.repo.save(clue)
        savedIds.push(saved.id)
        try {
          const opp = this.oppRepo.create({
            customerId: saved.customerId,
            customerName: saved.customerName!,
            customerPhone: saved.customerPhone!,
            status: '跟进中',
            opportunityLevel: (saved.opportunityLevel as any) || 'C',
            focusModelId: saved.focusModelId || undefined,
            focusModelName: saved.focusModelName || undefined,
            testDrive: !!saved.testDrive,
            bargaining: !!saved.bargaining,
            ownerId: saved.salesConsultantId || undefined,
            ownerName: owner?.name || undefined,
            storeId,
            regionId: saved.regionId || undefined,
            brandId: saved.brandId || undefined,
            departmentId: saved.departmentId || undefined,
            ownerDepartmentId: undefined,
            openDate: saved.visitDate!,
            latestVisitDate: saved.visitDate!,
            channelCategory: '线上',
            businessSource: String(saved.businessSource || '线上投放'),
            channelLevel1: saved.channelLevel1 || undefined,
            channelLevel2: saved.channelLevel2 || undefined
          })
          await this.oppRepo.save(opp)
        } catch (err) {
          void err
        }
      }
    }
    return {
      code: 200,
      msg: 'ok',
      data: { storeId, date, channels: dict.length, perChannel: count, created: savedIds.length }
    }
  }

  /** 批量清理线上投放的测试线索及其对应商机（按门店与日期范围） */
  @UseGuards(JwtGuard)
  @Post('clear-seeded-online')
  async clearSeededOnline(@Req() req: any, @Body() body: any) {
    const storeId = Number(body.storeId || 0)
    const start = String(body.start || '').trim()
    const end = String(body.end || '').trim()
    if (!storeId || !start || !end)
      return { code: 400, msg: '缺少 storeId/start/end', data: { deletedClues: 0, deletedOpps: 0 } }

    const scope = await this.dataScopeService.getScope(req.user)
    const allowed = await this.dataScopeService.resolveAllowedStoreIds(scope)
    if (!allowed.includes(storeId))
      return { code: 403, msg: '无权访问该门店', data: { deletedClues: 0, deletedOpps: 0 } }

    const whereClues: any = {
      storeId,
      visitDate: Between(start, end),
      channelCategory: '线上',
      businessSource: '线上投放'
    }
    const clues = await this.repo.find({ where: whereClues })
    const phones = Array.from(new Set(clues.map((c) => String(c.customerPhone || '')))).filter(
      (p) => !!p
    )
    const clueIds = clues.map((c) => c.id)
    let deletedClues = 0
    if (clueIds.length) {
      await this.repo.delete(clueIds)
      deletedClues = clueIds.length
    }

    let deletedOpps = 0
    if (phones.length) {
      const qbOpp = this.oppRepo.createQueryBuilder('o')
      qbOpp.where('1=1')
      qbOpp.andWhere('o.storeId = :storeId', { storeId })
      qbOpp.andWhere('o.channelCategory = :online', { online: '线上' })
      qbOpp.andWhere('o.openDate BETWEEN :start AND :end', { start, end })
      qbOpp.andWhere('o.customerPhone IN (:...phones)', { phones })
      const opps = await qbOpp.getMany()
      const ids = opps.map((o) => o.id)
      if (ids.length) {
        await this.oppRepo.delete(ids)
        deletedOpps = ids.length
      }
    }

    return { code: 200, msg: '清理成功', data: { deletedClues, deletedOpps } }
  }

  /** 开放版清理（开发/演示用途） */
  @Post('clear-seeded-online/open')
  async clearSeededOnlineOpen(@Body() body: any) {
    const storeId = Number(body.storeId || 0)
    const start = String(body.start || '').trim()
    const end = String(body.end || '').trim()
    if (!storeId || !start || !end)
      return { code: 400, msg: '缺少 storeId/start/end', data: { deletedClues: 0, deletedOpps: 0 } }

    const whereClues: any = {
      storeId,
      visitDate: Between(start, end),
      channelCategory: '线上',
      businessSource: '线上投放'
    }
    const clues = await this.repo.find({ where: whereClues })
    const phones = Array.from(new Set(clues.map((c) => String(c.customerPhone || '')))).filter(
      (p) => !!p
    )
    const clueIds = clues.map((c) => c.id)
    let deletedClues = 0
    if (clueIds.length) {
      await this.repo.delete(clueIds)
      deletedClues = clueIds.length
    }

    let deletedOpps = 0
    if (phones.length) {
      const qbOpp = this.oppRepo.createQueryBuilder('o')
      qbOpp.where('1=1')
      qbOpp.andWhere('o.storeId = :storeId', { storeId })
      qbOpp.andWhere('o.channelCategory = :online', { online: '线上' })
      qbOpp.andWhere('o.openDate BETWEEN :start AND :end', { start, end })
      qbOpp.andWhere('o.customerPhone IN (:...phones)', { phones })
      const opps = await qbOpp.getMany()
      const ids = opps.map((o) => o.id)
      if (ids.length) {
        await this.oppRepo.delete(ids)
        deletedOpps = ids.length
      }
    }

    return { code: 200, msg: '清理成功', data: { deletedClues, deletedOpps } }
  }

  @Get('clear-seeded-online/open')
  async clearSeededOnlineOpenGet(@Query() query: any) {
    const body = {
      storeId: Number(query.storeId || 0),
      start: String(query.start || ''),
      end: String(query.end || '')
    }
    return await this.clearSeededOnlineOpen(body)
  }

  @UseGuards(JwtGuard)
  @Post('save')
  async save(@Req() req: any, @Body() body: any) {
    // 统一布尔解析，避免字符串 "false" 被误判为 true
    const toBool = (v: any): boolean => {
      if (typeof v === 'boolean') return v
      const s = String(v ?? '')
        .trim()
        .toLowerCase()
      return ['1', 'true', 'yes', 'on'].includes(s)
    }
    // 后端功能开关：QUEUE_SAVE_CLUE（默认启用）。
    // 当开关关闭时，走本地直存逻辑，便于本地开发无需 Redis。
    const useQueue = this.features.isEnabled('QUEUE_SAVE_CLUE', true) && !!this.clueQueue
    if (!useQueue) {
      // ===== 直存逻辑（严格校验 + 支持编辑更新） =====
      const userId = Number(req?.user?.sub)
      const currentUser = userId ? await this.userService.findById(userId) : null
      const employeeId = currentUser?.employeeId

      const id = Number(body?.id || 0) || undefined
      const { customerName, customerPhone, storeId, visitDate } = body || {}

      // 基础必填校验（新增必须；编辑建议也携带）
      if (!id && (!customerName || !customerPhone || !storeId || !visitDate)) {
        return { code: 400, msg: '缺少必填字段', data: false }
      }

      // 编辑更新：带 id 时走更新路径（包含范围校验）
      if (id) {
        const existing = await this.repo.findOne({ where: { id } })
        if (!existing) return { code: 404, msg: '线索不存在', data: false }

        const scope = await this.dataScopeService.getScope(req.user)
        if (!this.isInScope(existing, scope, employeeId)) {
          return { code: 403, msg: '无权编辑该线索', data: false }
        }

        // 若变更门店，重新解析归属品牌/大区
        const targetStoreId = typeof storeId === 'number' ? Number(storeId) : existing.storeId
        const ancestors = await this.findAncestors(Number(targetStoreId))

        // 解析销售顾问ID（仅当前门店在职员工）
        const consultantName = String(body.salesConsultant || '').trim()
        let salesConsultantIdResolved: number | undefined
        if (consultantName) {
          const emp = await this.empRepo.findOne({
            where: { name: consultantName, storeId: Number(targetStoreId), status: '1' as any }
          })
          if (emp) salesConsultantIdResolved = emp.id
        }

        // 合并可编辑字段（保留 createdBy）
        Object.assign(existing, {
          visitDate: visitDate ? String(visitDate) : existing.visitDate,
          enterTime: body.enterTime ?? existing.enterTime,
          leaveTime: body.leaveTime ?? existing.leaveTime,
          receptionDuration:
            typeof body.receptionDuration === 'number'
              ? Number(body.receptionDuration)
              : existing.receptionDuration,
          visitorCount:
            typeof body.visitorCount === 'number'
              ? Number(body.visitorCount)
              : existing.visitorCount,
          receptionStatus: (body.receptionStatus as any) ?? existing.receptionStatus,
          salesConsultant: consultantName || existing.salesConsultant,
          salesConsultantId: salesConsultantIdResolved ?? existing.salesConsultantId,
          customerName: customerName ? String(customerName) : existing.customerName,
          customerPhone: customerPhone ? String(customerPhone) : existing.customerPhone,
          focusModelId:
            typeof body.focusModelId === 'number'
              ? Number(body.focusModelId)
              : existing.focusModelId,
          focusModelName: body.focusModelName ?? existing.focusModelName,
          testDrive: body.testDrive !== undefined ? toBool(body.testDrive) : existing.testDrive,
          bargaining: body.bargaining !== undefined ? toBool(body.bargaining) : existing.bargaining,
          dealDone: body.dealDone !== undefined ? toBool(body.dealDone) : existing.dealDone,
          dealModelId:
            typeof body.dealModelId === 'number' ? Number(body.dealModelId) : existing.dealModelId,
          dealModelName: body.dealModelName ?? existing.dealModelName,
          businessSource: String(body.businessSource || existing.businessSource || '自然到店'),
          channelCategory: String(body.channelCategory || existing.channelCategory || '线下'),
          channelLevel1: body.channelLevel1 ?? existing.channelLevel1,
          channelLevel2: body.channelLevel2 ?? existing.channelLevel2,
          opportunityLevel: (body.opportunityLevel as any) ?? existing.opportunityLevel,
          userGender: (body.userGender as any) ?? existing.userGender,
          userAge: typeof body.userAge === 'number' ? Number(body.userAge) : existing.userAge,
          buyExperience: (body.buyExperience as any) ?? existing.buyExperience,
          // 客户画像与附加字段
          userPhoneModel: body.userPhoneModel ?? existing.userPhoneModel,
          currentBrand: body.currentBrand ?? existing.currentBrand,
          currentModel: body.currentModel ?? existing.currentModel,
          carAge: body.carAge !== undefined ? Number(body.carAge || 0) : existing.carAge,
          mileage: body.mileage !== undefined ? Number(body.mileage || 0) : existing.mileage,
          livingArea:
            body.livingArea !== undefined
              ? Array.isArray(body.livingArea)
                ? (body.livingArea as any[]).join('/')
                : String(body.livingArea)
              : existing.livingArea,
          convertOrRetentionModel: body.convertOrRetentionModel ?? existing.convertOrRetentionModel,
          referrer: body.referrer ?? existing.referrer,
          contactTimes:
            body.contactTimes !== undefined
              ? Number(body.contactTimes || 1)
              : existing.contactTimes,
          // 归属维度（门店变动时更新 brand/region）
          storeId: Number(targetStoreId),
          regionId: ancestors.regionId,
          brandId: ancestors.brandId
        })

        const saved = await this.repo.save(existing)
        try {
          await this.oppService.upsertFromClue(saved)
        } catch (err) {
          console.error('[ClueController] upsertFromClue failed on update:', err)
        }
        return { code: 200, msg: '更新成功', data: true }
      }

      const sid = Number(storeId)
      if (!Number.isFinite(sid) || sid <= 0) {
        return { code: 400, msg: '缺少或无效的门店ID', data: false }
      }
      const storeDept = await this.deptRepo.findOne({ where: { id: sid } })
      if (!storeDept || storeDept.type !== 'store') {
        return { code: 400, msg: '归属门店必须为“门店”类型', data: false }
      }
      const ancestors = await this.findAncestors(sid)

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
          phone: String(customerPhone),
          gender: (body.userGender || '未知') as any,
          age: Number(body.userAge || 0),
          buyExperience: (body.buyExperience || '首购') as any,
          phoneModel: body.userPhoneModel || undefined,
          currentBrand: body.currentBrand || undefined,
          currentModel: body.currentModel || undefined,
          carAge: Number(body.carAge || 0),
          mileage: Number(body.mileage || 0),
          livingArea: Array.isArray(body.livingArea)
            ? (body.livingArea as any[]).join('/')
            : String(body.livingArea || '')
        })
        try {
          customer = await this.customerRepo.save(customer)
        } catch {
          customer = await this.customerRepo.findOne({
            where: {
              storeId: Number(storeId),
              phone: String(customerPhone),
              name: String(customerName)
            }
          })
        }
      }
      if (customer) {
        customer.gender = (body.userGender as any) ?? customer.gender
        customer.age = typeof body.userAge === 'number' ? Number(body.userAge) : customer.age
        customer.buyExperience = (body.buyExperience as any) ?? customer.buyExperience
        customer.phoneModel = body.userPhoneModel ?? customer.phoneModel
        customer.currentBrand = body.currentBrand ?? customer.currentBrand
        customer.currentModel = body.currentModel ?? customer.currentModel
        customer.carAge = body.carAge !== undefined ? Number(body.carAge || 0) : customer.carAge
        customer.mileage = body.mileage !== undefined ? Number(body.mileage || 0) : customer.mileage
        customer.livingArea = Array.isArray(body.livingArea)
          ? (body.livingArea as any[]).join('/')
          : String(body.livingArea || customer.livingArea || '')
        await this.customerRepo.save(customer)
      }

      // 构建线索并保存（确保类型与实体声明匹配）
      // 解析销售顾问ID（仅当前门店在职员工）
      const consultantName = String(body.salesConsultant || '').trim()
      let salesConsultantIdResolved: number | undefined
      if (consultantName) {
        const emp = await this.empRepo.findOne({
          where: { name: consultantName, storeId: Number(storeId), status: '1' as any }
        })
        if (emp) salesConsultantIdResolved = emp.id
      }

      const clue = this.repo.create({
        visitDate: String(visitDate),
        customerName: String(customerName),
        customerPhone: String(customerPhone),
        salesConsultant: consultantName || undefined,
        salesConsultantId: salesConsultantIdResolved,
        // 门店接待与到店信息
        enterTime: body.enterTime ? String(body.enterTime) : undefined,
        leaveTime: body.leaveTime ? String(body.leaveTime) : undefined,
        receptionDuration:
          body.receptionDuration !== undefined ? Number(body.receptionDuration || 0) : undefined,
        visitorCount: body.visitorCount !== undefined ? Number(body.visitorCount || 1) : undefined,
        receptionStatus: (body.receptionStatus as any) || 'sales',
        // 关注/成交相关字段（直存路径补齐，确保商机可根据成交直接闭环）
        focusModelId: typeof body.focusModelId === 'number' ? Number(body.focusModelId) : undefined,
        focusModelName: body.focusModelName ? String(body.focusModelName) : undefined,
        testDrive: toBool(body.testDrive),
        bargaining: toBool(body.bargaining),
        dealDone: toBool(body.dealDone),
        dealModelId: typeof body.dealModelId === 'number' ? Number(body.dealModelId) : undefined,
        dealModelName: body.dealModelName ? String(body.dealModelName) : undefined,
        businessSource: String(body.businessSource || '自然到店'),
        channelCategory: String(body.channelCategory || '线下'),
        channelLevel1: body.channelLevel1 || undefined,
        channelLevel2: body.channelLevel2 || undefined,
        storeId: Number(storeId),
        regionId: ancestors.regionId,
        brandId: ancestors.brandId,
        // 若无明确部门，小组可为空
        departmentId: undefined,
        customerId: customer?.id,
        opportunityLevel: (body.opportunityLevel || 'B') as 'H' | 'A' | 'B' | 'C' | 'O',
        userGender: (body.userGender || '未知') as '男' | '女' | '未知',
        userAge: Number(body.userAge || 0),
        buyExperience: (body.buyExperience || '首购') as '首购' | '换购' | '增购',
        // 客户画像与附加字段
        userPhoneModel: body.userPhoneModel || undefined,
        currentBrand: body.currentBrand || undefined,
        currentModel: body.currentModel || undefined,
        carAge: body.carAge !== undefined ? Number(body.carAge || 0) : undefined,
        mileage: body.mileage !== undefined ? Number(body.mileage || 0) : undefined,
        livingArea:
          body.livingArea !== undefined
            ? Array.isArray(body.livingArea)
              ? (body.livingArea as any[]).join('/')
              : String(body.livingArea)
            : undefined,
        convertOrRetentionModel: body.convertOrRetentionModel || undefined,
        referrer: body.referrer || undefined,
        contactTimes: body.contactTimes !== undefined ? Number(body.contactTimes || 1) : undefined,
        createdBy: typeof employeeId === 'number' ? employeeId : undefined
      } as Partial<Clue>)
      const saved = await this.repo.save(clue)
      // 触发商机生成/更新
      try {
        await this.oppService.upsertFromClue(saved)
      } catch (e) {
        console.error('[ClueController] upsertFromClue failed on create:', e)
      }
      // 统一返回码为 200；前端 fetchSaveClue 采用 boolean 作为成功标记
      return { code: 200, msg: '保存成功', data: true }
    }

    // 队列路径：添加到后台处理（队列可能未初始化，需保护性检查）
    if (!this.clueQueue) {
      return { code: 200, msg: '队列未初始化，已走直存路径', data: true }
    }
    await this.clueQueue.add('save-clue', { user: req.user, body })
    return { code: 200, msg: '线索保存任务已提交到后台处理', data: true }
  }

  @UseGuards(JwtGuard)
  @Get('weekly-visit-count')
  async weeklyVisitCount(@Req() req: any, @Query() query: any) {
    const scope = await this.dataScopeService.getScope(req.user)
    const allowed = await this.dataScopeService.resolveAllowedStoreIds(scope)
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
    const fmt = (d: Date) => d.toISOString().slice(0, 10)
    const whereCur: any = { visitDate: Between(fmt(monday), fmt(sunday)) }
    const wherePrev: any = { visitDate: Between(fmt(prevMonday), fmt(prevSunday)) }
    if (storeId) {
      if (scope.level !== 'all' && (!allowed.length || !allowed.includes(storeId))) {
        return { code: 403, msg: '无权访问该门店', data: { count: 0, changePercent: 0 } }
      }
      whereCur.storeId = storeId
      wherePrev.storeId = storeId
    } else if (allowed.length) {
      whereCur.storeId = In(allowed)
      wherePrev.storeId = In(allowed)
    }
    const cur = await this.repo.count({ where: whereCur })
    const prev = await this.repo.count({ where: wherePrev })
    const changePercent = prev === 0 ? (cur > 0 ? 100 : 0) : Math.round(((cur - prev) / prev) * 100)
    return { code: 200, msg: 'ok', data: { count: cur, changePercent } }
  }

  @UseGuards(JwtGuard)
  @Get('weekly-click-count')
  async weeklyClickCount(@Req() req: any, @Query() query: any) {
    const scope = await this.dataScopeService.getScope(req.user)
    const allowed = await this.dataScopeService.resolveAllowedStoreIds(scope)
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
    const fmt = (d: Date) => d.toISOString().slice(0, 10)
    const whereCur: any = { visitDate: Between(fmt(monday), fmt(sunday)) }
    const wherePrev: any = { visitDate: Between(fmt(prevMonday), fmt(prevSunday)) }
    if (storeId) {
      if (scope.level !== 'all' && (!allowed.length || !allowed.includes(storeId))) {
        return { code: 403, msg: '无权访问该门店', data: { count: 0, changePercent: 0 } }
      }
      whereCur.storeId = storeId
      wherePrev.storeId = storeId
    } else if (allowed.length) {
      whereCur.storeId = In(allowed)
      wherePrev.storeId = In(allowed)
    }
    const rowsCur = await this.repo.find({ where: whereCur })
    const rowsPrev = await this.repo.find({ where: wherePrev })
    const sum = (arr: Clue[]) => arr.reduce((s, r) => s + Number(r.contactTimes || 0), 0)
    const cur = sum(rowsCur)
    const prev = sum(rowsPrev)
    const changePercent = prev === 0 ? (cur > 0 ? 100 : 0) : Math.round(((cur - prev) / prev) * 100)
    return { code: 200, msg: 'ok', data: { count: cur, changePercent } }
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

  /** 邀约专员选项（按门店） */
  @UseGuards(JwtGuard)
  @Get('inviter-options')
  async inviterOptions(@Req() req: any, @Query() query: any) {
    const storeId = Number(query.storeId || 0)
    if (!storeId) return { code: 400, msg: '缺少 storeId', data: [] }

    const scope = await this.dataScopeService.getScope(req.user)
    const allowed = await this.dataScopeService.resolveAllowedStoreIds(scope)
    if (allowed.length && !allowed.includes(storeId))
      return { code: 403, msg: '无权访问该门店', data: [] }

    const primaryRoles = ['R_APPOINTMENT', 'R_FRONT_DESK']
    const fallbackRoles = ['R_SALES', 'R_SALES_MANAGER', 'R_STORE_MANAGER']

    // 直接在门店的邀约专员/前台
    const directPrimary = await this.empRepo.find({
      where: { storeId, status: '1' as any, role: In(primaryRoles) }
    })

    // 链接到门店的邀约专员/前台
    const links = await this.empLinkRepo.find({ where: { storeId } })
    const linkIds = Array.from(
      new Set(links.map((l) => Number(l.employeeId)).filter((n) => Number.isFinite(n)))
    )
    let linkedPrimary: Employee[] = []
    if (linkIds.length)
      linkedPrimary = await this.empRepo.find({
        where: { id: In(linkIds), status: '1' as any, role: In(primaryRoles) }
      })

    const map = new Map<number, Employee>()
    for (const e of directPrimary) map.set(Number(e.id), e)
    for (const e of linkedPrimary) map.set(Number(e.id), e)
    let all = Array.from(map.values())

    // 若没有邀约专员/前台，兜底返回在职销售相关角色
    if (all.length === 0) {
      const directFallback = await this.empRepo.find({
        where: { storeId, status: '1' as any, role: In(fallbackRoles) }
      })
      let linkedFallback: Employee[] = []
      if (linkIds.length)
        linkedFallback = await this.empRepo.find({
          where: { id: In(linkIds), status: '1' as any, role: In(fallbackRoles) }
        })

      map.clear()
      for (const e of directFallback) map.set(Number(e.id), e)
      for (const e of linkedFallback) map.set(Number(e.id), e)
      all = Array.from(map.values())
    }

    const options = all.map((e) => ({ label: e.name, value: e.name }))
    return { code: 200, msg: 'ok', data: options }
  }

  @UseGuards(JwtGuard)

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
