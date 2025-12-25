import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { fetchGetProductList, fetchGetModelsByStore } from '@/api/product'
import { useProductCategoryStore } from '@/store/modules/productCategory'

export interface ProductItem {
  id: number
  name: string
  categoryId: number
  categoryName: string
  brandName: string
  price?: number
  engineType?: string
  sales?: number
  status?: number
  image?: string
  description?: string
  createTime?: string
}

export const useProductStore = defineStore('productStore', () => {
  // 车型数据从后端动态加载
  const products = ref<ProductItem[]>([])
  const source = ref<'store' | 'brand' | 'category' | null>(null)

  // 规范化中文品牌名：去除常见后缀（汽车/集团/公司/品牌），转为根品牌名
  const normalizeBrandChinese = (name: string = ''): string => {
    const raw = String(name || '').trim()
    if (!raw) return ''
    // 去除常见后缀
    const stripped = raw.replace(/(汽车|集团|公司|品牌)$/i, '')
    // 若仍包含已知根品牌关键词，则提取根词
    const roots = [
      '小鹏',
      '奥迪',
      '比亚迪',
      '蔚来',
      '理想',
      '极氪',
      '吉利',
      '大众',
      '丰田',
      '本田',
      '宝马',
      '奔驰',
      '特斯拉',
      '长城',
      '奇瑞',
      '福特',
      '日产',
      '现代',
      '长安',
      '广汽'
    ]
    const hit = roots.find((r) => stripped.includes(r))
    return hit || stripped
  }

  // 品牌别名映射与本地过滤（防止跨品牌混入）
  const getBrandAliases = (brand: string = ''): string[] => {
    const name = String(brand || '').trim()
    if (!name) return []
    const MAP: Record<string, string[]> = {
      小米: ['小米', 'XIAOMI', 'XiaoMi'],
      比亚迪: ['比亚迪', 'BYD'],
      蔚来: ['蔚来', 'NIO'],
      理想: ['理想', 'LIXIANG', 'LiXiang'],
      极氪: ['极氪', 'ZEEKR'],
      吉利: ['吉利', 'GEELY'],
      大众: ['大众', 'VOLKSWAGEN', 'VW'],
      丰田: ['丰田', 'TOYOTA'],
      本田: ['本田', 'HONDA'],
      宝马: ['宝马', 'BMW'],
      奔驰: ['奔驰', 'BENZ', 'MERCEDES'],
      奥迪: ['奥迪', 'AUDI'],
      特斯拉: ['特斯拉', 'TESLA'],
      小鹏: ['小鹏', 'XPENG', 'Xpeng', 'X-PENG'],
      // 常见中文带后缀的别名归一到根品牌
      小鹏汽车: ['小鹏', 'XPENG', 'Xpeng', 'X-PENG'],
      奥迪汽车: ['奥迪', 'AUDI'],
      长城: ['长城', 'GREATWALL'],
      奇瑞: ['奇瑞', 'CHERY'],
      福特: ['福特', 'FORD'],
      日产: ['日产', 'NISSAN'],
      现代: ['现代', 'HYUNDAI'],
      长安: ['长安', 'CHANGAN'],
      广汽: ['广汽', 'GAC']
    }
    if (MAP[name]) return MAP[name]
    const ascii = name.replace(/[^A-Za-z]/g, '')
    const set = new Set<string>([name, name.toUpperCase(), name.toLowerCase()])
    if (ascii) {
      set.add(ascii.toUpperCase())
      set.add(ascii.toLowerCase())
    }
    return Array.from(set)
  }

  const matchBrand = (rowBrand: string = '', aliases: string[] = []) => {
    if (!rowBrand || !aliases.length) return false
    const rb = String(rowBrand).toLowerCase()
    return aliases.some((a) => rb.includes(String(a).toLowerCase()))
  }

  // 动态加载产品模型（状态为上架，分页拉取较大 size）
  const loadProducts = async (brand?: string) => {
    try {
      if (source.value === 'store' && products.value.length) return
      const params: any = { current: 1, size: 500, status: 1 }
      if (brand) {
        // 若传入的是中文品牌名称，优先按分类树过滤；找不到节点则回退为 brandName 参数
        const isChinese = /[\u4e00-\u9fa5]/.test(brand)
        const normalized = isChinese ? normalizeBrandChinese(brand) : brand
        // OEM 分品牌：上汽/一汽 不做“回退到根品牌”，避免跨品牌混入
        if (isChinese && /(上汽奥迪|一汽奥迪|上汽大众|一汽大众)/.test(String(brand))) {
          products.value = []
          return
        }
        if (isChinese) {
          const categoryStore = useProductCategoryStore()
          try {
            await categoryStore.loadFromApi()
          } catch {
            // ignore
          }
          const tree = (categoryStore as any).tree || []
          const brandNode = (tree as any[]).find(
            (n: any) => n?.level === 1 && String(n?.name) === normalized
          )
          if (brandNode && typeof brandNode.id === 'number') {
            params.categoryId = brandNode.id
            params.includeChildren = true
          } else {
            // 找不到分类节点时，后端支持按中文品牌名聚合分类过滤
            params.brandName = normalized
          }
        } else {
          // 英文/拼音品牌名，后端按产品的 brand 字段模糊过滤
          params.brand = normalized
        }
      }
      const result = await fetchGetProductList(params)
      let rows = Array.isArray((result as any)?.records) ? (result as any).records : []
      // 新增：前端本地品牌过滤，避免跨品牌车型干扰
      if (brand) {
        const isChinese = /[\u4e00-\u9fa5]/.test(brand)
        const base = isChinese ? normalizeBrandChinese(brand) : brand
        const aliases = getBrandAliases(base)
        const filtered = rows.filter((r: any) => matchBrand(r?.brand ?? '', aliases))
        if (filtered.length > 0) rows = filtered
      }
      products.value = rows.map((r: any) => ({
        id: Number(r.id),
        name: String(r.name || ''),
        // 后端模型无直出 categoryId/categoryName，这里填充为可选显示字段
        categoryId: 0,
        categoryName: [r.brand, r.series].filter(Boolean).join(' - '),
        brandName: String(r.brand || ''),
        price: typeof r.price === 'number' ? r.price : undefined,
        engineType: String(r.engineType || ''),
        sales: typeof r.sales === 'number' ? r.sales : undefined,
        status: typeof r.status === 'number' ? r.status : undefined,
        image: '',
        description: ''
      }))
      source.value = brand ? 'brand' : null
    } catch (e) {
      // 加载失败时保持已有值（空数组）
      console.error('[productStore] loadProducts failed:', e)
    }
  }

  // 新增：按分类ID加载车型（优先使用后端分类ID并包含子分类）
  const loadProductsByCategoryId = async (categoryId?: number, includeChildren = true) => {
    try {
      if (source.value === 'store' && products.value.length) return
      const params: any = { current: 1, size: 500, status: 1 }
      if (typeof categoryId === 'number') {
        params.categoryId = categoryId
        params.includeChildren = includeChildren
      }
      const result = await fetchGetProductList(params)
      const rows = Array.isArray((result as any)?.records) ? (result as any).records : []
      products.value = rows.map((r: any) => ({
        id: Number(r.id),
        name: String(r.name || ''),
        categoryId: 0,
        categoryName: [r.brand, r.series].filter(Boolean).join(' - '),
        brandName: String(r.brand || ''),
        price: typeof r.price === 'number' ? r.price : undefined,
        engineType: String(r.engineType || ''),
        sales: typeof r.sales === 'number' ? r.sales : undefined,
        status: typeof r.status === 'number' ? r.status : undefined,
        image: '',
        description: ''
      }))
      source.value = typeof categoryId === 'number' ? 'category' : null
    } catch (e) {
      console.error('[productStore] loadProductsByCategoryId failed:', e)
    }
  }

  const loadProductsByStoreId = async (storeId?: number) => {
    try {
      const sid = Number(storeId)
      if (!Number.isFinite(sid) || sid <= 0) {
        products.value = []
        source.value = null
        return
      }
      const list = await fetchGetModelsByStore(sid)
      const rows = Array.isArray(list) ? list : []
      products.value = rows.map((m: any) => ({
        id: Number(m.id),
        name: String(m.name || ''),
        categoryId: 0,
        categoryName: '',
        brandName: '',
        price: undefined,
        engineType: '',
        sales: undefined,
        status: undefined,
        image: '',
        description: ''
      }))
      source.value = 'store'
    } catch (e) {
      console.error('[productStore] loadProductsByStoreId failed:', e)
    }
  }

  // 车型名称下拉选项（以商品管理的车型名称为准）
  const nameOptions = computed(() => products.value.map((p) => ({ label: p.name, value: p.name })))

  return {
    products,
    nameOptions,
    loadProducts,
    loadProductsByCategoryId,
    loadProductsByStoreId,
    source
  }
})
