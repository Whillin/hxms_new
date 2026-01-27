import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Opportunity, OpportunityStatus } from './opportunity.entity'
import { Clue } from '../clues/clue.entity'
import { Employee } from '../employees/employee.entity'
import { EmployeeStoreLink } from '../employees/employee-store.entity'

@Injectable()
export class OpportunityService {
  constructor(
    @InjectRepository(Opportunity) private readonly repo: Repository<Opportunity>,
    @InjectRepository(Employee) private readonly empRepo: Repository<Employee>,
    @InjectRepository(EmployeeStoreLink)
    private readonly linkRepo: Repository<EmployeeStoreLink>
  ) {}

  /** 将线索转为商机：
   * - 若客户在门店下不存在商机，创建新的“跟进中”商机
   * - 若最近一个商机状态为“已战败/已成交”，创建新的“跟进中”商机
   * - 若最近一个商机状态为“跟进中”，仅更新最近来访日期与必要冗余
   */
  async upsertFromClue(clue: Clue): Promise<Opportunity | undefined> {
    const storeId = clue.storeId
    const customerId = clue.customerId
    const phone = String(clue.customerPhone || '').trim()
    const name = String(clue.customerName || '').trim() || '未命名客户'

    // 找到最近商机
    const latest = await this.repo.findOne({
      where: customerId ? { customerId, storeId } : ({ customerPhone: phone, storeId } as any),
      order: { createdAt: 'DESC' }
    })

    // 解析归属顾问（优先使用线索的销售顾问ID；未填写则不创建新商机）
    const owner = await this.resolveOwner(clue.salesConsultantId, storeId)

    // 决策是否创建新商机
    const needCreate = !latest || latest.status === '已战败' || latest.status === '已成交'

    if (needCreate) {
      // 未填写顾问或无法解析到当前门店在职顾问/上级时，不创建新商机
      if (!owner) return latest ?? undefined
      const opp = this.repo.create({
        opportunityCode: this.generateCode(storeId),
        customerId: customerId || undefined,
        customerName: name,
        customerPhone: phone,
        status: '跟进中',
        opportunityLevel: (clue.opportunityLevel as any) || 'C',
        focusModelId: clue.focusModelId || undefined,
        focusModelName: clue.focusModelName || undefined,
        testDrive: !!clue.testDrive,
        bargaining: !!clue.bargaining,
        ownerId: owner?.id,
        ownerName: owner?.name,
        storeId,
        regionId: clue.regionId || undefined,
        brandId: clue.brandId || undefined,
        departmentId: clue.departmentId || undefined,
        ownerDepartmentId: owner?.departmentId || undefined,
        openDate: clue.visitDate,
        latestVisitDate: clue.visitDate,
        // 同步客户画像
        buyExperience: clue.buyExperience || undefined,
        currentModel: clue.currentModel || undefined,
        carAge: clue.carAge || 0,
        livingArea: clue.livingArea || undefined,
        channelCategory: String(clue.channelCategory || '线下'),
        businessSource: String(clue.businessSource || '自然到店'),
        channelLevel1: clue.channelLevel1 || undefined,
        channelLevel2: clue.channelLevel2 || undefined
      })
      // 若线索已成交，则直接标记商机为“已成交”
      if (clue.dealDone) opp.status = '已成交'
      return await this.repo.save(opp)
    }

    // 更新最近来访与冗余字段
    latest.latestVisitDate = clue.visitDate
    if (name) latest.customerName = name
    if (phone) latest.customerPhone = phone
    if (customerId && !latest.customerId) latest.customerId = customerId
    latest.focusModelId = clue.focusModelId || latest.focusModelId
    latest.focusModelName = clue.focusModelName || latest.focusModelName
    latest.testDrive = !!clue.testDrive || latest.testDrive
    latest.bargaining = !!clue.bargaining || latest.bargaining
    // 同步客户画像
    latest.buyExperience = clue.buyExperience || latest.buyExperience
    latest.currentModel = clue.currentModel || latest.currentModel
    latest.carAge = clue.carAge || latest.carAge
    latest.livingArea = clue.livingArea || latest.livingArea
    // 若当前线索标记成交，则关闭该商机
    if (clue.dealDone) latest.status = '已成交'
    // 若顾问发生变化且能解析到员工，更新所有者
    if (owner?.id) {
      latest.ownerId = owner.id
      latest.ownerName = owner.name
      latest.ownerDepartmentId = owner.departmentId || latest.ownerDepartmentId
    }
    latest.channelCategory = String(clue.channelCategory || latest.channelCategory || '线下')
    latest.businessSource = String(clue.businessSource || latest.businessSource || '自然到店')
    latest.channelLevel1 = clue.channelLevel1 || latest.channelLevel1
    latest.channelLevel2 = clue.channelLevel2 || latest.channelLevel2
    return await this.repo.save(latest)
  }

