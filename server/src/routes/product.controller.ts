import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, Like, In, DeepPartial } from 'typeorm'
import { ProductModel } from '../products/product-model.entity'
import { ProductCategoryLink } from '../products/product-category-link.entity'
import { ProductCategory } from '../products/product-category.entity'

/** 商品管理接口：列表/保存/删除/分类关联 */
@Controller('api/product')
export class ProductController {
  constructor(
    @InjectRepository(ProductModel) private readonly modelRepo: Repository<ProductModel>,
    @InjectRepository(ProductCategoryLink)
    private readonly linkRepo: Repository<ProductCategoryLink>,
    @InjectRepository(ProductCategory) private readonly catRepo: Repository<ProductCategory>
  ) {}

  /** 商品列表（分页+搜索），支持名称、品牌、系列、分类筛选 */
  @Get('list')
  async list(@Query() query: Record<string, any>) {
    const current = Number(query.current || 1)
    const size = Number(query.size || 10)
    const name = String(query.name || '')
    const brand = String(query.brand || '')
    // 新增：支持中文品牌名称按分类过滤（根=品牌节点，含子分类）
    const brandName = String(query.brandName || '')
    const series = String(query.series || '')
    const categoryId = query.categoryId !== undefined ? Number(query.categoryId) : undefined
    const includeChildren = String(query.includeChildren || 'false') === 'true'
    const status =
      query.status !== undefined && query.status !== '' ? Number(query.status) : undefined

    let productIdsByCategory: number[] | undefined
    if (typeof categoryId === 'number' && !Number.isNaN(categoryId)) {
      let idsToUse: number[] = [categoryId]
      if (includeChildren) {
        const allCats = await this.catRepo.find()
        const byParent = new Map<number | null | undefined, ProductCategory[]>()
        allCats.forEach((c) => {
          const p = c.parentId ?? null
          const arr = byParent.get(p) || []
          arr.push(c)
          byParent.set(p, arr)
        })
        const descendants = new Set<number>()
        const dfs = (pid: number) => {
          const children = byParent.get(pid) || []
          children.forEach((c) => {
            descendants.add(c.id)
            dfs(c.id)
          })
        }
        dfs(categoryId)
        idsToUse = [categoryId, ...Array.from(descendants)]
      }
      const links = await this.linkRepo.find({ where: { categoryId: In(idsToUse) } })
      const pidSet = new Set<number>()
      links.forEach((l) => pidSet.add(l.productId))
      productIdsByCategory = Array.from(pidSet)
      if (productIdsByCategory.length === 0) {
        return {
          code: 200,
          msg: '获取成功',
          data: { records: [], total: 0, current, size, pages: 0 }
        }
      }
    }

    // 若未传入分类ID但传入了中文品牌名，则按“品牌节点 + 子分类”进行过滤
    if ((!productIdsByCategory || productIdsByCategory.length === 0) && brandName) {
      // 查找品牌根节点（parentId 为 null）
      const allCats = await this.catRepo.find()
      const brandRoots = allCats.filter((c) => (c.parentId ?? null) === null)
      const targetBrand = brandRoots.find((c) => String(c.name) === String(brandName))
      if (targetBrand) {
        const byParent = new Map<number | null | undefined, ProductCategory[]>()
        allCats.forEach((c) => {
          const p = c.parentId ?? null
          const arr = byParent.get(p) || []
          arr.push(c)
          byParent.set(p, arr)
        })
        const descendants = new Set<number>()
        const dfs = (pid: number) => {
          const children = byParent.get(pid) || []
          children.forEach((c) => {
            descendants.add(c.id)
            dfs(c.id)
          })
        }
        dfs(targetBrand.id)
        const idsToUse = [targetBrand.id, ...Array.from(descendants)]
        const links = await this.linkRepo.find({ where: { categoryId: In(idsToUse) } })
        const pidSet = new Set<number>()
        links.forEach((l) => pidSet.add(l.productId))
        productIdsByCategory = Array.from(pidSet)
      }
    }

    // 品牌过滤回退：若按品牌分类未命中，则回退用 brandName 进行品牌字段过滤
    const brandFilter =
      brand ||
      (brandName && (!productIdsByCategory || productIdsByCategory.length === 0) ? brandName : '')

    const where: any = {}
    if (name) where.name = Like(`%${name}%`)
    if (brandFilter) where.brand = Like(`%${brandFilter}%`)
    if (series) where.series = Like(`%${series}%`)
    if (typeof status === 'number' && !Number.isNaN(status)) where.status = status
    if (productIdsByCategory && productIdsByCategory.length) where.id = In(productIdsByCategory)

    const [records, total] = await this.modelRepo.findAndCount({
      where,
      order: { id: 'ASC' },
      skip: (current - 1) * size,
      take: size
    })

    return {
      code: 200,
      msg: '获取成功',
      data: { records, total, current, size, pages: Math.ceil(total / size) }
    }
  }

