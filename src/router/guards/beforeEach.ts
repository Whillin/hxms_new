import type { Router, RouteLocationNormalized, NavigationGuardNext } from 'vue-router'
import { ref, nextTick } from 'vue'
import NProgress from 'nprogress'
import { useSettingStore } from '@/store/modules/setting'
import { useUserStore } from '@/store/modules/user'
import { useMenuStore } from '@/store/modules/menu'
import { setWorktab } from '@/utils/navigation'
import { setPageTitle } from '../utils/utils'
import { fetchGetMenuList, fetchGetRoleList, fetchGetRolePermissions } from '@/api/system-manage'
import { registerDynamicRoutes } from '../utils/registerRoutes'
import { AppRouteRecord } from '@/types/router'
import { RoutesAlias } from '../routesAlias'
import { menuDataToRouter } from '../utils/menuToRouter'
import { asyncRoutes } from '../routes/asyncRoutes'
import { staticRoutes } from '../routes/staticRoutes'
import { loadingService } from '@/utils/ui'
import { useCommon } from '@/composables/useCommon'
import { useWorktabStore } from '@/store/modules/worktab'
import { fetchGetUserInfo } from '@/api/auth'
import { fetchRefresh } from '@/api/auth'
import { fetchOnlineDailyTodayCompletion } from '@/api/channel'

// 本地预览降级：当访问模式为前端或显式开启跳过鉴权时，不触发后端鉴权相关请求
const DEV_SKIP_AUTH =
  String(import.meta.env.VITE_ACCESS_MODE || '').toLowerCase() === 'frontend' ||
  String(import.meta.env.VITE_DEV_SKIP_AUTH || '').toLowerCase() === 'true'

// 是否已注册动态路由
const isRouteRegistered = ref(false)

// 跟踪是否需要关闭 loading
const pendingLoading = ref(false)

/**
 * 设置路由全局前置守卫
 */
export function setupBeforeEachGuard(router: Router): void {
  router.beforeEach(
    async (
      to: RouteLocationNormalized,
      from: RouteLocationNormalized,
      next: NavigationGuardNext
    ) => {
      try {
        await handleRouteGuard(to, from, next, router)
      } catch (error) {
        console.error('路由守卫处理失败:', error)
        next('/exception/500')
      }
    }
  )

  // 设置后置守卫以关闭 loading 和进度条
  setupAfterEachGuard(router)
}

/**
 * 设置路由全局后置守卫
 */
function setupAfterEachGuard(router: Router): void {
  router.afterEach(() => {
    // 关闭进度条
    const settingStore = useSettingStore()
    if (settingStore.showNprogress) {
      NProgress.done()
    }

    // 关闭 loading 效果
    if (pendingLoading.value) {
      nextTick(() => {
        loadingService.hideLoading()
        pendingLoading.value = false
      })
    }
  })
}

/**
 * 处理路由守卫逻辑
 */
async function handleRouteGuard(
  to: RouteLocationNormalized,
  from: RouteLocationNormalized,
  next: NavigationGuardNext,
  router: Router
): Promise<void> {
  const settingStore = useSettingStore()
  const userStore = useUserStore()

  // 处理进度条
  if (settingStore.showNprogress) {
    NProgress.start()
  }

  // 处理登录状态
  if (!(await handleLoginStatus(to, userStore, next))) {
    return
  }

  // 处理动态路由注册
  if (!isRouteRegistered.value && userStore.isLogin) {
    await handleDynamicRoutes(to, from, next, router)
    return
  }

  // 处理根路径跳转到首页
  if (userStore.isLogin && isRouteRegistered.value && handleRootPathRedirect(to, next)) {
    return
  }

  // 处理已知的匹配路由
  if (to.matched.length > 0) {
    setWorktab(to)
    setPageTitle(to)
    next()
    return
  }

  // 路由未匹配：尝试重新获取菜单并注册缺失路由（支持热更新新增路由）
  if (userStore.isLogin) {
    try {
      await getMenuData(router)
      const reMatched = router.resolve(to.fullPath)
      if (reMatched.matched && reMatched.matched.length > 0) {
        next({ path: to.path, query: to.query, hash: to.hash, replace: true })
        return
      }
    } catch {
      void 0
    }
  }

  // 未匹配到路由，跳转到 404
  next(RoutesAlias.Exception404)
}

