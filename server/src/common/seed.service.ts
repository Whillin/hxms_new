import { Injectable, OnApplicationBootstrap } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { ProductCategory } from '../products/product-category.entity'
import { ProductModel } from '../products/product-model.entity'
import { ProductCategoryLink } from '../products/product-category-link.entity'

@Injectable()
export class SeedService implements OnApplicationBootstrap {
  constructor(
    @InjectRepository(ProductCategory) private readonly catRepo: Repository<ProductCategory>,
    @InjectRepository(ProductModel) private readonly modelRepo: Repository<ProductModel>,
    @InjectRepository(ProductCategoryLink)
    private readonly linkRepo: Repository<ProductCategoryLink>
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.seedCategoriesIfEmpty()
    await this.seedProductsIfEmpty()
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
}
