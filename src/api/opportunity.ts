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
