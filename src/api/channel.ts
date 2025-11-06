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
