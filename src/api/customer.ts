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

export function fetchGetCustomerList(
  params: CustomerListParams,
  options?: { showErrorMessage?: boolean }
) {
  return request.get<PageResult<CustomerItemDto>>({
    url: '/api/customer/list',
    params,
    showErrorMessage: options?.showErrorMessage
  })
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

export function fetchGetCustomerNewWeekCount(params?: { storeId?: number }) {
  return request.get<{ count: number; changePercent: number }>({
    url: '/api/customer/new-week-count',
    params
  })
}

export function fetchRepairCustomers(data?: { storeId?: number; size?: number }) {
  return request.post<{
    scanned: number
    updated: number
    fixedStoreId: number
    merged: number
    skippedNoClue: number
    skippedConflict: number
  }>({
    url: '/api/customer/repair',
    data,
    showSuccessMessage: true
  })
}
