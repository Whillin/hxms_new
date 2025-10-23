import { Injectable, OnApplicationBootstrap } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { ProductCategory } from '../products/product-category.entity'

@Injectable()
export class SeedService implements OnApplicationBootstrap {
  constructor(
    @InjectRepository(ProductCategory) private readonly catRepo: Repository<ProductCategory>
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.seedCategoriesIfEmpty()
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
}