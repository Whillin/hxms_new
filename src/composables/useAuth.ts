import { useRoute } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useUserStore } from '@/store/modules/user'
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
  const { info } = storeToRefs(userStore)

  // 前端按钮权限（兼容多种标识形式，如：'add'、'B_ADD'）
  const frontendAuthList = info.value?.buttons ?? []

  // 后端路由 meta 配置的权限列表（例如：[{ authMark: 'add' }])
  const backendAuthList: AuthItem[] = Array.isArray(route.meta.authList)
    ? (route.meta.authList as AuthItem[])
    : []

  /**
   * 检查是否拥有某权限标识（前后端模式通用）
   * - 优先使用后端返回的按钮权限
   * - 若后端未返回或未包含该权限，则回退到路由 meta.authList
   * - 两者任一命中则认为有权限（OR 合并，避免云端按钮被错误屏蔽）
   * @param auth 权限标识
   * @returns 是否有权限
   */
  const hasAuth = (auth: string): boolean => {
    const authStr = String(auth)
    const hitFrontend = Array.isArray(frontendAuthList)
      ? frontendAuthList.some((mark) => matchPermission(String(mark), authStr))
      : false
    const hitBackend = Array.isArray(backendAuthList)
      ? backendAuthList.some((item) => matchPermission(String(item?.authMark || ''), authStr))
      : false
    return hitFrontend || hitBackend
  }

  return {
    hasAuth
  }
}
