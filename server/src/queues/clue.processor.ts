import { Process, Processor } from '@nestjs/bull'
import { Job } from 'bull'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Clue } from '../clues/clue.entity'
import { Customer } from '../customers/customer.entity'
import { Channel } from '../channels/channel.entity'
import { ProductModel } from '../products/product-model.entity'
import { Employee } from '../employees/employee.entity'
import { Department } from '../departments/department.entity'
import { DataScopeService } from '../common/data-scope.service'
import { UserService } from '../users/user.service'
import { OpportunityService } from '../opportunities/opportunity.service'

@Processor('clue-processing')
export class ClueProcessor {
  constructor(
    @InjectRepository(Clue) private readonly repo: Repository<Clue>,
    @InjectRepository(Department) private readonly deptRepo: Repository<Department>,
    @InjectRepository(Customer) private readonly customerRepo: Repository<Customer>,
    @InjectRepository(Channel) private readonly channelRepo: Repository<Channel>,
    @InjectRepository(ProductModel) private readonly productModelRepo: Repository<ProductModel>,
    @InjectRepository(Employee) private readonly empRepo: Repository<Employee>,
    private readonly dataScopeService: DataScopeService,
    private readonly userService: UserService,
    private readonly opportunityService: OpportunityService
  ) {}

  @Process('save-clue')
  async processSaveClue(job: Job<any>) {
    const { user, body } = job.data
    // 统一布尔解析，避免字符串 "false" 被误判为 true
    const toBool = (v: any): boolean => {
      if (typeof v === 'boolean') return v
      const s = String(v ?? '').trim().toLowerCase()
      return ['1', 'true', 'yes', 'on'].includes(s)
    }

    // 这里复制并调整原save方法的逻辑
    const scope = await this.dataScopeService.getScope(user)
    const userId = Number(user?.sub)
    const currentUser = userId ? await this.userService.findById(userId) : null
    const employeeId = currentUser?.employeeId

    let storeId: number | undefined =
      typeof body.storeId === 'number' ? Number(body.storeId) : undefined

    if (!storeId) {
      if (Array.isArray(scope.storeIds) && scope.storeIds.length === 1) {
        storeId = scope.storeIds[0]
      } else if (typeof employeeId === 'number') {
        const self = await this.empRepo.findOne({ where: { id: employeeId } })
        if (self?.storeId) storeId = self.storeId
      }
      if (!storeId) {
        throw new Error('请指定线索归属门店')
      }
    }

    // 范围合规校验 (略，假设类似)
    // ...

    const storeDept = await this.deptRepo.findOne({ where: { id: storeId } })
    if (!storeDept || storeDept.type !== 'store') {
      throw new Error('归属门店必须为“门店”类型，请重新选择')
    }

    const { regionId, brandId } = await this.findAncestors(storeId)

    // 严格校验最小必填（新增时必须携带）
    const id = Number(body?.id || 0) || undefined
    const requiredMissing = !id && (!body.customerName || !body.customerPhone || !body.visitDate)
    if (requiredMissing) {
      throw new Error('缺少必填字段：客户姓名、客户电话、到店日期')
    }

    // ===== 编辑更新：带 id 时进行更新，保持与直存路径一致 =====
    if (id) {
      const existing = await this.repo.findOne({ where: { id } })
      if (!existing) throw new Error('线索不存在')

      // 范围校验
      if (!this.isInScope(existing, scope, employeeId)) {
        throw new Error('无权编辑该线索')
      }

      // 若门店变更，重新解析归属品牌/大区
      const targetStoreId = typeof body.storeId === 'number' ? Number(body.storeId) : existing.storeId
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

      Object.assign(existing, {
        visitDate: body.visitDate ? String(body.visitDate) : existing.visitDate,
        enterTime: body.enterTime ?? existing.enterTime,
        leaveTime: body.leaveTime ?? existing.leaveTime,
        receptionDuration:
          typeof body.receptionDuration === 'number' ? Number(body.receptionDuration) : existing.receptionDuration,
        visitorCount:
          typeof body.visitorCount === 'number' ? Number(body.visitorCount) : existing.visitorCount,
        receptionStatus: (body.receptionStatus as any) ?? existing.receptionStatus,
        salesConsultant: consultantName || existing.salesConsultant,
        salesConsultantId: salesConsultantIdResolved ?? existing.salesConsultantId,
        customerName: body.customerName ? String(body.customerName) : existing.customerName,
        customerPhone: body.customerPhone ? String(body.customerPhone) : existing.customerPhone,
        focusModelId:
          typeof body.focusModelId === 'number' ? Number(body.focusModelId) : existing.focusModelId,
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
        contactTimes: body.contactTimes !== undefined ? Number(body.contactTimes || 1) : existing.contactTimes,
        // 归属维度（门店变动时更新 brand/region）
        storeId: Number(targetStoreId),
        regionId: ancestors.regionId,
        brandId: ancestors.brandId
      })

      const saved = await this.repo.save(existing)
      try {
        await this.opportunityService.upsertFromClue(saved)
      } catch {}
      return
    }

    // 移除未使用的 livingArea
    // const livingArea = Array.isArray(body.livingArea)
    //   ? body.livingArea.join('/')
    //   : body.livingArea || ''

    // 解析销售顾问员工ID（仅限当前门店在职员工）
    const consultantName = String(body.salesConsultant || '').trim()
    let salesConsultantIdResolved: number | undefined
    if (consultantName) {
      const emp = await this.empRepo.findOne({
        where: { name: consultantName, storeId, status: '1' as any }
      })
      if (emp) salesConsultantIdResolved = emp.id
    }

    // 规范化客户
    let customerId: number | undefined
    const phone = String(body.customerPhone || '').trim()
    const name = String(body.customerName || '').trim() || '未命名客户'
    let customerRow: Customer | undefined
    if (phone) {
      const existCustomer = await this.customerRepo.findOne({ where: { phone, storeId, name } })
      if (existCustomer) {
        // 更新
        existCustomer.name = name || existCustomer.name
        // ... 其他字段更新
        customerRow = await this.customerRepo.save(existCustomer)
        customerId = customerRow.id
      } else {
        const created = this.customerRepo.create({
          name,
          phone,
          storeId: storeId!
          // ... 其他字段
        })
        customerRow = await this.customerRepo.save(created)
        customerId = customerRow.id
      }
    }

    // 规范化渠道
    // 移除重复的 let channelId
    let channelRow: Channel | undefined
    const channelId = await (async () => {
      const category = String(body.channelCategory || '线下')
      const src = String(body.businessSource || '自然到店')
      const lvl1 = body.channelLevel1 || ''
      const lvl2 = body.channelLevel2 || ''
      const compoundKey = `${category}|${src}|${lvl1}|${lvl2}`
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
      channelRow = await this.channelRepo.save(existChannel)
      return channelRow.id
    })()

    // 解析车型ID
    let focusModelIdResolved: number | undefined =
      typeof body.focusModelId === 'number' ? Number(body.focusModelId) : undefined
    let pm: ProductModel | null | undefined
    if (!focusModelIdResolved && body.focusModelName) {
      pm = await this.productModelRepo.findOne({
        where: { name: String(body.focusModelName) }
      })
      focusModelIdResolved = pm?.id
    }
    let dealModelIdResolved: number | undefined =
      typeof body.dealModelId === 'number' ? Number(body.dealModelId) : undefined
    let pm2: ProductModel | null | undefined
    if (!dealModelIdResolved && body.dealModelName) {
      pm2 = await this.productModelRepo.findOne({
        where: { name: String(body.dealModelName) }
      })
      dealModelIdResolved = pm2?.id
    }

    // 创建Clue实体
    const livingAreaStr = Array.isArray(body.livingArea)
      ? body.livingArea.join('/')
      : body.livingArea || ''
    const incoming: Partial<Clue> = {
      // 基础到店信息
      visitDate: String(body.visitDate || ''),
      enterTime: body.enterTime || undefined,
      leaveTime: body.leaveTime || undefined,
      receptionDuration: Number(body.receptionDuration || 0),
      visitorCount: Number(body.visitorCount || 1),
      receptionStatus: (body.receptionStatus as any) || 'sales',
      salesConsultant: body.salesConsultant || undefined,
      salesConsultantId: salesConsultantIdResolved,

      // 客户基础信息与画像（冗余）
      customerName: name,
      customerPhone: phone,
      userGender: (body.userGender as any) || '未知',
      userAge: Number(body.userAge || 0),
      buyExperience: (body.buyExperience as any) || '首购',
      userPhoneModel: body.userPhoneModel || undefined,
      currentBrand: body.currentBrand || undefined,
      currentModel: body.currentModel || undefined,
      carAge: Number(body.carAge || 0),
      mileage: Number(body.mileage || 0),
      livingArea: livingAreaStr || undefined,

      // 车型与成交标记（冗余 + 外键）
      focusModelId: focusModelIdResolved || undefined,
      focusModelName: body.focusModelName || pm?.name || undefined,
      testDrive: toBool(body.testDrive),
      bargaining: toBool(body.bargaining),
      dealDone: toBool(body.dealDone),
      dealModelId: dealModelIdResolved || undefined,
      dealModelName: body.dealModelName || pm2?.name || undefined,

      // 渠道与来源（冗余 + 外键）
      businessSource: String(body.businessSource || '自然到店'),
      channelCategory: String(body.channelCategory || '线下'),
      channelLevel1: body.channelLevel1 || undefined,
      channelLevel2: body.channelLevel2 || undefined,
      convertOrRetentionModel: body.convertOrRetentionModel || undefined,
      referrer: body.referrer || undefined,
      contactTimes: Number(body.contactTimes || 1),

      // 商机级别
      opportunityLevel: (body.opportunityLevel as any) || 'C',

      // 归属维度
      brandId,
      regionId,
      storeId,
      departmentId: typeof body.departmentId === 'number' ? Number(body.departmentId) : undefined,
      createdBy: typeof employeeId === 'number' ? employeeId : undefined,

      // 规范化外键
      customerId,
      channelId,

      // 快照对象
      customerSnapshot: customerRow
        ? {
            id: customerRow.id,
            name: customerRow.name,
            phone: customerRow.phone,
            gender: customerRow.gender,
            age: customerRow.age,
            buyExperience: customerRow.buyExperience,
            phoneModel: customerRow.phoneModel,
            currentBrand: customerRow.currentBrand,
            currentModel: customerRow.currentModel,
            carAge: customerRow.carAge,
            mileage: Number(customerRow.mileage || 0),
            livingArea: customerRow.livingArea,
            storeId: customerRow.storeId
          }
        : {
            name,
            phone,
            gender: (body.userGender as any) || '未知',
            age: Number(body.userAge || 0),
            buyExperience: (body.buyExperience as any) || '首购',
            phoneModel: body.userPhoneModel,
            currentBrand: body.currentBrand,
            currentModel: body.currentModel,
            carAge: Number(body.carAge || 0),
            mileage: Number(body.mileage || 0),
            livingArea: livingAreaStr || undefined,
            storeId
          },
      channelSnapshot: channelRow
        ? {
            id: channelRow.id,
            category: channelRow.category,
            businessSource: channelRow.businessSource,
            level1: channelRow.level1,
            level2: channelRow.level2,
            compoundKey: channelRow.compoundKey
          }
        : {
            category: String(body.channelCategory || '线下'),
            businessSource: String(body.businessSource || '自然到店'),
            level1: body.channelLevel1,
            level2: body.channelLevel2,
            compoundKey: `${String(body.channelCategory || '线下')}|${String(
              body.businessSource || '自然到店'
            )}|${body.channelLevel1 || ''}|${body.channelLevel2 || ''}`
          },
      productSnapshot: {
        focus: { id: focusModelIdResolved, name: body.focusModelName || pm?.name },
        deal: { id: dealModelIdResolved, name: body.dealModelName || pm2?.name }
      }
    }

    // 更新或新增
    let savedClue: Clue
    if (id) {
      const existing = await this.repo.findOne({ where: { id } })
      if (!existing) throw new Error('线索不存在')
      // 范围校验：复用 controller 的策略
      const inScope = this.isInScope(existing, scope, employeeId)
      if (!inScope) throw new Error('无权编辑该线索')
      Object.assign(existing, {
        ...incoming,
        // 保留创建人与创建时间
        createdBy: existing.createdBy,
        createdAt: existing.createdAt
      })
      savedClue = await this.repo.save(existing)
    } else {
      const clue = this.repo.create(incoming)
      savedClue = await this.repo.save(clue)
    }

    // 触发商机生成/更新（满足：首次到店创建；跟进中不重复创建；成交/战败后下次到店新建）
    try {
      await this.opportunityService.upsertFromClue(savedClue)
    } catch (e) {
      // 吞错以避免影响线索落库
    }

    return savedClue.id // 或其他结果
  }

  private async findAncestors(id: number): Promise<{ regionId?: number; brandId?: number }> {
    const ancestors: { regionId?: number; brandId?: number } = {}
    let current = await this.deptRepo.findOne({ where: { id } })
    while (current && typeof current.parentId === 'number') {
      const parent = await this.deptRepo.findOne({ where: { id: current.parentId } })
      if (!parent) break
      if (parent.type === 'region') ancestors.regionId = parent.id
      if (parent.type === 'brand') ancestors.brandId = parent.id
      current = parent
    }
    return ancestors
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
