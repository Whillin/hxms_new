import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import { fileURLToPath } from 'url'
import vueDevTools from 'vite-plugin-vue-devtools'
import viteCompression from 'vite-plugin-compression'
import Components from 'unplugin-vue-components/vite'
import AutoImport from 'unplugin-auto-import/vite'
import ElementPlus from 'unplugin-element-plus/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'
import type { IncomingMessage, ServerResponse } from 'http'
import { URL } from 'url'
import type { Plugin } from 'vite'
import { DEPARTMENT_TREE_DATA } from './src/mock/temp/departmentData'
import { USER_LIST_DATA } from './src/mock/temp/userData'
import { ROLE_LIST_DATA } from './src/mock/temp/roleData'
// import { visualizer } from 'rollup-plugin-visualizer'

export default ({ mode }: { mode: string }) => {
  const root = process.cwd()
  const env = loadEnv(mode, root)
  const { VITE_VERSION, VITE_PORT, VITE_BASE_URL, VITE_API_URL, VITE_API_PROXY_URL } = env
  // 当开发环境的 API_URL 使用本地前缀 /api 时，不启用代理，确保走本地 mock 中间件
  const useProxy = VITE_API_URL !== '/api' && !!VITE_API_PROXY_URL

  console.log(`🚀 API_URL = ${VITE_API_URL}`)
  console.log(`🚀 VERSION = ${VITE_VERSION}`)

  return defineConfig({
    define: {
      __APP_VERSION__: JSON.stringify(VITE_VERSION)
    },
    base: VITE_BASE_URL,
    server: {
      port: Number(VITE_PORT),
      proxy: useProxy
        ? {
            '/api': {
              target: VITE_API_PROXY_URL,
              changeOrigin: true,
              rewrite: (path) => path.replace(/^\/api/, '')
            }
          }
        : undefined,
      host: true
    },
    // 路径别名
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
        '@views': resolvePath('src/views'),
        '@imgs': resolvePath('src/assets/img'),
        '@icons': resolvePath('src/assets/icons'),
        '@utils': resolvePath('src/utils'),
        '@stores': resolvePath('src/store'),
        '@plugins': resolvePath('src/plugins'),
        '@styles': resolvePath('src/assets/styles')
      }
    },
    build: {
      target: 'es2015',
      outDir: 'dist',
      chunkSizeWarningLimit: 2000,
      minify: 'terser',
      terserOptions: {
        compress: {
          // 生产环境去除 console
          drop_console: true,
          // 生产环境去除 debugger
          drop_debugger: true
        }
      },
      dynamicImportVarsOptions: {
        warnOnError: true,
        exclude: [],
        include: ['src/views/**/*.vue']
      }
    },
    plugins: [
      vue(),
      // 开发环境部门接口拦截中间件
      departmentMockPlugin(),
      // 开发环境认证接口拦截中间件
      authMockPlugin(),
      // 开发环境员工接口拦截中间件
      employeeMockPlugin(),
      // 自动按需导入 API
      AutoImport({
        imports: ['vue', 'vue-router', '@vueuse/core', 'pinia'],
        dts: 'src/types/auto-imports.d.ts',
        eslintrc: {
          enabled: true,
          filepath: './.auto-import.json'
        },
        resolvers: [ElementPlusResolver()]
      }),
      // 自动按需导入组件
      Components({
        dts: 'src/types/components.d.ts',
        resolvers: [ElementPlusResolver()]
      }),
      // 按需定制主题配置
      ElementPlus({
        useSource: true
      }),
      // 压缩
      viteCompression({
        verbose: false, // 是否在控制台输出压缩结果
        disable: false, // 是否禁用
        algorithm: 'gzip', // 压缩算法
        ext: '.gz', // 压缩后的文件名后缀
        threshold: 10240, // 只有大小大于该值的资源会被处理 10240B = 10KB
        deleteOriginFile: false // 压缩后是否删除原文件
      }),
      vueDevTools()
      // 打包分析
      // visualizer({
      //   open: true,
      //   gzipSize: true,
      //   brotliSize: true,
      //   filename: 'dist/stats.html' // 分析图生成的文件名及路径
      // }),
    ],
    // 依赖预构建
    optimizeDeps: {
      include: ['element-plus/es/components/*/style/css']
    },
    css: {
      preprocessorOptions: {
        // sass variable and mixin
        scss: {
          additionalData: `
            @use "@styles/el-light.scss" as *; 
            @use "@styles/variables.scss" as *; 
            @use "@styles/mixin.scss" as *;
          `
        }
      },
      postcss: {
        plugins: [
          {
            postcssPlugin: 'internal:charset-removal',
            AtRule: {
              charset: (atRule) => {
                if (atRule.name === 'charset') {
                  atRule.remove()
                }
              }
            }
          }
        ]
      }
    }
  })
}

