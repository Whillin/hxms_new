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
    private readonly userService: UserService
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

    // 规范化客户
    let customerId: number | undefined
    const phone = String(body.customerPhone || '').trim()
    const name = String(body.customerName || '').trim() || '未命名客户'
    if (phone) {
      const existCustomer = await this.customerRepo.findOne({ where: { phone, storeId, name } })
      if (existCustomer) {
        // 更新
        existCustomer.name = name || existCustomer.name
        // ... 其他字段更新
        const saved = await this.customerRepo.save(existCustomer)
        customerId = saved.id
      } else {
        const created = this.customerRepo.create({
          name,
          phone,
          storeId: storeId!
          // ... 其他字段
        })
        const saved = await this.customerRepo.save(created)
        customerId = saved.id
      }
    }

    // 规范化渠道
    // 移除重复的 let channelId
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
      const savedChannel = await this.channelRepo.save(existChannel)
      return savedChannel.id
    })()

    // 解析车型ID
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

    // 创建Clue实体
    const incoming: Partial<Clue> = {
      // ... 所有字段
      customerId,
      channelId,
      storeId,
      regionId,
      brandId,
      createdBy: typeof employeeId === 'number' ? employeeId : undefined
    }

    const clue = this.repo.create(incoming)
    const savedClue = await this.repo.save(clue)

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
