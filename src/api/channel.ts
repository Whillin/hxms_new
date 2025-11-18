import request from '@/utils/http'

export interface ChannelOptionsResponse {
  level1: string[]
  level2Map: Record<string, { label: string; value: string }[]>
  metaByLevel1: Record<string, { category: string; businessSource: string }>
}

export function fetchChannelOptions() {
  return request.get<{
    level1: string[]
    level2Map: Record<string, { label: string; value: string }[]>
    metaByLevel1: Record<string, { category: string; businessSource: string }>
  }>({ url: '/api/channel/options' })
}

export function fetchOnlineDailyList(params: { storeId: number; date: string }) {
  return request.get<{
    items: {
      compoundKey: string
      level1: string
      level2: string
      count: number
      allocations?: { employeeId: number; count: number }[]
    }[]
    submitted: boolean
  }>({
    url: '/api/channel/online/daily/list',
    params
  })
}

/** 静默版本：用于批量查询提交状态，不弹错误提示 */
export function fetchOnlineDailyListQuiet(params: { storeId: number; date: string }) {
  return request.get<{
    items: {
      compoundKey: string
      level1: string
      level2: string
      count: number
      allocations?: { employeeId: number; count: number }[]
    }[]
    submitted: boolean
  }>({
    url: '/api/channel/online/daily/list',
    params,
    showErrorMessage: false
  })
}

export function saveOnlineDaily(data: {
  storeId: number
  date: string
  items: {
    compoundKey: string
    level1: string
    level2: string
    count: number
    allocations?: { employeeId: number; count: number }[]
  }[]
  submitted?: boolean
  /** 非当日补录标记 */
  isBackfill?: boolean
  /** 记录更新人（用于补录审计）*/
  updatedBy?: number | string
}) {
  return request.post<boolean>({ url: '/api/channel/online/daily/save', data })
}

export function fetchOnlineDailyTodayCompletion(params: { storeId: number }) {
  return request.get<{ date: string; incomplete: boolean; submittedCount: number; total: number }>({
    url: '/api/channel/online/daily/today/completion',
    params,
    showErrorMessage: false
  })
}

export function fetchOnlineDailyMissingDays(params: {
  storeId: number
  start: string
  end: string
}) {
  return request.get<{ missing: string[]; count: number; range: { start: string; end: string } }>({
    url: '/api/channel/online/daily/missing-days',
    params,
    // 该接口用于标记日历缺失天数，后端可能尚未发布此路由或受权限限制。
    // 前端不弹出错误提示，交由调用方自行降级处理。
    showErrorMessage: false
  })
}