  async getLatestStatus(params: {
    storeId: number
    customerName?: string
    customerPhone?: string
  }): Promise<OpportunityStatus | undefined> {
    const storeId = Number(params.storeId)
    const name = String(params.customerName || '').trim()
    const phone = String(params.customerPhone || '').trim()
    if (!Number.isFinite(storeId) || storeId <= 0 || !name || !phone) return undefined
    const latest = await this.repo.findOne({
      where: { storeId, customerName: name, customerPhone: phone },
      order: { createdAt: 'DESC' }
    })
    return latest?.status
  }

  /** 更新跟进中商机的客户画像信息 */
  async updateCustomerInfoForInProgress(params: {
    storeId: number
    customerName: string
    customerPhone: string
    info: {
      buyExperience?: string
      currentModel?: string
      carAge?: number
      livingArea?: string
    }
  }): Promise<boolean> {
    const storeId = Number(params.storeId)
    const name = String(params.customerName || '').trim()
    const phone = String(params.customerPhone || '').trim()
    if (!Number.isFinite(storeId) || storeId <= 0 || !name || !phone) return false

    const latest = await this.repo.findOne({
      where: { storeId, customerName: name, customerPhone: phone },
      order: { createdAt: 'DESC' }
    })

    if (latest && latest.status === '跟进中') {
      let changed = false
      const { buyExperience, currentModel, carAge, livingArea } = params.info

      if (buyExperience !== undefined && latest.buyExperience !== buyExperience) {
        latest.buyExperience = buyExperience as any
        changed = true
      }
      if (currentModel !== undefined && latest.currentModel !== currentModel) {
        latest.currentModel = currentModel
        changed = true
      }
      if (carAge !== undefined && latest.carAge !== carAge) {
        latest.carAge = carAge
        changed = true
      }
      if (livingArea !== undefined && latest.livingArea !== livingArea) {
        latest.livingArea = livingArea
        changed = true
      }

      if (changed) {
        await this.repo.save(latest)
        return true
      }
    }
    return false
  }

