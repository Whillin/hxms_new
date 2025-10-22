import request from '@/utils/http'

export interface ClueItem {
  id?: string | number
  visitDate?: string
  enterTime?: string
  leaveTime?: string
  receptionDuration?: number
  visitorCount?: number
  receptionStatus?: 'sales' | 'none' | 'noNeed'
  salesConsultant?: string
  customerName?: string
  visitPurpose?: '看车' | '维保' | '提车' | '续保' | '咨询' | '拜访'
  isReserved?: boolean
  visitCategory?: '首次' | '再次'
  customerPhone?: string
  focusModelId?: number
  focusModelName?: string
  testDrive?: boolean
  bargaining?: boolean
  dealDone?: boolean
  dealModelId?: number
  dealModelName?: string
  businessSource?: string
  channelCategory?: string
  channelLevel1?: string
  channelLevel2?: string
  convertOrRetentionModel?: string
  referrer?: string
  contactTimes?: number
  opportunityLevel?: 'H' | 'A' | 'B' | 'C'
  userGender?: '男' | '女' | '未知'
  userAge?: number
  buyExperience?: '首购' | '换购' | '增购'
  userPhoneModel?: string
  currentBrand?: string
  currentModel?: string
  carAge?: number
  mileage?: number
  livingArea?: string | string[]
  storeId?: number
  regionId?: number
  brandId?: number
  departmentId?: number
  createdBy?: number
  createdAt?: string
  updatedAt?: string
}

export interface ClueListParams {
  current: number
  size: number
  customerName?: string
  customerPhone?: string
  opportunityLevel?: string
  dealDone?: string | boolean
  daterange?: [string, string] | undefined
}

export interface PaginatedClueResponse {
  records: ClueItem[]
  total: number
  current: number
  size: number
}

export function fetchGetClueList(params: ClueListParams) {
  return request.get<PaginatedClueResponse>({ url: '/api/clue/list', params })
}

export function fetchSaveClue(body: Partial<ClueItem>) {
  return request.post<boolean>({ url: '/api/clue/save', params: body, showSuccessMessage: true })
}

export function fetchDeleteClue(id: number | string) {
  return request.post<boolean>({ url: '/api/clue/delete', params: { id }, showSuccessMessage: true })
}