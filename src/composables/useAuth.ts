import { useRoute } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useUserStore } from '@/store/modules/user'
import { useCommon } from '@/composables/useCommon'
import { matchPermission } from '@/utils/auth/permission'
import type { AppRouteRecord } from '@/types/router'

type AuthItem = NonNullable<AppRouteRecord['meta']['authList']>[number]

const userStore = useUserStore()

/**
 * 按钮权限（前后端模式通用）
 * 用法：
 * const { hasAuth } = useAuth()
 * hasAuth('add') // 检查是否拥有新增权限
 */
export const useAuth = () => {
  const route = useRoute()
  const { isFrontendMode } = useCommon()
  const { info } = storeToRefs(userStore)

  // 前端按钮权限（兼容多种标识形式，如：'add'、'B_ADD'）
  const frontendAuthList = info.value?.buttons ?? []

  // 后端路由 meta 配置的权限列表（例如：[{ authMark: 'add' }])
  const backendAuthList: AuthItem[] = Array.isArray(route.meta.authList)
    ? (route.meta.authList as AuthItem[])
    : []

  // 统一匹配逻辑已抽取到 utils/auth/permission.ts

  /**
   * 检查是否拥有某权限标识（前后端模式通用）
   * @param auth 权限标识
   * @returns 是否有权限
   */
  const hasAuth = (auth: string): boolean => {
    // 优先使用用户信息中的按钮权限（后端返回），适用于前后端两种模式
    if (Array.isArray(frontendAuthList) && frontendAuthList.length > 0) {
      return frontendAuthList.some((mark) => matchPermission(String(mark), auth))
    }

    // 若用户信息未返回按钮权限，则按模式回退
    if (isFrontendMode.value) {
      // 前端模式下无用户按钮权限时，默认无权
      return false
    }

    // 后端模式：回退使用路由 meta.authList
    return backendAuthList.some((item) => matchPermission(String(item?.authMark || ''), auth))
  }

  return {
    hasAuth
  }
}
