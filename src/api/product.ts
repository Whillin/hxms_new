import request from '@/utils/http'

export interface ProductModelDto {
  id: number
  name: string
  brand?: string
  series?: string
  engineType?: 'ICE' | 'NEV' | 'HEV'
  price?: number
  status?: number
  sales?: number
  createdAt: string | Date
  updatedAt?: string | Date
}

export interface ProductListParams {
  current: number
  size: number
  name?: string
  brand?: string
  series?: string
  status?: number
  categoryId?: number
  includeChildren?: boolean
}

export interface PageResult<T> {
  records: T[]
  total: number
  current: number
  size: number
  pages: number
}

export function fetchGetProductList(params: ProductListParams) {
  return request.get<PageResult<ProductModelDto>>({ url: '/api/product/list', params })
}

export function fetchSaveProduct(
  data: Partial<ProductModelDto> & { categories?: number[] },
  options?: { showSuccessMessage?: boolean }
) {
  return request.post<ProductModelDto>({
    url: '/api/product/save',
    data,
    showSuccessMessage: options?.showSuccessMessage ?? true
  })
}

export function fetchDeleteProduct(id: number, options?: { showSuccessMessage?: boolean }) {
  return request.del<boolean>({
    url: `/api/product/${id}`,
    showSuccessMessage: options?.showSuccessMessage ?? true
  })
}

export function fetchGetProductCategories(id: number) {
  return request.get<number[]>({ url: `/api/product/${id}/categories` })
}
