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

    const scope = await this.dataScopeService.getScope(req.user)

    // 仅按门店范围过滤（每个账号只看自己门店/可见门店）
    const where: any = {}
    if (scope.level === 'store' && Array.isArray(scope.storeIds) && scope.storeIds.length) {
      where.storeId = In(scope.storeIds)
    } else if (
      scope.level === 'department' &&
      Array.isArray(scope.storeIds) &&
      scope.storeIds.length
    ) {
      where.storeId = In(scope.storeIds)
    } else if (scope.level === 'self' && typeof scope.employeeId === 'number') {
      // self 级别时无法直接关联员工门店，这里不返回任何数据，前端依赖用户关联门店以保存线索后生成客户
      where.storeId = -1
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