function resolvePath(paths: string) {
  return path.resolve(__dirname, paths)
}

/**
 * 部门接口开发中间件插件
 * 拦截 /api/department/list 和 /api/department/save
 */
function departmentMockPlugin(): Plugin {
  // 复制一份可变的部门数据
  const departmentData: typeof DEPARTMENT_TREE_DATA = JSON.parse(
    JSON.stringify(DEPARTMENT_TREE_DATA)
  )

  // 规范层级：品牌下挂销售部门 -> 区域 -> 门店；移除门店下的销售部门
  const normalizeDepartmentHierarchy = (nodes: any[]): any[] => {
    const generateDeptId = (brandId: number): number => {
      return (Number(brandId) || 0) * 1000 + 10
    }
    const walk = (arr: any[]) => {
      if (!Array.isArray(arr)) return
      for (const node of arr) {
        if (node.type === 'group' && Array.isArray(node.children)) {
          walk(node.children)
        } else if (node.type === 'brand') {
          const children = Array.isArray(node.children) ? node.children : []
          const regions = children.filter((c: any) => c.type === 'region')
          const others = children.filter((c: any) => c.type !== 'region')

          // 清理门店下的销售部门（门店为最低层级）
          for (const region of regions) {
            const stores = Array.isArray(region.children) ? region.children : []
            for (const store of stores) {
              if (Array.isArray(store.children) && store.children.length) {
                delete store.children
              }
            }
          }

          if (regions.length > 0) {
            let deptNode = children.find(
              (c: any) => c.type === 'department' && c.name === '销售部门'
            )
            if (!deptNode) {
              deptNode = {
                id: generateDeptId(node.id),
                name: '销售部门',
                type: 'department',
                enabled: true,
                createTime:
                  node.createTime || new Date().toISOString().slice(0, 19).replace('T', ' '),
                children: []
              }
            }
            deptNode.children = regions
            node.children = [
              ...others.filter((c: any) => c.type !== 'department'),
              deptNode
            ]
          }
        }
      }
    }
    walk(nodes)
    return nodes
  }

  normalizeDepartmentHierarchy(departmentData as any)

  // 递归过滤树形数据
  const filterTree = (
    nodes: typeof DEPARTMENT_TREE_DATA,
    predicate: (node: any) => boolean
  ): typeof DEPARTMENT_TREE_DATA => {
    const result: typeof DEPARTMENT_TREE_DATA = []
    for (const node of nodes) {
      const match = predicate(node)
      const children = Array.isArray(node.children)
        ? filterTree(node.children as any, predicate)
        : []
      if (match || children.length > 0) {
        const cloned: any = { ...node }
        if (children.length > 0) cloned.children = children
        else delete cloned.children
        result.push(cloned)
      }
    }
    return result
  }

  const parseBody = async (req: IncomingMessage): Promise<any> => {
    return new Promise((resolve) => {
      let body = ''
      req.on('data', (chunk) => (body += chunk))
      req.on('end', () => {
        try {
          resolve(body ? JSON.parse(body) : {})
        } catch (e) {
          resolve({})
        }
      })
    })
  }

  const sendJson = (res: ServerResponse, data: any) => {
    res.statusCode = 200
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify(data))
  }

  return {
    name: 'department-mock-plugin',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(async (req: IncomingMessage, res: ServerResponse, next) => {
        if (!req.url) return next()
        const url = new URL(req.url, 'http://localhost')
        const pathname = url.pathname

        if (pathname === '/api/department/list') {
          // 解析查询参数
          const name = url.searchParams.get('name') || undefined
          const type = url.searchParams.get('type') || undefined
          const brand = url.searchParams.get('brand') || undefined
          const region = url.searchParams.get('region') || undefined
          const store = url.searchParams.get('store') || undefined
          const enabledParam = url.searchParams.get('enabled')
          const enabled =
            enabledParam === null
              ? undefined
              : enabledParam === 'true' || enabledParam === '1'

          const predicate = (node: any) => {
            const nameOk = name ? String(node.name).includes(name) : true
            const typeOk = type ? String(node.type) === String(type) : true
            const brandOk = brand ? String(node.brand || '') === String(brand) : true
            const regionOk = region ? String(node.region || '') === String(region) : true
            const storeOk = store ? String(node.store || '') === String(store) : true
            const enabledOk = typeof enabled === 'boolean' ? node.enabled === enabled : true
            return nameOk && typeOk && brandOk && regionOk && storeOk && enabledOk
          }

          const filtered = filterTree(departmentData as any, predicate)
          // 统一返回结构，兼容响应拦截器
          return sendJson(res, {
            code: 200,
            msg: 'ok',
            data: filtered
          })
        }

        if (pathname === '/api/department/save') {
          const body = await parseBody(req)
          const incoming = body || {}
          const now = new Date().toISOString().slice(0, 19).replace('T', ' ')

          // 查找父节点
          const findNode = (nodes: any[], id: number): any | null => {
            for (const n of nodes) {
              if (n.id === id) return n
              if (Array.isArray(n.children)) {
                const found = findNode(n.children, id)
                if (found) return found
              }
            }
            return null
          }

          // 更新或新增
          if (incoming && typeof incoming === 'object') {
            if (incoming.id) {
              // 更新
              const target = findNode(departmentData as any, Number(incoming.id))
              if (target) {
                Object.assign(target, {
                  name: incoming.name ?? target.name,
                  type: incoming.type ?? target.type,
                  brand: incoming.brand ?? target.brand,
                  region: incoming.region ?? target.region,
                  store: incoming.store ?? target.store,
                  enabled:
                    typeof incoming.enabled === 'boolean' ? incoming.enabled : target.enabled,
                  parentId: incoming.parentId ?? target.parentId,
                  createTime: target.createTime || now
                })
              }
            } else {
              // 新增
              const maxId = (() => {
                let m = 0
                const walk = (nodes: any[]) => {
                  for (const n of nodes) {
                    m = Math.max(m, Number(n.id) || 0)
                    if (Array.isArray(n.children)) walk(n.children)
                  }
                }
                walk(departmentData as any)
                return m
              })()

              const newNode = {
                id: maxId + 1,
                name: incoming.name || '未命名部门',
                type: incoming.type || 'department',
                brand: incoming.brand,
                region: incoming.region,
                store: incoming.store,
                enabled: typeof incoming.enabled === 'boolean' ? incoming.enabled : true,
                parentId: incoming.parentId,
                createTime: now
              }

              if (incoming.parentId) {
                const parent = findNode(departmentData as any, Number(incoming.parentId))
                if (parent) {
                  // 新层级规则：group -> brand -> department -> region -> store
                  // 门店为最低层级，禁止新增子级
                  if (parent.type === 'store') {
                    return sendJson(res, {
                      code: 400,
                      msg: '门店为最低层级，不能新增子级',
                      data: { success: false }
                    }) as any
                  }
                  const nextTypeMap: Record<string, string> = {
                    group: 'brand',
                    brand: 'department',
                    department: 'region',
                    region: 'store',
                    store: 'store'
                  }
                  const expectType = nextTypeMap[parent.type]
                  // 若未明确类型，则按父级推断；若类型与期待不一致，强制修正
                  newNode.type = incoming.type || expectType
                  if (!Array.isArray(parent.children)) parent.children = []
                  parent.children.push(newNode as any)
                } else {
                  // 无父级时，只允许新增顶级集团
                  newNode.type = 'group'
                  ;(departmentData as any).push(newNode)
                }
              } else {
                ;(departmentData as any).push(newNode)
              }
            }
          }

          return sendJson(res, {
            code: 200,
            msg: '保存成功',
            data: { success: true }
          })
        }

        // 删除部门
        if (pathname === '/api/department/delete') {
          const body = await parseBody(req)
          const id = Number(body?.id)
          if (!id || Number.isNaN(id)) {
            return sendJson(res, { code: 400, msg: '缺少有效的部门ID', data: false })
          }

          const removeNode = (nodes: any[]): boolean => {
            for (let i = 0; i < nodes.length; i++) {
              const n = nodes[i]
              if (n.id === id) {
                if (Array.isArray(n.children) && n.children.length > 0) {
                  return sendJson(res, { code: 400, msg: '该部门下还有子部门，请先删除子部门', data: false }) as any
                }
                nodes.splice(i, 1)
                return true
              }
              if (Array.isArray(n.children) && n.children.length > 0) {
                const removed = removeNode(n.children)
                if (removed) return true
              }
            }
            return false
          }

          const ok = removeNode(departmentData as any)
          if (ok) {
            return sendJson(res, { code: 200, msg: '删除成功', data: true })
          }
          return sendJson(res, { code: 404, msg: '未找到部门', data: false })
        }

        next()
      })
    }
  }
}

