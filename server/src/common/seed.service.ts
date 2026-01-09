import { Injectable, OnApplicationBootstrap } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { ProductCategory } from '../products/product-category.entity'
import { ProductModel } from '../products/product-model.entity'
import { ProductCategoryLink } from '../products/product-category-link.entity'
import { Clue } from '../clues/clue.entity'
import { Opportunity } from '../opportunities/opportunity.entity'
import { Department } from '../departments/department.entity'

@Injectable()
export class SeedService implements OnApplicationBootstrap {
  constructor(
    @InjectRepository(ProductCategory) private readonly catRepo: Repository<ProductCategory>,
    @InjectRepository(ProductModel) private readonly modelRepo: Repository<ProductModel>,
    @InjectRepository(ProductCategoryLink)
    private readonly linkRepo: Repository<ProductCategoryLink>,
    @InjectRepository(Clue) private readonly clueRepo: Repository<Clue>,
    @InjectRepository(Opportunity) private readonly oppRepo: Repository<Opportunity>,
    @InjectRepository(Department) private readonly deptRepo: Repository<Department>
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    // 禁用自动播种：仅当显式开启 SEED_ENABLED=true 时才运行
    if (process.env.SEED_ENABLED !== 'true') return
    await this.seedCategoriesIfEmpty()
    await this.seedProductsIfEmpty()
    await this.seedCluesIfEmpty()
  }

  private async seedCategoriesIfEmpty() {
    const count = await this.catRepo.count()
    if (count > 0) return

    const dataset: Array<{ name: string; sortOrder: number; children: string[] }> = [
      { name: '奥迪', sortOrder: 1, children: ['CKD(ICE)', 'NEV', 'FBU'] },
      { name: '小鹏', sortOrder: 2, children: ['NEV'] }
    ]

    for (const brand of dataset) {
      const brandRow = this.catRepo.create({
        name: brand.name,
        parentId: null,
        level: 0,
        path: '',
        sortOrder: brand.sortOrder,
        status: 'active'
      })
      const savedBrand = await this.catRepo.save(brandRow)

      let idx = 1
      for (const child of brand.children) {
        const childRow = this.catRepo.create({
          name: child,
          parentId: savedBrand.id,
          level: (savedBrand.level || 0) + 1,
          path: savedBrand.path ? `${savedBrand.path}/${savedBrand.id}` : `/${savedBrand.id}`,
          sortOrder: idx++,
          status: 'active'
        })
        await this.catRepo.save(childRow)
      }
    }

    console.log('[SeedService] Product categories seeded.')
  }

  // 初始化示例商品与分类关联（仅当商品表为空时）
  private async seedProductsIfEmpty() {
    const cnt = await this.modelRepo.count()
    if (cnt > 0) return

    const samples: Array<{
      name: string
      brand: string
      series?: string
      brandName: string
      childName: string
    }> = [
      {
        name: '奥迪A4L 2024款 40 TFSI 时尚型',
        brand: 'Audi',
        series: 'A',
        brandName: '奥迪',
        childName: 'CKD(ICE)'
      },
      {
        name: '奥迪 e-tron GT 2024款 quattro',
        brand: 'Audi',
        series: 'e-tron',
        brandName: '奥迪',
        childName: 'NEV'
      },
      {
        name: '奥迪Q7 2024款 45 TFSI quattro',
        brand: 'Audi',
        series: 'Q',
        brandName: '奥迪',
        childName: 'FBU'
      },
      {
        name: '小鹏P7 2024款 706G',
        brand: 'XPENG',
        series: 'P',
        brandName: '小鹏',
        childName: 'NEV'
      },
      {
        name: '小鹏G9 2024款 702 Max',
        brand: 'XPENG',
        series: 'G',
        brandName: '小鹏',
        childName: 'NEV'
      }
    ]

    // 查找目标子分类ID
    const allCats = await this.catRepo.find()
    const idFor = (brandName: string, childName: string): number | null => {
      const brand = allCats.find((c) => c.name === brandName && (c.parentId ?? null) === null)
      if (!brand) return null
      const child = allCats.find((c) => c.name === childName && c.parentId === brand.id)
      return child ? child.id : null
    }

    const created: ProductModel[] = []
    for (const s of samples) {
      const row = this.modelRepo.create({ name: s.name, brand: s.brand, series: s.series })
      const saved = await this.modelRepo.save(row)
      created.push(saved)
      const cid = idFor(s.brandName, s.childName)
      if (cid) {
        const link = this.linkRepo.create({ productId: saved.id, categoryId: cid })
        await this.linkRepo.save(link)
      }
    }

    console.log(
      '[SeedService] Sample products seeded:',
      created.map((p) => p.name)
    )
  }