  /** 保存商品（新增/编辑），可同时更新分类关联：categories: number[] */
  @Post('save')
  async save(@Body() body: ProductInput) {
    console.log('[ProductController.save] incoming body:', body)
    const name = String(body.name || '').trim()
    if (!name) return { code: 400, msg: '商品名称必填', data: false }

    const price = body.price !== undefined ? Number(body.price) : undefined
    const status = body.status !== undefined ? Number(body.status) : undefined
    const sales = body.sales !== undefined ? Number(body.sales) : undefined
    const rawEngine =
      typeof body.engineType === 'string' ? String(body.engineType).toUpperCase() : undefined
    const validEngine =
      rawEngine && ['ICE', 'NEV', 'HEV'].includes(rawEngine)
        ? (rawEngine as 'ICE' | 'NEV' | 'HEV')
        : undefined
    console.log('[ProductController.save] resolved:', {
      price,
      status,
      sales,
      rawEngine,
      validEngine
    })

    let model: ProductModel
    if (body.id) {
      const exist = await this.modelRepo.findOne({ where: { id: Number(body.id) } })
      if (!exist) return { code: 404, msg: '未找到商品', data: false }
      exist.name = name
      exist.brand = body.brand || undefined
      exist.series = body.series || undefined
      // 改为“有值就覆盖”的更新策略，并规范化类型
      if (body.price !== undefined) {
        const normalizedPrice =
          typeof price === 'number' && !Number.isNaN(price) ? Number(Number(price).toFixed(2)) : 0
        ;(exist as any).price = normalizedPrice
      }
      if (body.status !== undefined) {
        const normalizedStatus =
          typeof status === 'number' && !Number.isNaN(status)
            ? Number(status)
            : (exist as any).status
        ;(exist as any).status = normalizedStatus
      }
      if (body.sales !== undefined) {
        const normalizedSales =
          typeof sales === 'number' && !Number.isNaN(sales) ? Number(sales) : (exist as any).sales
        ;(exist as any).sales = normalizedSales
      }
      if (body.engineType !== undefined) {
        ;(exist as any).engineType = validEngine || (exist as any).engineType
      }
      model = await this.modelRepo.save(exist)
      console.log('[ProductController.save] updated model:', model)
    } else {
      // 唯一名校验
      const dup = await this.modelRepo.findOne({ where: { name } })
      if (dup) return { code: 409, msg: '商品名称已存在', data: false }
      const payload: DeepPartial<ProductModel> = {
        name,
        brand: body.brand || undefined,
        series: body.series || undefined
      }
      const created = this.modelRepo.create(payload)
      ;(created as any).engineType = validEngine || 'ICE'
      ;(created as any).price = typeof price === 'number' && !Number.isNaN(price) ? price : 0
      ;(created as any).status = typeof status === 'number' && !Number.isNaN(status) ? status : 1
      ;(created as any).sales = typeof sales === 'number' && !Number.isNaN(sales) ? sales : 0
      model = await this.modelRepo.save(created)
      console.log('[ProductController.save] created model:', model)
    }

    // 分类关联更新（覆盖式）
    if (Array.isArray(body.categories)) {
      const catIds = (body.categories || [])
        .map((id) => Number(id))
        .filter((id) => !Number.isNaN(id))
      // 校验存在性
      if (catIds.length) {
        const cats = await this.catRepo.find({ where: { id: In(catIds) } })
        if (cats.length !== catIds.length) return { code: 400, msg: '存在无效分类ID', data: false }
      }
      // 删除旧关联
      const oldLinks = await this.linkRepo.find({ where: { productId: model.id } })
      if (oldLinks.length) await this.linkRepo.remove(oldLinks)
      // 插入新关联（去重）
      const uniqueIds = Array.from(new Set(catIds))
      if (uniqueIds.length) {
        const rows = uniqueIds.map((cid) =>
          this.linkRepo.create({ productId: model.id, categoryId: cid })
        )
        await this.linkRepo.save(rows)
        console.log('[ProductController.save] categories updated:', uniqueIds)
      }
    }

    // 在保存完成后，统一返回包含关键字段的完整模型
    return {
      code: 0,
      msg: body.id ? 'updated' : 'created',
      data: {
        id: model.id,
        name: model.name,
        brand: (model as any).brand ?? null,
        series: (model as any).series ?? null,
        engineType: (model as any).engineType,
        price: (model as any).price,
        status: (model as any).status,
        sales: (model as any).sales,
        createdAt: (model as any).createdAt,
        updatedAt: (model as any).updatedAt
      }
    }
  }

  /** 删除商品；同时删除分类关联 */
  @Delete(':id')
  async remove(@Param('id') idParam: string) {
    const id = Number(idParam)
    const exist = await this.modelRepo.findOne({ where: { id } })
    if (!exist) return { code: 404, msg: '未找到商品', data: false }
    const links = await this.linkRepo.find({ where: { productId: id } })
    if (links.length) await this.linkRepo.remove(links)
    await this.modelRepo.delete(id)
    return { code: 0, msg: 'deleted', data: true }
  }

  /** 查询某商品已关联的分类ID列表 */
  @Get(':id/categories')
  async categories(@Param('id') idParam: string) {
    const id = Number(idParam)
    const exist = await this.modelRepo.findOne({ where: { id } })
    if (!exist) return { code: 404, msg: '未找到商品', data: [] }
    const links = await this.linkRepo.find({ where: { productId: id } })
    const ids = links.map((l) => l.categoryId)
    return { code: 0, msg: 'ok', data: ids }
  }
}

type ProductInput = {
  id?: number
  name?: string
  brand?: string
  series?: string
  engineType?: string
  price?: number | string
  status?: number | string
  sales?: number | string
  categories?: number[]
}
