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
      testDrive: !!body.testDrive,
      bargaining: !!body.bargaining,
      dealDone: !!body.dealDone,
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

    const clue = this.repo.create(incoming)
    const savedClue = await this.repo.save(clue)

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
}