/**
 * 处理登录状态
 */
async function handleLoginStatus(
  to: RouteLocationNormalized,
  userStore: ReturnType<typeof useUserStore>,
  next: NavigationGuardNext
): Promise<boolean> {
  // 检查是否为静态路由
  const isStaticRoute = isRouteInStaticRoutes(to.path)

  if (!userStore.isLogin && to.path !== RoutesAlias.Login && !isStaticRoute) {
    if (DEV_SKIP_AUTH) {
      userStore.setLoginStatus(true)
      return true
    } else {
      userStore.logOut()
      next(RoutesAlias.Login)
      return false
    }
  }
  return true
}

/**
 * 检查路由是否为静态路由
 */
function isRouteInStaticRoutes(path: string): boolean {
  const checkRoute = (routes: any[], targetPath: string): boolean => {
    return routes.some((route) => {
      if (route.path === targetPath) {
        return true
      }
      if (route.children && route.children.length > 0) {
        return checkRoute(route.children, targetPath)
      }
      return false
    })
  }

  return checkRoute(staticRoutes, path)
}

/**
 * 处理动态路由注册
 */
async function handleDynamicRoutes(
  to: RouteLocationNormalized,
  from: RouteLocationNormalized,
  next: NavigationGuardNext,
  router: Router
): Promise<void> {
  try {
    // 显示 loading 并标记 pending
    pendingLoading.value = true
    loadingService.showLoading()

    // 获取用户信息
    const userStore = useUserStore()

    // 如果是本地预览降级模式：直接走前端菜单，不请求后端接口
    if (DEV_SKIP_AUTH) {
      // 补齐最小用户信息以保证角色过滤逻辑正常运行
      if (!userStore.info || Object.keys(userStore.info).length === 0) {
        userStore.setUserInfo({
          buttons: [],
          roles: ['R_ADMIN'],
          userId: 0,
          userName: 'PreviewUser',
          email: ''
        } as Api.Auth.UserInfo)
      }

      // 直接按前端模式注册菜单
      await processFrontendMenu(router)

      // 处理根路径跳转
      if (handleRootPathRedirect(to, next)) {
        return
      }

      next({ path: to.path, query: to.query, hash: to.hash, replace: true })
      return
    }
    // 初始化阶段：若存在刷新令牌且本会话尚未刷新，先刷新一次以获取最新角色
    try {
      const onceKey = 'once_refreshed_token'
      const hasOnce = sessionStorage.getItem(onceKey) === '1'
      if (userStore.isLogin && userStore.refreshToken && !hasOnce) {
        const refreshed = await fetchRefresh(userStore.refreshToken)
        if (refreshed?.token) {
          userStore.setToken(refreshed.token, refreshed.refreshToken)
          sessionStorage.setItem(onceKey, '1')
        }
      }
    } catch (err: any) {
      const status = err?.response?.status ?? err?.statusCode ?? err?.response?.data?.statusCode
      if (status === 401) {
        userStore.logOut()
        loadingService.hideLoading()
        next(RoutesAlias.Login)
        return
      }
      // 其他错误不阻断后续流程，继续获取用户信息与菜单
      console.warn('初始化刷新失败，继续后续流程', err)
    }

    const isRefresh = from.path === '/'
    if (isRefresh || !userStore.info || Object.keys(userStore.info).length === 0) {
      try {
        const data = await fetchGetUserInfo()
        userStore.setUserInfo(data)
      } catch (error: any) {
        console.error('获取用户信息失败', error)
        const status =
          error?.response?.status ?? error?.statusCode ?? error?.response?.data?.statusCode
        if (status === 401) {
          // 鉴权失败：登出并跳转登录页，而不是 500
          userStore.logOut()
          loadingService.hideLoading()
          next(RoutesAlias.Login)
          return
        }
        // 非鉴权错误，交由外层捕获并展示 500
        throw error
      }
    }

    await getMenuData(router)

    // 处理根路径跳转
    if (handleRootPathRedirect(to, next)) {
      return
    }

    next({
      path: to.path,
      query: to.query,
      hash: to.hash,
      replace: true
    })
  } catch (error) {
    console.error('动态路由注册失败:', error)
    next('/exception/500')
  }
}

