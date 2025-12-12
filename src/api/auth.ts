import request from '@/utils/http'

/**
 * 登录
 * @param params 登录参数
 * @returns 登录响应
 */
export function fetchLogin(params: Api.Auth.LoginParams) {
  return request.post<Api.Auth.LoginResponse>({
    url: '/api/auth/login',
    data: params
    // showSuccessMessage: true // 显示成功消息
    // showErrorMessage: false // 不显示错误消息
  })
}

/**
 * 获取用户信息
 * @returns 用户信息
 */
export function fetchGetUserInfo() {
  return request.get<Api.Auth.UserInfo>({
    url: '/api/user/info',
    params: { _: Date.now() },
    headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' }
  })
}

/**
 * 获取用户信息（可指定token覆盖）
 */
export function fetchGetUserInfoWithToken(token?: string) {
  if (token) {
    return request.get<Api.Auth.UserInfo>({
      url: '/api/user/info',
      params: { _: Date.now() },
      headers: { Authorization: `Bearer ${token}`, 'Cache-Control': 'no-cache', Pragma: 'no-cache' }
    })
  }
  return fetchGetUserInfo()
}

/**
 * 注册
 * @param params 注册参数
 * @returns 注册响应（与登录一致，返回token与refreshToken）
 */
export function fetchRegister(params: Api.Auth.RegisterParams) {
  return request.post<Api.Auth.LoginResponse>({
    url: '/api/auth/register',
    data: params
  })
}

/**
 * 刷新令牌，获取新的 token 与 refreshToken
 */
export function fetchRefresh(refreshToken: string) {
  return request.post<Api.Auth.LoginResponse>({
    url: '/api/auth/refresh',
    data: { refreshToken }
  })
}
