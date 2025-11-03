import request from '@/utils/http'

export interface CustomerListParams {
  current: number
  size: number
  userName?: string
  userPhone?: string
  userGender?: '男' | '女' | '未知'
  userAge?: number
  buyExperience?: '首购' | '换购' | '增购'
  userPhoneModel?: string
  currentBrand?: string
  currentModel?: string
  livingArea?: string | string[]
}

export interface CustomerItemDto {
  id: number
  userName: string
  userPhone: string
  userGender: '男' | '女' | '未知'
  userAge: number
  buyExperience: '首购' | '换购' | '增购'
  userPhoneModel: string
  currentBrand: string
  currentModel: string
  carAge: number
  mileage: number
  livingArea: string | string[]
  storeId: number
}

export interface PageResult<T> {
  records: T[]
  total: number
  current: number
  size: number
}

export function fetchGetCustomerList(params: CustomerListParams) {
  return request.get<PageResult<CustomerItemDto>>({ url: '/api/customer/list', params })
}

export function fetchSaveCustomer(
  data: Partial<CustomerItemDto> & { id: number },
  options?: { showSuccessMessage?: boolean }
) {
  return request.post<boolean>({
    url: '/api/customer/save',
    data,
    showSuccessMessage: options?.showSuccessMessage ?? true
  })
}

export function fetchDeleteCustomer(id: number, options?: { showSuccessMessage?: boolean }) {
  return request.post<boolean>({
    url: '/api/customer/delete',
    data: { id },
    showSuccessMessage: options?.showSuccessMessage ?? true
  })
}

export function fetchGetCustomerStoreOptions() {
  return request.get<Array<{ id: number; name: string }>>({ url: '/api/customer/store-options' })
}