/**
 * 获取菜单数据
 */
async function getMenuData(router: Router): Promise<void> {
  try {
    if (useCommon().isFrontendMode.value) {
      await processFrontendMenu(router)
    } else {
      await processBackendMenu(router)
    }
  } catch (error) {
    handleMenuError(error)
    throw error
  }
}

/**
 * 处理前端控制模式的菜单逻辑
 */
async function processFrontendMenu(router: Router): Promise<void> {
  const menuList = asyncRoutes.map((route) => menuDataToRouter(route))
  const userStore = useUserStore()
  const rolesRaw = Array.isArray(userStore.info.roles) ? userStore.info.roles : []
  const rolesNoUser = rolesRaw.filter((r) => r !== 'R_USER')
  const name = String(userStore.info?.userName || '')
  const isAdminUser = name.toLowerCase() === 'admin'
  const rolesFinal = Array.from(
    new Set([...rolesNoUser, ...(isAdminUser ? ['R_ADMIN', 'R_SUPER'] : [])])
  )

  if (!rolesFinal.length) {
    throw new Error('获取用户角色失败')
  }

  let filteredMenuList = filterMenuByRoles(menuList, rolesFinal)

  const allowedNames = DEV_SKIP_AUTH ? null : await getAllowedRouteNamesForCurrentUser()
  const isExplicitSuper =
    rolesFinal.includes('R_SUPER') && (!rolesFinal.includes('R_ADMIN') || isAdminUser)
  if (isExplicitSuper) {
    // 超级管理员跳过权限键过滤，默认全菜单
    if (!filteredMenuList || filteredMenuList.length < 5) {
      filteredMenuList = asyncRoutes.map((route) => menuDataToRouter(route))
    }
  } else if (allowedNames) {
    filteredMenuList = filterMenuByPermissionNames(filteredMenuList, allowedNames)
  }

  await registerAndStoreMenu(router, filteredMenuList)
}

/**
 * 处理后端控制模式的菜单逻辑
 */
async function processBackendMenu(router: Router): Promise<void> {
  const { menuList } = await fetchGetMenuList()
  const userStore = useUserStore()
  const rolesRaw = Array.isArray(userStore.info.roles) ? userStore.info.roles : []
  const roles = rolesRaw.filter((r) => r !== 'R_USER')
  const name = String(userStore.info?.userName || '')
  const isAdminUser = name.toLowerCase() === 'admin'
  const rolesFinal = Array.from(
    new Set([
      ...(Array.isArray(roles) ? roles : []),
      ...(isAdminUser ? ['R_ADMIN', 'R_SUPER'] : [])
    ])
  )
  // 超级管理员/管理员优先使用本地完整菜单，避免后端返回的“裁剪列表”限制超管视图
  const sourceMenu =
    rolesFinal.includes('R_SUPER') || rolesFinal.includes('R_ADMIN')
      ? asyncRoutes.map((route) => menuDataToRouter(route))
      : menuList

  // 若后端菜单包含 meta.roles，则也按角色进行一次过滤；无该字段时原样保留
  let filteredMenuList = filterMenuByRoles(sourceMenu, rolesFinal)

  // 补充：为非管理员角色注入独立的“个人中心”顶级路由，避免被 /system 父级 roles 过滤掉
  const ensureUserCenterStandalone = (list: AppRouteRecord[]): AppRouteRecord[] => {
    const exists = (routes: AppRouteRecord[], target: string): boolean => {
      return routes.some((r) => {
        if (r.path === target) return true
        if (Array.isArray(r.children) && r.children.length) {
          return exists(r.children, target)
        }
        return false
      })
    }

    // 如果后端已返回 /user-center 或 /system/user-center，则不重复添加
    const hasUserCenter = exists(list, '/user-center') || exists(list, '/system/user-center')
    if (hasUserCenter) return list

    const userCenterRoute: AppRouteRecord = {
      path: '/user-center',
      name: 'UserCenterStandalone',
      component: RoutesAlias.UserCenter, // 复用现有页面组件
      meta: {
        title: 'menus.system.userCenter',
        isHide: true,
        keepAlive: true,
        isHideTab: true
      }
    }

    return [...list, userCenterRoute]
  }

  const allowedNames = await getAllowedRouteNamesForCurrentUser()
  const isExplicitSuper =
    rolesFinal.includes('R_SUPER') && (!rolesFinal.includes('R_ADMIN') || isAdminUser)
  if (isExplicitSuper) {
    // 超级管理员跳过权限键过滤，默认全菜单
    if (!filteredMenuList || filteredMenuList.length < 5) {
      filteredMenuList = asyncRoutes.map((route) => menuDataToRouter(route))
    }
  } else if (allowedNames) {
    filteredMenuList = filterMenuByPermissionNames(filteredMenuList, allowedNames)
  }

  const finalMenuList = ensureUserCenterStandalone(filteredMenuList)
  await registerAndStoreMenu(router, finalMenuList)
}

