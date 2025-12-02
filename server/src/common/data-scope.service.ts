import { Injectable, Inject } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, In } from 'typeorm'
import { Employee } from '../employees/employee.entity'
import { EmployeeStoreLink } from '../employees/employee-store.entity'
import { Department } from '../departments/department.entity'
import { UserService } from '../users/user.service'

export type ScopeLevel = 'all' | 'brand' | 'region' | 'store' | 'self' | 'department'

export interface DataScope {
  level: ScopeLevel
  brandId?: number
  regionId?: number
  storeIds?: number[]
  employeeId?: number
  departmentId?: number
}

@Injectable()
export class DataScopeService {
  constructor(
    @Inject(UserService) private readonly userService: UserService,
    @InjectRepository(Employee) private readonly empRepo: Repository<Employee>,
    @InjectRepository(EmployeeStoreLink) private readonly linkRepo: Repository<EmployeeStoreLink>,
    @InjectRepository(Department) private readonly deptRepo: Repository<Department>
  ) {}

  async getScope(user: any): Promise<DataScope> {
    const roles: string[] = Array.isArray(user?.roles) ? user.roles : []
    const userId: number = Number(user?.sub)
    const isAdmin =
      roles.includes('R_ADMIN') || roles.includes('R_SUPER') || roles.includes('R_INFO')
    if (isAdmin) return { level: 'all' }

    if (!userId || Number.isNaN(userId)) return { level: 'self' }

    const record = await this.userService.findById(userId)
    try {
      // 仅调试：输出用户与角色

      console.log('[DataScopeService.getScope]', { userId, roles, employeeId: record?.employeeId })
    } catch (e) {
      // swallow non-fatal logging errors
      void e
    }
    const employeeId = record?.employeeId
    if (!employeeId) return { level: 'self' }

    const self = await this.empRepo.findOne({ where: { id: employeeId } })
    if (!self) return { level: 'self', employeeId }

    // 销售顾问：严格按“本人”可见，避免门店范围导致越权
    if (roles.includes('R_SALES')) {
      return { level: 'self', employeeId }
    }

    // 前台/邀约专员：门店层级（支持多门店）；若无门店归属则兜底到“本人”
    if (roles.includes('R_FRONT_DESK') || roles.includes('R_APPOINTMENT')) {
      const storeIds = await this.collectStoreIds(self.id, self.storeId)
      if (storeIds.length) return { level: 'store', storeIds }
      return { level: 'self', employeeId }
    }

    // 销售经理：部门（小组）维度
    if (roles.includes('R_SALES_MANAGER') && typeof self.departmentId === 'number') {
      const storeIds = await this.collectStoreIds(self.id, self.storeId)
      return { level: 'department', departmentId: self.departmentId, storeIds }
    }

    // 区域总经理
    if (roles.includes('R_REGION_GM') && typeof self.regionId === 'number') {
      return { level: 'region', regionId: self.regionId }
    }

    // 品牌总经理
    if (roles.includes('R_BRAND_GM') && typeof self.brandId === 'number') {
      return { level: 'brand', brandId: self.brandId }
    }

    // 默认门店层级（支持多门店）
    const storeIds = await this.collectStoreIds(self.id, self.storeId)
    if (storeIds.length) return { level: 'store', storeIds }

    // 兜底到区域或品牌
    if (typeof self.regionId === 'number') return { level: 'region', regionId: self.regionId }
    if (typeof self.brandId === 'number') return { level: 'brand', brandId: self.brandId }

    return { level: 'self', employeeId }
  }

  /**
   * 解析当前用户在“客户列表”场景下可见的门店ID集合。
   * - store/department：直接使用已有 storeIds
   * - region/brand：根据组织结构计算其下所有门店ID
   * - self/all：self 返回空；all 返回全部门店（为避免全量扫描，这里返回空，交由调用方决定）
   */
  async resolveAllowedStoreIds(scope: DataScope): Promise<number[]> {
    if (scope.level === 'store' || scope.level === 'department') {
      const ids = Array.isArray(scope.storeIds) ? scope.storeIds : []
      return ids.filter((id) => typeof id === 'number')
    }
    if (scope.level === 'region' && typeof scope.regionId === 'number') {
      return await this.collectStoresUnder(scope.regionId!)
    }
    if (scope.level === 'brand' && typeof scope.brandId === 'number') {
      return await this.collectStoresUnder(scope.brandId!)
    }
    if (scope.level === 'all') {
      return await this.collectAllStoreIds()
    }
    // self 默认返回空，由调用方根据业务决定是否放行
    return []
  }

  /**
   * 根据组织节点（品牌/区域/门店任一节点）收集其下所有门店ID
   */
  private async collectStoresUnder(rootId: number): Promise<number[]> {
    const all = await this.deptRepo.find()
    const byId = new Map<number, Department>()
    const byParent = new Map<number | null | undefined, Department[]>()
    all.forEach((d) => {
      byId.set(d.id, d)
      const p = d.parentId ?? null
      const arr = byParent.get(p) || []
      arr.push(d)
      byParent.set(p, arr)
    })
    const root = byId.get(rootId)
    if (!root) return []
    const stores = new Set<number>()
    const stack: Department[] = [root]
    const guard = new Set<number>()
    while (stack.length) {
      const cur = stack.pop()!
      if (guard.has(cur.id)) continue
      guard.add(cur.id)
      if ((cur as any).type === 'store') stores.add(cur.id)
      const children = byParent.get(cur.id) || []
      children.forEach((c) => stack.push(c))
    }
    return Array.from(stores)
  }

  /** 收集系统中所有门店ID（管理员/超管使用） */
  private async collectAllStoreIds(): Promise<number[]> {
    const all = await this.deptRepo.find()
    const stores = all.filter((d) => (d as any).type === 'store').map((d) => d.id)
    return stores
  }

  private async collectStoreIds(
    employeeId: number,
    primaryStoreId?: number | null
  ): Promise<number[]> {
    const links = await this.linkRepo.find({ where: { employeeId } })
    const set = new Set<number>()
    if (typeof primaryStoreId === 'number') set.add(primaryStoreId)
    for (const l of links) set.add(l.storeId)
    return Array.from(set)
  }

  async getStoreIdsForEmployee(employeeId: number): Promise<number[]> {
    const emp = await this.empRepo.findOne({ where: { id: employeeId } })
    const primary = emp?.storeId ?? null
    return await this.collectStoreIds(employeeId, primary)
  }

  // 标准字段映射的 where 片段（适用于包含 brandId/regionId/storeId/departmentId/id 的表）
  buildWhereForStandard(scope: DataScope, query: Record<string, any> = {}): Record<string, any> {
    const where: any = {}
    switch (scope.level) {
      case 'all':
        return where
      case 'self':
        where.id = scope.employeeId
        return where
      case 'department':
        if (scope.departmentId) where.departmentId = scope.departmentId
        return where
      case 'store': {
        const storeIds = scope.storeIds || []
        const qStoreId = query.storeId !== undefined ? Number(query.storeId) : undefined
        const finalIds =
          typeof qStoreId === 'number' && !Number.isNaN(qStoreId)
            ? storeIds.filter((id) => id === qStoreId)
            : storeIds
        where.storeId = In(finalIds.length ? finalIds : [-1])
        return where
      }
      case 'region':
        if (scope.regionId !== undefined) where.regionId = scope.regionId
        return where
      case 'brand':
        if (scope.brandId !== undefined) where.brandId = scope.brandId
        return where
      default:
        return where
    }
  }
}
