import request from '@/utils/http'
import { AppRouteRecord } from '@/types/router'
import { asyncRoutes } from '@/router/routes/asyncRoutes'
import { menuDataToRouter } from '@/router/utils/menuToRouter'
import type { ApiResponse } from '@/utils/table/tableCache'
import {
  getCache,
  setCache,
  clearStore,
  stableParamsKey,
  DEFAULT_TTL_MS
} from '@/utils/storage/ttl-cache'

// 缓存命名空间
const DEPT_CACHE_ID = 'department:list'
const EMP_CACHE_ID = 'employee:list'

// 判断是否有除分页外的筛选条件
function hasNonPaginationFilters(params: Record<string, unknown> = {}): boolean {
  const omitKeys = new Set(['current', 'size'])
  return Object.entries(params).some(([k, v]) => !omitKeys.has(k) && v !== undefined && v !== '')
}

// 是否使用缓存：options 优先；默认仅在无筛选条件时使用
function shouldUseCache(
  params: Record<string, unknown> | undefined,
  options?: { useCache?: boolean }
): boolean {
  if (options?.useCache !== undefined) return !!options.useCache
  return !hasNonPaginationFilters(params || {})
}

// 获取用户列表
export function fetchGetUserList(params: Api.SystemManage.UserSearchParams) {
  return request.get<Api.SystemManage.UserList>({
    url: '/api/user/list',
    params
  })
}

// 保存用户（编辑）
export function fetchSaveUser(data: any) {
  return request.post<boolean>({
    url: '/api/user/save',
    data,
    showSuccessMessage: true
  })
}

// 删除用户
export function fetchDeleteUser(id: number) {
  return request.post<boolean>({
    url: '/api/user/delete',
    data: { id },
    showSuccessMessage: true
  })
}

// 获取角色列表
export function fetchGetRoleList(params: Api.SystemManage.RoleSearchParams) {
  return request.get<Api.SystemManage.RoleList>({
    url: '/api/role/list',
    params
  })
}

// 获取部门列表（树或分页列表皆可，由响应适配器处理）
export function fetchGetDepartmentList(
  params: Api.SystemManage.DepartmentSearchParams,
  options?: { useCache?: boolean; ttlHours?: number }
) {
  const useCache = shouldUseCache(params, options)
  if (useCache) {
    const key = stableParamsKey(params as unknown as Record<string, unknown>)
    const cached = getCache<
      Api.SystemManage.DepartmentList | ApiResponse<Api.SystemManage.DepartmentItem>
    >(DEPT_CACHE_ID, key)
    if (cached) return Promise.resolve(cached)
  }

  return request
    .get<Api.SystemManage.DepartmentList | ApiResponse<Api.SystemManage.DepartmentItem>>({
      url: '/api/department/list',
      params
    })
    .then((res) => {
      if (useCache) {
        const ttlMs = (options?.ttlHours || DEFAULT_TTL_MS / 3600000) * 3600000
        const key = stableParamsKey(params as unknown as Record<string, unknown>)
        setCache(DEPT_CACHE_ID, key, res, ttlMs)
      }
      return res
    })
}

// 保存部门（新增/编辑）
export function fetchSaveDepartment(
  data: Partial<Api.SystemManage.DepartmentItem>,
  options?: { showSuccessMessage?: boolean }
) {
  return request
    .post<{ success: boolean }>({
      url: '/api/department/save',
      data,
      showSuccessMessage: options?.showSuccessMessage ?? true
    })
    .then((res) => {
      // 数据变更后清理列表缓存
      clearStore(DEPT_CACHE_ID)
      return res
    })
}

// 删除部门
export function fetchDeleteDepartment(id: number) {
  return request
    .post<boolean>({
      url: '/api/department/delete',
      data: { id },
      showSuccessMessage: true
    })
    .then((res) => {
      clearStore(DEPT_CACHE_ID)
      return res
    })
}