/**
 * 递归过滤空菜单项
 */
function filterEmptyMenus(menuList: AppRouteRecord[]): AppRouteRecord[] {
  return menuList
    .map((item) => {
      // 如果有子菜单，先递归过滤子菜单
      if (item.children && item.children.length > 0) {
        const filteredChildren = filterEmptyMenus(item.children)
        return {
          ...item,
          children: filteredChildren
        }
      }
      return item
    })
    .filter((item) => {
      // 过滤掉布局组件且没有子菜单的项
      const isEmptyLayoutMenu =
        item.component === RoutesAlias.Layout && (!item.children || item.children.length === 0)

      // 过滤掉组件为空字符串且没有子菜单的项，但保留有外链的菜单项
      const isEmptyComponentMenu =
        item.component === '' &&
        (!item.children || item.children.length === 0) &&
        item.meta.isIframe !== true &&
        !item.meta.link

      return !(isEmptyLayoutMenu || isEmptyComponentMenu)
    })
}

/**
 * 注册路由并存储菜单数据
 */
async function registerAndStoreMenu(router: Router, menuList: AppRouteRecord[]): Promise<void> {
  if (!isValidMenuList(menuList)) {
    throw new Error('获取菜单列表失败，请重新登录')
  }
  const menuStore = useMenuStore()
  // 递归过滤掉为空的菜单项
  const list = filterEmptyMenus(menuList)
  try {
    const exists = (routes: AppRouteRecord[], target: string): boolean => {
      return routes.some((r) => {
        if (r.path === target) return true
        if (Array.isArray(r.children) && r.children.length) return exists(r.children, target)
        return false
      })
    }
    const hasSystemUserCenter = exists(list, '/system/user-center')
    const hasStandalone = exists(list, '/user-center')
    if (!hasSystemUserCenter && hasStandalone) {
      const userCenterAlias: AppRouteRecord = {
        path: '/system/user-center',
        name: 'UserCenterAlias',
        component: RoutesAlias.UserCenter,
        meta: { title: 'menus.system.userCenter', isHide: true, keepAlive: true, isHideTab: true }
      }
      list.push(userCenterAlias)
    }
  } catch {
    void 0
  }

  // 动态设置“线索管理”红点提示：店长/总监（含管理员）且当日未完成填报
  try {
    const userStore = useUserStore()
    const roles = Array.isArray(userStore.info?.roles) ? userStore.info!.roles : []
    const isMgr =
      roles.includes('R_STORE_MANAGER') ||
      roles.includes('R_STORE_DIRECTOR') ||
      roles.includes('R_ADMIN') ||
      roles.includes('R_SUPER')
    const storeIdNum = Number(userStore.info?.storeId || 0)
    if (isMgr && storeIdNum > 0) {
      const res = await fetchOnlineDailyTodayCompletion({ storeId: storeIdNum })
      const incomplete = !!(res as any)?.data?.incomplete
      if (incomplete) {
        const markBadge = (nodes: AppRouteRecord[]) => {
          nodes.forEach((it) => {
            if (String(it.path || '').startsWith('/clue')) {
              it.meta = { ...it.meta, showBadge: true }
            }
            if (Array.isArray(it.children) && it.children.length) markBadge(it.children)
          })
        }
        markBadge(list)
      }
    }
  } catch (e) {
    console.error('菜单红点处理失败:', e)
  }

  menuStore.setMenuList(list)
  registerDynamicRoutes(router, list)
  isRouteRegistered.value = true
  useWorktabStore().validateWorktabs(router)
}

