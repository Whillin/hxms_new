import { Controller, Get, Query, Req, UseGuards, Inject } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, Like, In } from 'typeorm'
import { JwtGuard } from '../auth/jwt.guard'
import { Customer } from '../customers/customer.entity'
import { DataScopeService } from '../common/data-scope.service'

@Controller('api/customer')
export class CustomerController {
  constructor(
    @InjectRepository(Customer) private readonly repo: Repository<Customer>,
    @Inject(DataScopeService) private readonly dataScopeService: DataScopeService
  ) {}

  @UseGuards(JwtGuard)
  @Get('list')
  async list(@Req() req: any, @Query() query: any) {
    const current = Math.max(1, Number(query.current || 1))
    const size = Math.max(1, Math.min(100, Number(query.size || 10)))
    const roles: string[] = Array.isArray(req.user?.roles) ? req.user.roles : []
    const excluded = ['R_SALES', 'R_SALES_MANAGER', 'R_APPOINTMENT', 'R_FRONT_DESK']
    const hasExcluded = roles.some((r) => excluded.includes(String(r).trim()))
    if (hasExcluded) {
      return {
        code: 403,
        msg: '无权限查看客户列表',
        data: { records: [], total: 0, current, size }
      }
    }

    const scope = await this.dataScopeService.getScope(req.user)
    const allowedStoreIds = await this.dataScopeService.resolveAllowedStoreIds(scope)

    // 解析门店筛选参数
    const storeIdParam =
      query.storeId !== undefined && query.storeId !== '' ? Number(query.storeId) : undefined

    // 数据范围与门店过滤：
    // - 当 scope.level 为 'all'（管理员/信息岗），不限制门店；若传入 storeId 则按该值精确过滤
    // - 其他范围：若传入 storeId，需在可见门店集合内，否则返回空；未传入则按集合过滤
    const where: any = {}
    if (scope.level === 'all') {
      if (typeof storeIdParam === 'number' && !Number.isNaN(storeIdParam)) {
        where.storeId = storeIdParam
      }
    } else {
      if (typeof storeIdParam === 'number' && !Number.isNaN(storeIdParam)) {
        if (!allowedStoreIds.includes(storeIdParam)) {
          return {
            code: 200,
            msg: 'ok',
            data: { records: [], total: 0, current, size }
          }
        }
        where.storeId = storeIdParam
      } else {
        where.storeId = In(allowedStoreIds.length ? allowedStoreIds : [-1])
      }
    }

    // 搜索条件
    if (query.userName) where.name = Like(`%${String(query.userName)}%`)
    if (query.userPhone) where.phone = Like(`%${String(query.userPhone)}%`)
    if (query.userGender) where.gender = String(query.userGender)
    if (query.buyExperience) where.buyExperience = String(query.buyExperience)
    if (query.currentBrand) where.currentBrand = Like(`%${String(query.currentBrand)}%`)
    if (query.currentModel) where.currentModel = Like(`%${String(query.currentModel)}%`)

    const [records, total] = await this.repo.findAndCount({
      where,
      order: { updatedAt: 'DESC' },
      skip: (current - 1) * size,
      take: size
    })

    const payload = {
      records: records.map((r) => ({
        id: r.id,
        userName: r.name,
        userPhone: r.phone,
        userGender: r.gender,
        userAge: r.age,
        buyExperience: r.buyExperience,
        userPhoneModel: r.phoneModel || '',
        currentBrand: r.currentBrand || '',
        currentModel: r.currentModel || '',
        carAge: r.carAge,
        mileage: Number(r.mileage || 0),
        livingArea: r.livingArea || '',
        storeId: r.storeId
      })),
      total,
      current,
      size
    }

    return { code: 200, msg: 'ok', data: payload }
  }
}
