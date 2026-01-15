import request from '@/utils/http'

export function fetchGetOpportunityList(params: Api.Opportunity.SearchParams) {
  return request.get<Api.Opportunity.List>({
    url: '/api/opportunity/list',
    params
  })
}

/** 保存/更新商机 */
export function fetchSaveOpportunity(data: Partial<Api.Opportunity.Item> & { storeId?: number }) {
  return request.post<boolean>({
    url: '/api/opportunity/save',
    data,
    showSuccessMessage: true
  })
}

/** 删除商机 */
export function fetchDeleteOpportunity(id: number) {
  return request.post<boolean>({
    url: '/api/opportunity/delete',
    data: { id },
    showSuccessMessage: true
  })
}

export function fetchGetOpportunityFollowList(params: Api.Opportunity.FollowSearchParams) {
  return request.get<Api.Opportunity.FollowList>({
    url: '/api/opportunity/follow/list',
    params
  })
}

export function fetchSaveOpportunityFollow(data: {
  opportunityId: number
  content: string
  followResult?: string
  nextContactTime: string
  status: string
  method: string
}) {
  return request.post<Api.Opportunity.FollowItem>({
    url: '/api/opportunity/follow/save',
    data,
    showSuccessMessage: false
  })
}

export function fetchDeleteOpportunityFollow(id: number) {
  return request.post<boolean>({
    url: '/api/opportunity/follow/delete',
    data: { id },
    showSuccessMessage: false
  })
}

export function fetchUpdateOpportunityFollowResult(data: { id: number; followResult?: string }) {
  return request.post<Api.Opportunity.FollowItem>({
    url: '/api/opportunity/follow/updateResult',
    data,
    showSuccessMessage: true
  })
}
