import request from '@/utils/http'

/** 获取个人资料 */
export function fetchGetProfile() {
  return request.get<Api.UserCenter.Profile>({
    url: '/api/user/profile'
  })
}

/** 保存个人资料 */
export function fetchSaveProfile(params: Api.UserCenter.SaveProfileParams) {
  return request.post<Api.UserCenter.Profile>({
    url: '/api/user/profile',
    data: params,
    showSuccessMessage: true
  })
}

/** 修改密码 */
export function fetchChangePassword(params: Api.UserCenter.ChangePasswordParams) {
  return request.post<boolean>({
    url: '/api/user/change-password',
    data: params,
    showSuccessMessage: true
  })
}