// 获取员工列表
export function fetchGetEmployeeList(
  params: Api.SystemManage.EmployeeSearchParams,
  options?: { useCache?: boolean; ttlHours?: number }
) {
  const useCache = shouldUseCache(params, options)
  if (useCache) {
    const key = stableParamsKey(params as unknown as Record<string, unknown>, true)
    const cached = getCache<Api.SystemManage.EmployeeList>(EMP_CACHE_ID, key)
    if (cached) return Promise.resolve(cached)
  }

  return request
    .get<Api.SystemManage.EmployeeList>({
      url: '/api/employee/list',
      params
    })
    .then((res) => {
      if (useCache) {
        const ttlMs = (options?.ttlHours || DEFAULT_TTL_MS / 3600000) * 3600000
        const key = stableParamsKey(params as unknown as Record<string, unknown>, true)
        setCache(EMP_CACHE_ID, key, res, ttlMs)
      }
      return res
    })
}

// 保存员工（新增/编辑）
export function fetchSaveEmployee(data: Partial<Api.SystemManage.EmployeeItem>) {
  return request
    .post<boolean>({
      url: '/api/employee/save',
      data,
      showSuccessMessage: true
    })
    .then((res) => {
      clearStore(EMP_CACHE_ID)
      return res
    })
}

// 删除员工
export function fetchDeleteEmployee(id: number) {
  return request
    .post<boolean>({
      url: '/api/employee/delete',
      data: { id },
      showSuccessMessage: true
    })
    .then((res) => {
      clearStore(EMP_CACHE_ID)
      return res
    })
}

// 角色权限：获取键列表
export function fetchGetRolePermissions(params: Api.SystemManage.RolePermissionsGetParams) {
  const CACHE_ID = 'role_perm'
  return request
    .get<Api.SystemManage.RolePermissionKeys>({
      url: '/api/role/permissions',
      params
    })
    .then((keys) => {
      const arr = Array.isArray(keys) ? (keys as string[]) : []
      setCache<string[]>(CACHE_ID, String(params.roleId), arr, DEFAULT_TTL_MS)
      return arr
    })
}

// 角色权限：保存键列表（全量覆盖）
export function fetchSaveRolePermissions(data: Api.SystemManage.RolePermissionsSaveParams) {
  const CACHE_ID = 'role_perm'
  return request
    .post<boolean>({
      url: '/api/role/permissions/save',
      data,
      showSuccessMessage: true
    })
    .then((ok) => {
      const success = (ok as any)?.data === true || ok === true
      if (success) {
        const keys = Array.isArray((data as any)?.keys)
          ? ((data as any).keys as string[])
          : Array.isArray((data as any)?.permissionKeys)
            ? ((data as any).permissionKeys as string[])
            : []
        setCache<string[]>(CACHE_ID, String((data as any).roleId), keys, DEFAULT_TTL_MS)
      }
      return ok
    })
}

// 保存角色（新增/编辑）
export function fetchSaveRole(data: Partial<Api.SystemManage.RoleListItem>) {
  return request.post<boolean>({
    url: '/api/role/save',
    data,
    showSuccessMessage: true
  })
}

// 删除角色
export function fetchDeleteRole(roleId: number) {
  return request.post<boolean>({
    url: '/api/role/delete',
    data: { roleId },
    showSuccessMessage: true
  })
}

interface MenuResponse {
  menuList: AppRouteRecord[]
}

// 获取菜单数据（后端优先，失败回退本地）
export async function fetchGetMenuList(delay = 200): Promise<MenuResponse> {
  try {
    const resp = await request.get<{ menuList: AppRouteRecord[] } | AppRouteRecord[]>({
      url: '/api/menu/list',
      params: { _: Date.now() },
      headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
      showErrorMessage: false
    })
    const rawList = Array.isArray((resp as any)?.data)
      ? (resp as any).data
      : (resp as any)?.menuList || resp
    const menuList = (rawList as AppRouteRecord[]).map((route) => menuDataToRouter(route))
    return { menuList }
  } catch {
    const menuData = asyncRoutes
    const menuList = menuData.map((route) => menuDataToRouter(route))
    await new Promise((resolve) => setTimeout(resolve, delay))
    return { menuList }
  }
}