/**
 * 开发环境认证接口拦截插件
 * 统一返回 { code, msg, data } 结构
 */
function authMockPlugin(): Plugin {
  const sendJson = (res: ServerResponse, data: any) => {
    res.statusCode = 200
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify(data))
  }

  return {
    name: 'auth-mock-plugin',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(async (req: IncomingMessage, res: ServerResponse, next) => {
        if (!req.url) return next()
        const url = new URL(req.url, 'http://localhost')
        const pathname = url.pathname

        // 登录接口
        if (pathname === '/api/auth/login' && req.method === 'POST') {
          let body = ''
          req.on('data', (chunk) => (body += chunk))
          req.on('end', () => {
            try {
              const parsed = body ? JSON.parse(body) : {}
              const { userName, password } = parsed

              if (!userName || !password) {
                return sendJson(res, { code: 400, msg: '缺少用户名或密码', data: null })
              }

              const token = `mock-token-${userName}-${Date.now()}`
              const refreshToken = `mock-refresh-${Date.now()}`
              return sendJson(res, {
                code: 200,
                msg: '登录成功',
                data: { token, refreshToken }
              })
            } catch (e) {
              return sendJson(res, { code: 400, msg: '请求体解析失败', data: null })
            }
          })
          return
        }

        // 用户信息接口
        if (pathname === '/api/user/info' && req.method === 'GET') {
          const mockUser = {
            buttons: ['B_ADD', 'B_EDIT', 'B_DELETE'],
            roles: ['R_ADMIN', 'R_SUPER'],
            userId: 1,
            userName: 'Admin',
            email: 'admin@example.com',
            avatar: ''
          }
          return sendJson(res, { code: 200, msg: '获取成功', data: mockUser })
        }

        // 用户列表接口
        if (pathname === '/api/user/list' && req.method === 'GET') {
          const searchParams = url.searchParams
          const current = parseInt(searchParams.get('current') || '1')
          const size = parseInt(searchParams.get('size') || '10')
          const userName = searchParams.get('userName') || ''
          const userStatus = searchParams.get('userStatus') || ''

          // 过滤数据
          let filteredData = USER_LIST_DATA.filter(user => {
            if (userName && !user.userName.includes(userName) && !user.nickName.includes(userName)) {
              return false
            }
            if (userStatus && user.userStatus !== userStatus) {
              return false
            }
            return true
          })

          // 分页
          const total = filteredData.length
          const startIndex = (current - 1) * size
          const endIndex = startIndex + size
          const records = filteredData.slice(startIndex, endIndex)

          return sendJson(res, {
            code: 200,
            msg: '获取成功',
            data: {
              records,
              total,
              size,
              current,
              pages: Math.ceil(total / size)
            }
          })
        }

        // 角色列表接口
        if (pathname === '/api/role/list' && req.method === 'GET') {
          const searchParams = url.searchParams
          const current = parseInt(searchParams.get('current') || '1')
          const size = parseInt(searchParams.get('size') || '10')
          const roleName = searchParams.get('roleName') || ''
          const roleStatus = searchParams.get('roleStatus') || ''

          // 过滤数据
          let filteredData = ROLE_LIST_DATA.filter(role => {
            if (roleName && !role.roleName.includes(roleName) && !role.roleCode.includes(roleName)) {
              return false
            }
            if (roleStatus && role.roleStatus !== roleStatus) {
              return false
            }
            return true
          })

          // 分页
          const total = filteredData.length
          const startIndex = (current - 1) * size
          const endIndex = startIndex + size
          const records = filteredData.slice(startIndex, endIndex)

          return sendJson(res, {
            code: 200,
            msg: '获取成功',
            data: {
              records,
              total,
              size,
              current,
              pages: Math.ceil(total / size)
            }
          })
        }

        next()
      })
    }
  }
}

