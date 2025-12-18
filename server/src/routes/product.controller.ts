import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, Like, In, DeepPartial } from 'typeorm'
import { ProductModel } from '../products/product-model.entity'
import { ProductCategoryLink } from '../products/product-category-link.entity'
import { ProductCategory } from '../products/product-category.entity'
import { Department } from '../departments/department.entity'
 

/** 商品管理接口：列表/保存/删除/分类关联 */
@Controller('api/product')
export class ProductController {
  constructor(
    @InjectRepository(ProductModel) private readonly modelRepo: Repository<ProductModel>,
    @InjectRepository(ProductCategoryLink)
    private readonly linkRepo: Repository<ProductCategoryLink>,
    @InjectRepository(ProductCategory) private readonly catRepo: Repository<ProductCategory>,
    @InjectRepository(Department) private readonly deptRepo: Repository<Department>
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

  @Get('categories')
  async batchCategories(@Query('ids') idsParam?: string) {
    const raw = String(idsParam || '')
      .split(',')
      .map((s) => Number(s))
      .filter((n) => !Number.isNaN(n))
    if (!raw.length) return { code: 0, msg: 'ok', data: {} }
    const links = await this.linkRepo.find({ where: { productId: In(raw) } })
    const map = new Map<number, number[]>()
    for (const l of links) {
      const arr = map.get(l.productId) || []
      arr.push(l.categoryId)
      map.set(l.productId, arr)
    }
    const data: Record<number, number[]> = {}
    for (const id of raw) {
      data[id] = map.get(id) || []
    }
    return { code: 0, msg: 'ok', data }
  }

  @Get('models/by-store')
  async modelsByStore(@Query('storeId') storeIdParam?: string) {
    const storeId = Number(storeIdParam)
    if (!storeId || Number.isNaN(storeId)) return { code: 400, msg: '缺少有效门店ID', data: [] }
    const allDepts = await this.deptRepo.find()
    const byId = new Map<number, Department>()
    const parentOf = new Map<number, number | undefined | null>()
    allDepts.forEach((d) => {
      byId.set(d.id, d)
      parentOf.set(d.id, d.parentId ?? null)
    })
    const store = byId.get(storeId)
    if (!store) return { code: 200, msg: 'ok', data: [] }
    let cur: Department | undefined = store
    let brandName: string | undefined
    let brandCode: string | undefined
    const guard = new Set<number>()
    while (cur && !guard.has(cur.id)) {
      guard.add(cur.id)
      if (String((cur as any).type) === 'brand') {
        brandName = String(cur.name)
        brandCode = (cur as any).code ? String((cur as any).code) : undefined
        break
      }
      const pid: number | null | undefined = parentOf.get(cur.id) || null
      cur = pid ? byId.get(pid) : undefined
    }
    if (!brandName) {
      const models = await this.modelRepo.find({ where: { status: 1 }, order: { name: 'ASC' } })
      const data = models.map((m) => ({ id: m.id, name: m.name }))
      return { code: 200, msg: 'ok', data }
    }
    const cats = await this.catRepo.find()
    const normalize = (s?: string) => (s || '').replace(/\s+/g, '').toLowerCase()
    let brand = cats.find((c) => brandCode && c.slug && String(c.slug) === brandCode)
    if (!brand) {
      const exactMatches = cats.filter(
        (c) => String(c.name) === String(brandName) || normalize(c.name) === normalize(brandName)
      )
      if (exactMatches.length) {
        exactMatches.sort((a, b) => (a.level || 0) - (b.level || 0))
        brand = exactMatches[0]
      }
    }
    if (!brand) {
      const brandDepts = await this.deptRepo.find({ where: { type: 'brand' as any } })
      const match = brandDepts.find((d) => normalize(d.name) === normalize(brandName))
      if (match && match.code) {
        brand = cats.find((c) => c.slug && String(c.slug) === String(match.code))
      }
    }
    if (!brand) {
      const models = await this.modelRepo.find({ where: { status: 1 }, order: { name: 'ASC' } })
      const data = models.map((m) => ({ id: m.id, name: m.name }))
      return { code: 200, msg: 'ok', data }
    }
    const byParent = new Map<number | null | undefined, ProductCategory[]>()
    cats.forEach((c) => {
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
    dfs(brand.id)
    const idsToUse = [brand.id, ...Array.from(descendants)]
    const links = await this.linkRepo.find({ where: { categoryId: In(idsToUse) } })
    const pidSet = new Set<number>()
    links.forEach((l) => pidSet.add(l.productId))
    const productIds = Array.from(pidSet)
    let models: any[]
    if (productIds.length) {
      models = await this.modelRepo.find({ where: { id: In(productIds) }, order: { name: 'ASC' } })
    } else {
      const bn = normalize(brandName)
      const strictNoFallback =
        bn.includes('上汽奥迪') || bn.includes('一汽奥迪') || bn.includes('上汽大众') || bn.includes('一汽大众')
      if (strictNoFallback) {
        models = []
      } else {
        const zh2en: Record<string, string> = {
          '奥迪': 'Audi',
          '小鹏': 'XPENG',
          '大众': 'Volkswagen',
          '上汽大众': 'Volkswagen',
          '一汽大众': 'Volkswagen',
          '比亚迪': 'BYD',
          '宝马': 'BMW',
          '奔驰': 'Mercedes-Benz',
          '丰田': 'Toyota',
          '本田': 'Honda',
          '日产': 'Nissan'
        }
        const brandEn = zh2en[String(brandName)]
        if (brandEn) {
          models = await this.modelRepo.find({ where: { brand: brandEn }, order: { name: 'ASC' } as any })
        } else {
          models = await this.modelRepo.find({ where: { status: 1 }, order: { name: 'ASC' } })
        }
      }
    }
    const bnNorm = normalize(brandName)
    let wl: Set<string> | undefined
    if (bnNorm.includes('上汽奥迪')) {
      wl = new Set(['A5L Spb', 'A7L', 'E5 Spb', 'Q5 e', 'Q6'])
    }
    if (wl) {
      models = await this.modelRepo.find({ where: { name: In(Array.from(wl)) }, order: { name: 'ASC' } })
    } else {
      models = models.filter((m) => normalize(String((m as any).brand || '')) === bnNorm)
    }
    console.log('[ProductController.modelsByStore]', { storeId, wlSize: wl ? wl.size : 0, out: models.map((m) => m.name) })
    const data = models.map((m) => ({ id: m.id, name: m.name }))
    return { code: 200, msg: 'ok', data }
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