  /** 直接保存/更新商机（不依赖线索，不回写线索） */
  async upsertDirect(body: Record<string, any>): Promise<Opportunity | undefined> {
    const id = body?.id !== undefined && body?.id !== null ? Number(body.id) : undefined
    const storeId = Number(body.storeId || 0)
    const visitDate = String(body.visitDate || body.latestVisitDate || '')
    const status: OpportunityStatus =
      (String(body.latestStatus || body.status || '跟进中') as OpportunityStatus) || '跟进中'

    // 解析顾问（按名称+门店，限定在职）
    const consultantName = String(body.salesConsultant || body.ownerName || '').trim()
    let ownerResolved: { id?: number; name?: string; departmentId?: number } | undefined
    if (consultantName && storeId) {
      const emp = await this.empRepo.findOne({
        where: { name: consultantName, storeId, status: '1' as any }
      })
      if (emp)
        ownerResolved = { id: emp.id, name: emp.name, departmentId: (emp as any).departmentId }
      else ownerResolved = { name: consultantName }
    }

    // 更新：按ID保存可编辑字段（不变更 openDate/storeId/customerId）
    if (typeof id === 'number' && !Number.isNaN(id)) {
      const exist = await this.repo.findOne({ where: { id } })
      if (!exist) return undefined

      exist.customerName = String(body.customerName || exist.customerName)
      exist.customerPhone = String(body.customerPhone || exist.customerPhone)
      exist.status = status
      if (status === '已战败') {
        const rawFailReason = body.failReason ?? body.defeatReasons
        if (Array.isArray(rawFailReason)) {
          exist.failReason = rawFailReason
            .map((v: any) => String(v || '').trim())
            .filter(Boolean)
            .join('、')
        } else {
          const s = String(rawFailReason || '').trim()
          exist.failReason = s || undefined
        }
      } else {
        exist.failReason = undefined
      }
      exist.opportunityLevel =
        (String(body.opportunityLevel || exist.opportunityLevel) as any) || exist.opportunityLevel
      exist.focusModelId =
        typeof body.focusModelId === 'number' ? Number(body.focusModelId) : exist.focusModelId
      exist.focusModelName =
        body.focusModelName !== undefined
          ? String(body.focusModelName || '') || null
          : exist.focusModelName
      exist.testDrive = body.testDrive !== undefined ? !!body.testDrive : exist.testDrive
      exist.bargaining = body.bargaining !== undefined ? !!body.bargaining : exist.bargaining

      // 更新客户画像
      if (body.buyExperience !== undefined) exist.buyExperience = body.buyExperience
      if (body.currentModel !== undefined) exist.currentModel = body.currentModel
      if (body.carAge !== undefined) exist.carAge = Number(body.carAge)
      if (body.livingArea !== undefined) exist.livingArea = body.livingArea

      exist.latestVisitDate = visitDate || exist.latestVisitDate
      exist.channelCategory = String(body.channelCategory || exist.channelCategory || '线下')
      exist.businessSource = String(body.businessSource || exist.businessSource || '自然到店')
      exist.channelLevel1 = body.channelLevel1 || exist.channelLevel1
      exist.channelLevel2 = body.channelLevel2 || exist.channelLevel2
      if (ownerResolved) {
        exist.ownerId = ownerResolved.id ?? exist.ownerId
        exist.ownerName = ownerResolved.name ?? exist.ownerName
        exist.ownerDepartmentId = ownerResolved.departmentId ?? exist.ownerDepartmentId
      }
      if (!exist.opportunityCode && storeId > 0) {
        exist.opportunityCode = this.generateCode(storeId)
      }
      return await this.repo.save(exist)
    }

    // 已禁用新增：无有效ID时不执行创建
    return undefined
  }

  private async resolveOwner(
    consultantId: number | undefined,
    storeId: number
  ): Promise<Employee | undefined> {
    if (typeof consultantId !== 'number') return undefined
    const emp = await this.empRepo.findOne({ where: { id: consultantId } })
    if (!emp) return undefined
    const isInStore = Number(emp.storeId) === Number(storeId)
    const isActive = String(emp.status || '') === '1'
    if (isInStore && isActive) return emp

    // 顾问不在当前门店或已离职：尝试上级接管
    let supervisor: Employee | undefined
    if (typeof (emp as any).departmentId === 'number') {
      supervisor =
        (await this.empRepo.findOne({
          where: {
            role: 'R_SALES_MANAGER',
            departmentId: (emp as any).departmentId,
            storeId,
            status: '1' as any
          }
        })) ?? undefined
    }
    if (!supervisor) {
      supervisor =
        (await this.empRepo.findOne({
          where: { role: 'R_STORE_MANAGER', storeId, status: '1' as any }
        })) ?? undefined
    }
    return supervisor
  }

  private generateCode(storeId: number): string {
    const ts = new Date()
    const y = ts.getFullYear()
    const m = `${ts.getMonth() + 1}`.padStart(2, '0')
    const d = `${ts.getDate()}`.padStart(2, '0')
    const n = Math.floor(Math.random() * 9000) + 1000
    return `OP-${storeId}-${y}${m}${d}-${n}`
  }
}
