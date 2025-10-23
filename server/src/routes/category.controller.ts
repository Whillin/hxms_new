import { Body, Controller, Delete, Get, Param, Post, Query, OnModuleInit } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { ProductCategory } from '../products/product-category.entity'
import { ProductCategoryLink } from '../products/product-category-link.entity'
import { ProductModel } from '../products/product-model.entity'

@Controller('api/category')
export class CategoryController implements OnModuleInit {
  constructor(
    @InjectRepository(ProductCategory) private readonly catRepo: Repository<ProductCategory>,
    @InjectRepository(ProductCategoryLink) private readonly linkRepo: Repository<ProductCategoryLink>,
    @InjectRepository(ProductModel) private readonly modelRepo: Repository<ProductModel>
  ) {}

  private async seedIfEmpty() {
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
  }

  // 获取全部分类（平铺）
  @Get('all')
  async all() {
    await this.seedIfEmpty()
    const list = await this.catRepo.find({ order: { level: 'ASC', sortOrder: 'ASC', id: 'ASC' } })
    return { code: 0, msg: 'ok', data: list }
  }

  // 获取树结构
  @Get('tree')
  async tree(@Query('rootId') rootId?: string) {
    await this.seedIfEmpty()
    const all = await this.catRepo.find({ order: { level: 'ASC', sortOrder: 'ASC', id: 'ASC' } })
    const byParent = new Map<number | null | undefined, ProductCategory[]>()
    all.forEach((c) => {
      const p = c.parentId ?? null
      const arr = byParent.get(p) || []
      arr.push(c)
      byParent.set(p, arr)
    })
    const build = (pid: number | null): any[] => {
      const children = byParent.get(pid) || []
      return children.map((c) => ({ ...c, children: build(c.id) }))
    }
    const root = rootId ? Number(rootId) : null
    const data = build(root)
    return { code: 0, msg: 'ok', data }
  }

  // 新增/更新分类
  @Post('save')
  async save(@Body() body: any) {
    const name = String(body.name || '').trim()
    if (!name) return { code: 400, msg: '分类名称必填', data: false }
    const parentId = typeof body.parentId === 'number' ? Number(body.parentId) : null
    const sortOrder = typeof body.sortOrder === 'number' ? Number(body.sortOrder) : 0
    const status = (String(body.status || 'active') as any)

    // 计算 level 与 path
    let level = 0
    let path: string | undefined
    if (parentId) {
      const parent = await this.catRepo.findOne({ where: { id: parentId } })
      if (!parent) return { code: 400, msg: '父分类不存在', data: false }
      level = (parent.level || 0) + 1
      path = parent.path ? `${parent.path}/${parent.id}` : `/${parent.id}`
    } else {
      level = 0
      path = ''
    }

    if (body.id) {
      const id = Number(body.id)
      const exist = await this.catRepo.findOne({ where: { id } })
      if (!exist) return { code: 404, msg: '未找到分类', data: false }
      exist.name = name
      exist.slug = body.slug || exist.slug
      exist.parentId = parentId
      exist.level = level
      exist.path = path
      exist.sortOrder = sortOrder
      exist.status = status
      await this.catRepo.save(exist)
      return { code: 0, msg: 'updated', data: exist }
    }

    const created = this.catRepo.create({ name, slug: body.slug || undefined, parentId, level, path, sortOrder, status })
    const saved = await this.catRepo.save(created)
    return { code: 0, msg: 'created', data: saved }
  }

  // 删除分类：若存在子分类或已关联商品则拒绝
  @Delete(':id')
  async remove(@Param('id') idParam: string) {
    const id = Number(idParam)
    const hasChildren = await this.catRepo.count({ where: { parentId: id } })
    if (hasChildren) return { code: 400, msg: '存在子分类，无法删除', data: false }
    const hasLinks = await this.linkRepo.count({ where: { categoryId: id } })
    if (hasLinks) return { code: 400, msg: '分类已关联商品，无法删除', data: false }
    await this.catRepo.delete(id)
    return { code: 0, msg: 'deleted', data: true }
  }

  // 获取某分类下的商品（可选包含子分类）
  @Get(':id/products')
  async products(@Param('id') idParam: string, @Query('includeChildren') includeChildren?: string) {
    const id = Number(idParam)
    const cat = await this.catRepo.findOne({ where: { id } })
    if (!cat) return { code: 404, msg: '未找到分类', data: [] }

    let categoryIds = [id]
    if (includeChildren === 'true') {
      const all = await this.catRepo.find()
      const descendants = new Set<number>()
      const byParent = new Map<number | null | undefined, ProductCategory[]>()
      all.forEach((c) => {
        const p = c.parentId ?? null
        const arr = byParent.get(p) || []
        arr.push(c)
        byParent.set(p, arr)
      })
      const dfs = (pid: number) => {
        const children = byParent.get(pid) || []
        children.forEach((c) => {
          descendants.add(c.id)
          dfs(c.id)
        })
      }
      dfs(id)
      categoryIds = [id, ...Array.from(descendants)]
    }

    const links = await this.linkRepo.find()
    const ids = new Set<number>()
    links.forEach((l) => {
      if (categoryIds.includes(l.categoryId)) ids.add(l.productId)
    })
    const products = await this.modelRepo.findByIds(Array.from(ids))
    return { code: 0, msg: 'ok', data: products }
  }
  async onModuleInit(): Promise<void> {
    await this.seedIfEmpty()
  }
}