/**
 * 开发环境员工接口拦截插件
 * 提供 /api/employee/list /save /delete
 */
function employeeMockPlugin(): Plugin {
  const sendJson = (res: ServerResponse, data: any) => {
    res.statusCode = 200
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify(data))
  }

  type Employee = {
    id: number
    name: string
    phone: string
    gender: 'male' | 'female' | 'other'
    status: '1' | '2'
    role: string
    brandId?: number
    regionId?: number
    storeId?: number
    hireDate?: string
  }

  // 初始员工数据（可变）
  const EMPLOYEE_LIST_DATA: Employee[] = Array.from({ length: 25 }).map((_, i) => {
    const id = i + 1
    const genders: Employee['gender'][] = ['male', 'female', 'other']
    const roles = ['R_SALES', 'R_TECH', 'R_FINANCE', 'R_HR']
    return {
      id,
      name: `员工${id}`,
      phone: `1380000${String(1000 + id).slice(-4)}`,
      gender: genders[id % genders.length],
      status: id % 5 === 0 ? '2' : '1',
      role: roles[id % roles.length],
      brandId: id % 3,
      regionId: (id % 4) + 1,
      storeId: (id % 5) + 1,
      hireDate: new Date(Date.now() - id * 86400000).toISOString().slice(0, 10)
    }
  })

  const parseBody = async (req: IncomingMessage): Promise<any> => {
    return new Promise((resolve) => {
      let body = ''
      req.on('data', (chunk) => (body += chunk))
      req.on('end', () => {
        try {
          resolve(body ? JSON.parse(body) : {})
        } catch (e) {
          resolve({})
        }
      })
    })
  }

  return {
    name: 'employee-mock-plugin',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(async (req: IncomingMessage, res: ServerResponse, next) => {
        if (!req.url) return next()
        const url = new URL(req.url, 'http://localhost')
        const pathname = url.pathname

        // 员工列表
        if (pathname === '/api/employee/list' && req.method === 'GET') {
          const current = parseInt(url.searchParams.get('current') || '1')
          const size = parseInt(url.searchParams.get('size') || '10')
          const name = url.searchParams.get('name') || ''
          const phone = url.searchParams.get('phone') || ''
          const role = url.searchParams.get('role') || ''
          const gender = url.searchParams.get('gender') || ''
          const status = url.searchParams.get('status') || ''
          const brandIdParam = url.searchParams.get('brandId')
          const regionIdParam = url.searchParams.get('regionId')
          const storeIdParam = url.searchParams.get('storeId')
          const brandId = brandIdParam !== null ? Number(brandIdParam) : undefined
          const regionId = regionIdParam !== null ? Number(regionIdParam) : undefined
          const storeId = storeIdParam !== null ? Number(storeIdParam) : undefined

          let filtered = EMPLOYEE_LIST_DATA.filter((e) => {
            if (name && !String(e.name).includes(name)) return false
            if (phone && !String(e.phone).includes(phone)) return false
            if (role && String(e.role) !== role) return false
            if (gender && String(e.gender) !== gender) return false
            if (status && String(e.status) !== status) return false
            if (typeof brandId !== 'undefined' && !Number.isNaN(brandId)) {
              if (Number(e.brandId) !== brandId) return false
            }
            if (typeof regionId !== 'undefined' && !Number.isNaN(regionId)) {
              if (Number(e.regionId) !== regionId) return false
            }
            if (typeof storeId !== 'undefined' && !Number.isNaN(storeId)) {
              if (Number(e.storeId) !== storeId) return false
            }
            return true
          })

          const total = filtered.length
          const start = (current - 1) * size
          const end = start + size
          const records = filtered.slice(start, end)

          return sendJson(res, {
            code: 200,
            msg: '获取成功',
            data: { records, total, size, current, pages: Math.ceil(total / size) }
          })
        }

        // 保存员工（新增/更新）
        if (pathname === '/api/employee/save' && req.method === 'POST') {
          const body = await parseBody(req)
          const incoming = body || {}

          if (incoming.id) {
            const idx = EMPLOYEE_LIST_DATA.findIndex((e) => e.id === Number(incoming.id))
            if (idx !== -1) {
              EMPLOYEE_LIST_DATA[idx] = {
                ...EMPLOYEE_LIST_DATA[idx],
                name: incoming.name ?? EMPLOYEE_LIST_DATA[idx].name,
                phone: incoming.phone ?? EMPLOYEE_LIST_DATA[idx].phone,
                gender: incoming.gender ?? EMPLOYEE_LIST_DATA[idx].gender,
                status: incoming.status ?? EMPLOYEE_LIST_DATA[idx].status,
                role: incoming.role ?? EMPLOYEE_LIST_DATA[idx].role,
                brandId: incoming.brandId ?? EMPLOYEE_LIST_DATA[idx].brandId,
                regionId: incoming.regionId ?? EMPLOYEE_LIST_DATA[idx].regionId,
                storeId: incoming.storeId ?? EMPLOYEE_LIST_DATA[idx].storeId,
                hireDate: incoming.hireDate ?? EMPLOYEE_LIST_DATA[idx].hireDate
              }
            }
          } else {
            const maxId = EMPLOYEE_LIST_DATA.reduce((m, e) => Math.max(m, e.id), 0)
            const newItem: Employee = {
              id: maxId + 1,
              name: incoming.name || '未命名员工',
              phone: incoming.phone || '13800000000',
              gender: incoming.gender || 'other',
              status: incoming.status || '1',
              role: incoming.role || 'R_SALES',
              brandId: incoming.brandId,
              regionId: incoming.regionId,
              storeId: incoming.storeId,
              hireDate: incoming.hireDate || new Date().toISOString().slice(0, 10)
            }
            EMPLOYEE_LIST_DATA.push(newItem)
          }

          return sendJson(res, { code: 200, msg: '保存成功', data: true })
        }

        // 删除员工
        if (pathname === '/api/employee/delete' && req.method === 'POST') {
          const body = await parseBody(req)
          const id = Number(body?.id)
          if (!id || Number.isNaN(id)) {
            return sendJson(res, { code: 400, msg: '缺少有效的ID', data: false })
          }
          const idx = EMPLOYEE_LIST_DATA.findIndex((e) => e.id === id)
          if (idx === -1) return sendJson(res, { code: 404, msg: '未找到员工', data: false })
          EMPLOYEE_LIST_DATA.splice(idx, 1)
          return sendJson(res, { code: 200, msg: '删除成功', data: true })
        }

        next()
      })
    }
  }
}
