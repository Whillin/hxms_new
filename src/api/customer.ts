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