/**
 * 处理菜单相关错误
 */
function handleMenuError(error: unknown): void {
  console.error('菜单处理失败:', error)
  useUserStore().logOut()
  throw error instanceof Error ? error : new Error('获取菜单列表失败，请重新登录')
}

/**
 * 根据角色过滤菜单
 */
const filterMenuByRoles = (menu: AppRouteRecord[], roles: string[]): AppRouteRecord[] => {
  // 超级管理员 / 管理员全局放行：直接返回原菜单（仅保留空项过滤在后续步骤）
  if (roles?.includes('R_SUPER') || roles?.includes('R_ADMIN')) {
    return menu.map((item) => {
      const cloned = { ...item }
      if (cloned.children?.length) {
        cloned.children = filterMenuByRoles(cloned.children, roles)
      }
      return cloned
    })
  }
  return menu.reduce((acc: AppRouteRecord[], item) => {
    const itemRoles = item.meta?.roles
    const hasPermission = !itemRoles || itemRoles.some((role) => roles?.includes(role))

    if (hasPermission) {
      const filteredItem = { ...item }
      if (filteredItem.children?.length) {
        filteredItem.children = filterMenuByRoles(filteredItem.children, roles)
      }
      acc.push(filteredItem)
    }

    return acc
  }, [])
}

/**
 * 验证菜单列表是否有效
 */
function isValidMenuList(menuList: AppRouteRecord[]): boolean {
  return Array.isArray(menuList) && menuList.length > 0
}

/**
 * 依据角色权限键派生允许的路由 name 集合
 * - 权限键格式：RouteName 或 RouteName_action（取前半段）
 * - 多角色用户：合并（并集）
 */
