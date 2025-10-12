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

  console.log(`🚀 API_URL = ${VITE_API_URL}`)
  console.log(`🚀 VERSION = ${VITE_VERSION}`)

  return defineConfig({
    define: {
      __APP_VERSION__: JSON.stringify(VITE_VERSION)
    },
    base: VITE_BASE_URL,
    server: {
      port: Number(VITE_PORT),
      proxy: {
        '/api': {
          target: VITE_API_PROXY_URL,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, '')
        }
      },
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
                  // 仅允许在门店下新增部门
                  if (parent.type !== 'store') {
                    return sendJson(res, { code: 400, msg: '仅允许在门店下新增部门', data: false })
                  }
                  if (!Array.isArray(parent.children)) parent.children = []
                  parent.children.push(newNode as any)
                } else {
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
