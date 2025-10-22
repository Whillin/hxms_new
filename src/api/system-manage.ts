import request from '@/utils/http'
import { AppRouteRecord } from '@/types/router'
import { asyncRoutes } from '@/router/routes/asyncRoutes'
import { menuDataToRouter } from '@/router/utils/menuToRouter'
import type { ApiResponse } from '@/utils/table/tableCache'

// 获取用户列表
export function fetchGetUserList(params: Api.SystemManage.UserSearchParams) {
  return request.get<Api.SystemManage.UserList>({
    url: '/api/user/list',
    params
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
export function fetchGetDepartmentList(params: Api.SystemManage.DepartmentSearchParams) {
  return request.get<
    Api.SystemManage.DepartmentList | ApiResponse<Api.SystemManage.DepartmentItem>
  >({
    url: '/api/department/list',
    params
  })
}

// 保存部门（新增/编辑）
export function fetchSaveDepartment(
  data: Partial<Api.SystemManage.DepartmentItem>,
  options?: { showSuccessMessage?: boolean }
) {
  return request.post<{ success: boolean }>({
    url: '/api/department/save',
    data,
    showSuccessMessage: options?.showSuccessMessage ?? true
  })
}

// 删除部门
export function fetchDeleteDepartment(id: number) {
  return request.post<boolean>({
    url: '/api/department/delete',
    data: { id },
    showSuccessMessage: true
  })
}

// 获取员工列表
export function fetchGetEmployeeList(params: Api.SystemManage.EmployeeSearchParams) {
  return request.get<Api.SystemManage.EmployeeList>({
    url: '/api/employee/list',
    params
  })
}

// 保存员工（新增/编辑）
export function fetchSaveEmployee(data: Partial<Api.SystemManage.EmployeeItem>) {
  return request.post<boolean>({
    url: '/api/employee/save',
    data,
    showSuccessMessage: true
  })
}

// 删除员工
export function fetchDeleteEmployee(id: number) {
  return request.post<boolean>({
    url: '/api/employee/delete',
    data: { id },
    showSuccessMessage: true
  })
}

// 角色权限：获取键列表
export function fetchGetRolePermissions(params: Api.SystemManage.RolePermissionsGetParams) {
  return request.get<Api.SystemManage.RolePermissionKeys>({
    url: '/api/role/permissions',
    params
  })
}

// 角色权限：保存键列表（全量覆盖）
export function fetchSaveRolePermissions(data: Api.SystemManage.RolePermissionsSaveParams) {
  return request.post<boolean>({
    url: '/api/role/permissions/save',
    data,
    showSuccessMessage: true
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

// 获取菜单数据（模拟）
// 当前使用本地模拟路由数据，实际项目中请求接口返回 asyncRoutes.ts 文件的数据
export async function fetchGetMenuList(delay = 300): Promise<MenuResponse> {
  try {
    // 模拟接口返回的菜单数据
    const menuData = asyncRoutes
    // 处理菜单数据
    const menuList = menuData.map((route) => menuDataToRouter(route))
    // 模拟接口延迟
    await new Promise((resolve) => setTimeout(resolve, delay))

    return { menuList }
  } catch (error) {
    throw error instanceof Error ? error : new Error('获取菜单失败')
  }
}