async function getAllowedRouteNamesForCurrentUser(): Promise<Set<string> | null> {
  try {
    const userStore = useUserStore()
    const codesRaw = Array.isArray(userStore.info?.roles) ? userStore.info!.roles : []
    const codes = codesRaw.filter((c) => c !== 'R_USER')
    console.debug('[权限派生] 用户角色', { raw: codesRaw, codes })
    if (!codes.length) return null

    const uname = String(userStore.info?.userName || '').toLowerCase()
    const isExplicitSuper =
      codes.includes('R_SUPER') && (!codes.includes('R_ADMIN') || uname === 'admin')
    if (isExplicitSuper) return null

    const res = await fetchGetRoleList({ current: 1, size: 9999 } as any)
    const records = (res as any)?.data?.records ?? (res as any)?.records ?? []
    const codeToId: Record<string, number> = {}
    const nameToId: Record<string, number> = {}
    if (Array.isArray(records)) {
      records.forEach((r: any) => {
        if (r?.roleCode && typeof r?.roleId === 'number') codeToId[r.roleCode] = r.roleId
        if (r?.roleName && typeof r?.roleId === 'number') nameToId[r.roleName] = r.roleId
      })
    }
    console.debug('[权限派生] 角色列表映射', { codeToId, nameToId })

    const normalize = (v: string) => {
      if (v === '管理员') return 'R_ADMIN'
      if (v === '超级管理员') return 'R_SUPER'
      return v
    }

    const getIdFromLocal = (code: string): number | undefined => {
      try {
        const v = localStorage.getItem(`role_perm_id:${code}`)
        const n = v ? Number(v) : NaN
        return Number.isFinite(n) ? n : undefined
      } catch {
        return undefined
      }
    }

    const keysByRole: Record<string, Set<string>> = {}
    for (const raw of codes) {
      const codeNorm = normalize(raw)
      const roleId =
        codeToId[codeNorm] ??
        nameToId[codeNorm] ??
        codeToId[raw] ??
        nameToId[raw] ??
        getIdFromLocal(codeNorm) ??
        getIdFromLocal(raw)
      console.debug('[权限派生] 角色映射', { raw, code: codeNorm, roleId })
      if (!roleId) continue
      const resp = await fetchGetRolePermissions({ roleId })
      const keys: string[] = (resp as any)?.data ?? (Array.isArray(resp) ? (resp as any) : [])
      console.debug('[权限派生] 权限键', {
        roleId,
        count: Array.isArray(keys) ? keys.length : 0,
        keys
      })
      if (Array.isArray(keys) && keys.length) {
        keysByRole[codeNorm] = new Set(keys.map((x) => String(x)))
      }
    }

    const roleCodes = Object.keys(keysByRole)
    if (roleCodes.length === 0) return null

    // 优先：如果管理员/超管有配置，使用其配置（满足你的“管理员也可被限制”的诉求）
    const adminSet = keysByRole['R_ADMIN'] || keysByRole['管理员']
    const superSet = keysByRole['R_SUPER'] || keysByRole['超级管理员']
    const preferSet = adminSet || superSet
    let finalSet: Set<string>
    if (preferSet) {
      finalSet = preferSet
    } else {
      // 否则：对所有有配置的角色做“交集”，确保多角色不会因为并集而越权
      finalSet = roleCodes
        .map((c) => keysByRole[c])
        .reduce(
          (acc, cur) => {
            if (!acc) return new Set(cur)
            const next = new Set<string>()
            cur.forEach((k) => {
              if (acc.has(k)) next.add(k)
            })
            return next
          },
          undefined as unknown as Set<string>
        )
      // 交集为空则回退到“并集”，避免误把菜单清空
      if (!finalSet || finalSet.size === 0) {
        finalSet = roleCodes
          .map((c) => keysByRole[c])
          .reduce((acc, cur) => {
            cur.forEach((k) => acc.add(k))
            return acc
          }, new Set<string>())
      }
    }

    const names = new Set<string>()
    finalSet.forEach((k) => {
      const base = String(k).split('_')[0]
      if (base) names.add(base)
    })
    console.debug('[权限派生] 路由名', { size: names.size, names: Array.from(names) })
    return names
  } catch (e) {
    console.warn('派生权限路由名失败:', e)
    return null
  }
}

/**
 * 按允许的路由 name 过滤菜单
 * - 保留自身命中或子孙命中节点
 */
function filterMenuByPermissionNames(
  menu: AppRouteRecord[],
  allowedNames: Set<string>
): AppRouteRecord[] {
  const walk = (nodes: AppRouteRecord[]): AppRouteRecord[] => {
    return nodes
      .map((n) => {
        const cloned = { ...n }
        if (Array.isArray(cloned.children) && cloned.children.length) {
          cloned.children = walk(cloned.children)
        }
        const selfHit = !!cloned.name && allowedNames.has(String(cloned.name))
        const childHit = Array.isArray(cloned.children) && cloned.children.length > 0
        return selfHit || childHit ? cloned : null
      })
      .filter((x): x is AppRouteRecord => !!x)
  }
  return walk(menu)
}

/**
 * 重置路由相关状态
 */
export function resetRouterState(): void {
  isRouteRegistered.value = false
  const menuStore = useMenuStore()
  menuStore.removeAllDynamicRoutes()
  menuStore.setMenuList([])
}

/**
 * 处理根路径跳转到首页
 */
function handleRootPathRedirect(to: RouteLocationNormalized, next: NavigationGuardNext): boolean {
  if (to.path === '/') {
    const { homePath } = useCommon()
    const target = homePath.value && homePath.value !== '/' ? homePath.value : RoutesAlias.Dashboard
    next({ path: target, replace: true })
    return true
  }
  return false
}
