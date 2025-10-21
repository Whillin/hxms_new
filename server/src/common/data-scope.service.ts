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
    const isAdmin = roles.includes('R_ADMIN') || roles.includes('R_SUPER')
    if (isAdmin) return { level: 'all' }

    if (!userId || Number.isNaN(userId)) return { level: 'self' }

    const record = await this.userService.findById(userId)
    const employeeId = record?.employeeId
    if (!employeeId) return { level: 'self' }

    const self = await this.empRepo.findOne({ where: { id: employeeId } })
    if (!self) return { level: 'self', employeeId }

    // 销售顾问：仅本人
    if (roles.includes('R_SALES')) {
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
