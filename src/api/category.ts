import request from '@/utils/http'

export interface SaveCategoryPayload {
  id?: number
  name: string
  parentId?: number | null
  sortOrder?: number
  status?: 'active' | 'inactive'
  slug?: string
}

export function fetchGetAllCategories() {
  return request.get<any[]>({ url: '/api/category/all' })
}

export function fetchGetCategoryTree(rootId?: number) {
  return request.get<any[]>({ url: '/api/category/tree', params: rootId ? { rootId } : undefined })
}

export function fetchSaveCategory(
  data: SaveCategoryPayload,
  options?: { showSuccessMessage?: boolean }
) {
  return request.post<{ code: number; msg: string; data: any }>({
    url: '/api/category/save',
    data,
    showSuccessMessage: options?.showSuccessMessage ?? true
  })
}

export function fetchDeleteCategory(id: number, options?: { showSuccessMessage?: boolean }) {
  return request.del<{ code: number; msg: string; data: boolean }>({
    url: `/api/category/${id}`,
    showSuccessMessage: options?.showSuccessMessage ?? true
  })
}
