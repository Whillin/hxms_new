import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { fetchGetProductList } from '@/api/product'

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

  // 动态加载产品模型（状态为上架，分页拉取较大 size）
  const loadProducts = async () => {
    try {
      const result = await fetchGetProductList({ current: 1, size: 500, status: 1 })
      const rows = Array.isArray((result as any)?.records) ? (result as any).records : []
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
    } catch (e) {
      // 加载失败时保持已有值（空数组）
      console.error('[productStore] loadProducts failed:', e)
    }
  }

  // 车型名称下拉选项（以商品管理的车型名称为准）
  const nameOptions = computed(() => products.value.map((p) => ({ label: p.name, value: p.name })))

  return { products, nameOptions, loadProducts }
})
