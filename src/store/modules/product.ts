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
  // 示例车型数据（作为后端不可用时的兜底）
  const seedProducts: ProductItem[] = [
    {
      id: 1,
      name: '奥迪A4L 2024款 40 TFSI 时尚动感型',
      categoryId: 2,
      categoryName: '奥迪 - CKD(ICE)',
      brandName: '奥迪',
      price: 329800,
      engineType: 'ICE',
      sales: 1280,
      status: 1,
      image: 'https://picsum.photos/200/200?random=1',
      description: '奥迪A4L，经典豪华轿车，搭载2.0T涡轮增压发动机，动力强劲，操控精准。',
      createTime: '2024-01-15 10:30:00'
    },
    {
      id: 2,
      name: '奥迪e-tron GT 2024款 quattro',
      categoryId: 3,
      categoryName: '奥迪 - NEV',
      brandName: '奥迪',
      price: 1068800,
      engineType: 'NEV',
      sales: 156,
      status: 1,
      image: 'https://picsum.photos/200/200?random=2',
      description: '奥迪e-tron GT，纯电动高性能轿跑，续航里程超过400公里，零百加速3.9秒。',
      createTime: '2024-01-15 11:00:00'
    },
    {
      id: 3,
      name: '奥迪Q7 2024款 45 TFSI quattro',
      categoryId: 4,
      categoryName: '奥迪 - FBU',
      brandName: '奥迪',
      price: 699800,
      engineType: 'ICE',
      sales: 890,
      status: 1,
      image: 'https://picsum.photos/200/200?random=3',
      description: '奥迪Q7，大型豪华SUV，进口车型，配置丰富，空间宽敞。',
      createTime: '2024-01-15 12:00:00'
    },
    {
      id: 4,
      name: '小鹏P7 2024款 706G',
      categoryId: 6,
      categoryName: '小鹏 - NEV',
      brandName: '小鹏',
      price: 249900,
      engineType: 'NEV',
      sales: 2340,
      status: 1,
      image: 'https://picsum.photos/200/200?random=4',
      description: '小鹏P7，智能纯电轿跑，续航里程706公里，搭载XPILOT自动驾驶辅助系统。',
      createTime: '2024-01-15 13:00:00'
    },
    {
      id: 5,
      name: '小鹏G9 2024款 702 Max',
      categoryId: 6,
      categoryName: '小鹏 - NEV',
      brandName: '小鹏',
      price: 359900,
      engineType: 'NEV',
      sales: 1560,
      status: 0,
      image: 'https://picsum.photos/200/200?random=5',
      description: '小鹏G9，智能纯电SUV，续航里程702公里，配备800V高压快充技术。',
      createTime: '2024-01-15 14:00:00'
    }
  ]

  const products = ref<ProductItem[]>([...seedProducts])

  // 从后端加载商品车型（替换示例数据）
  const loadFromApi = async () => {
    try {
      const result = await fetchGetProductList({ current: 1, size: 1000, includeChildren: false })
      const records = Array.isArray(result.records) ? result.records : []
      products.value = records.map((r: any) => ({
        id: Number(r.id),
        name: String(r.name || ''),
        categoryId: Number(r.categoryId || 0),
        categoryName: String(r.categoryName || ''),
        brandName: String(r.brand || r.brandName || ''),
        price: typeof r.price === 'number' ? r.price : undefined,
        engineType: r.engineType,
        status: typeof r.status === 'number' ? r.status : undefined,
        image: r.image || '',
        description: r.description || '',
        createTime: String(r.createdAt || ''),
      }))
    } catch (e) {
      // 保持示例数据作为兜底，不抛错让界面可用
      // console.warn('[productStore] loadFromApi failed:', e)
    }
  }

  // 车型名称下拉选项（以商品管理的车型名称为准）
  const nameOptions = computed(() => products.value.map((p) => ({ label: p.name, value: p.name })))

  return { products, nameOptions, loadFromApi }
})