  private async seedCluesIfEmpty() {
    let count = await this.clueRepo.count()

    // 强制清理并重新播种（开发环境兜底，确保字符集修复生效）
    // 注意：这将删除所有线索和商机数据！
    const FORCE_RESEED = false

    if (FORCE_RESEED || count === 0) {
      console.log('[SeedService] Forcing data re-seed to ensure correct charset...')

      // 1. 尝试转换表字符集（以防 TypeORM 同步未生效）
      try {
        await this.clueRepo.query(
          'ALTER TABLE clues CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci'
        )
        await this.oppRepo.query(
          'ALTER TABLE opportunities CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci'
        )
      } catch (e) {
        console.warn('[SeedService] Charset conversion warning:', e)
      }

      // 2. 清除旧数据
      await this.oppRepo.clear()
      await this.clueRepo.clear()

      // 3. 重置计数以触发播种
      count = 0
    }

    if (count > 0) return

    const genders = ['男', '女', '未知'] as const
    const experiences = ['首购', '换购', '增购'] as const
    const categories = ['首次', '再次'] as const
    // 严格按照用户要求：商机来源只有“自然到店”和“主动开发”
    const sources = ['自然到店', '主动开发']
    // 模拟一级渠道 (Channel Level 1)
    const channelL1s = [
      '展厅到店',
      'DCC/ADC到店',
      '车展外展',
      '新媒体开发',
      '转化开发',
      '保客开发',
      '转介绍开发',
      '大用户开发'
    ]

    const now = new Date()
    const pad2 = (n: number) => `${n}`.padStart(2, '0')
    const fmtYmd = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`

    const allDepts = await this.deptRepo.find()
    const storeIds = allDepts
      .filter((d: any) => String((d as any)?.type || '').toLowerCase() === 'store')
      .map((d) => d.id)
      .filter((id) => typeof id === 'number' && Number.isFinite(id) && id > 0)
    if (storeIds.length === 0) storeIds.push(1, 2)

    const models = await this.modelRepo.find()
    const modelById = new Map<number, ProductModel>()
    for (const m of models) {
      const id = Number((m as any)?.id || 0)
      if (Number.isFinite(id) && id > 0) modelById.set(id, m)
    }
    const modelIds = Array.from(modelById.keys())

    const startYear = 2020
    const endYear = now.getFullYear()
    const years: number[] = []
    for (let y = startYear; y <= endYear; y++) years.push(y)

    const perStorePerYear = 4
    let idx = 0
    for (const sid of storeIds) {
      for (const y of years) {
        const yearStart = new Date(y, 0, 1)
        const yearEnd = y === endYear ? now : new Date(y, 11, 31)
        const startTs = yearStart.getTime()
        const endTs = yearEnd.getTime()
        for (let k = 0; k < perStorePerYear; k++) {
          const isDeal = Math.random() > 0.7
          const phone = `138${String(Math.floor(Math.random() * 100000000)).padStart(8, '0')}`
          const source = sources[Math.floor(Math.random() * sources.length)]
          const l1 = channelL1s[Math.floor(Math.random() * channelL1s.length)]

          const t = startTs + Math.floor(Math.random() * Math.max(1, endTs - startTs + 1))
          const visitDate = fmtYmd(new Date(t))

          const focusId =
            modelIds.length > 0 ? modelIds[Math.floor(Math.random() * modelIds.length)] : null
          const focusName = focusId ? String(modelById.get(focusId)?.name || '') : ''

          const clue = this.clueRepo.create({
            storeId: sid,
            visitDate,
            enterTime: '10:00',
            customerName: `客户${++idx}`,
            customerPhone: phone,
            businessSource: source,
            channelLevel1: l1,
            focusModelId: focusId || undefined,
            focusModelName: focusName || undefined,
            opportunityLevel: 'H',
            userGender: genders[Math.floor(Math.random() * genders.length)],
            userAge: 20 + Math.floor(Math.random() * 40),
            buyExperience: experiences[Math.floor(Math.random() * experiences.length)],
            visitCategory: categories[Math.floor(Math.random() * categories.length)],
            carAge: Math.floor(Math.random() * 10),
            mileage: Math.round((Math.random() * 15 * 10000) / 100) * 100,
            status: '未处理',
            ownerId: 1
          } as any) as unknown as Clue
          const saved = (await this.clueRepo.save(clue)) as unknown as Clue

          if (isDeal) {
            const opp = this.oppRepo.create({
              storeId: saved.storeId,
              customerId: saved.customerId || 0,
              customerName: saved.customerName,
              customerPhone: saved.customerPhone,
              status: '已成交',
              opportunityLevel: 'O',
              ownerId: saved.salesConsultantId,
              openDate: saved.visitDate,
              latestVisitDate: saved.visitDate,
              businessSource: saved.businessSource,
              channelLevel1: (saved as any).channelLevel1 || null
            } as any) as unknown as Opportunity
            await this.oppRepo.save(opp as any)
          } else {
            const rnd = Math.random()
            if (rnd > 0.5) {
              const failReasons = ['价格太高', '竞品对比', '购车计划取消', '居住地变更', '其他']
              const opp = this.oppRepo.create({
                storeId: saved.storeId,
                customerId: saved.customerId || 0,
                customerName: saved.customerName,
                customerPhone: saved.customerPhone,
                status: '已战败',
                failReason: failReasons[Math.floor(Math.random() * failReasons.length)],
                opportunityLevel: 'C',
                ownerId: saved.salesConsultantId,
                openDate: saved.visitDate,
                latestVisitDate: saved.visitDate,
                businessSource: saved.businessSource,
                channelLevel1: (saved as any).channelLevel1 || null
              } as any) as unknown as Opportunity
              await this.oppRepo.save(opp as any)
            } else {
              const opp = this.oppRepo.create({
                storeId: saved.storeId,
                customerId: saved.customerId || 0,
                customerName: saved.customerName,
                customerPhone: saved.customerPhone,
                status: '跟进中',
                opportunityLevel: 'H',
                ownerId: saved.salesConsultantId,
                openDate: saved.visitDate,
                latestVisitDate: saved.visitDate,
                businessSource: saved.businessSource,
                channelLevel1: (saved as any).channelLevel1 || null
              } as any) as unknown as Opportunity
              await this.oppRepo.save(opp as any)
            }
          }
        }
      }
    }
    console.log('[SeedService] Clues seeded.')
  }
}
