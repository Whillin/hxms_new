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
import { visualizer } from 'rollup-plugin-visualizer'

export default ({ mode }: { mode: string }) => {
  const root = process.cwd()
  const env = loadEnv(mode, root)
  const {
    VITE_VERSION,
    VITE_PORT,
    VITE_BASE_URL,
    VITE_API_URL,
    VITE_API_PROXY_URL,
    VITE_USE_MOCK
  } = env
  // mock 开关（显式开启才启用）：仅当设置为 'true' 时启用本地 mock
  const useMock = VITE_USE_MOCK === 'true'
  // 默认本地后端端口为 3001；如需改端口请在 .env.development 设置 VITE_API_PROXY_URL
  const devApiTarget = VITE_API_PROXY_URL || 'http://localhost:3001'
  // 使用代理的条件：显式关闭 mock 时启用代理到后端
  const useProxy = !useMock

  console.log(`🚀 API_URL = ${VITE_API_URL}`)
  console.log(`🚀 VERSION = ${VITE_VERSION}`)
  console.log(`[proxy] useMock=${useMock} useProxy=${useProxy} target=${devApiTarget}`)

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
              target: devApiTarget,
              changeOrigin: true
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
    // 全局注入 SCSS 变量和 mixin（避免各处重复 @use）
    css: {
      preprocessorOptions: {
        scss: {
          additionalData: "@use '@styles/variables.scss' as *; @use '@styles/mixin.scss' as *;"
        }
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
      },
      sourcemap: false, // 禁用sourcemap以减少打包大小
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            if (id.includes('node_modules')) {
              if (id.includes('vue') || id.includes('vue-router') || id.includes('pinia')) {
                return 'vue-vendor'
              }
              if (id.includes('element-plus')) {
                return 'element-plus'
              }
              if (id.includes('echarts')) {
                return 'echarts'
              }
              return 'vendor'
            }
          }
        }
      }
    },
    plugins: [
      vue(),
      // 轻量代理日志：在开发时打印 /api 请求，便于排障
      {
        name: 'proxy-logger',
        apply: 'serve',
        configureServer(server) {
          server.middlewares.use((req, _res, next) => {
            if (req.url && req.url.startsWith('/api/')) {
              const m = (req.method || 'GET').toUpperCase()
              console.log(`[proxy-logger] ${m} ${req.url}`)
            }
            next()
          })
        }
      },
      // 根据开关启用/禁用本地 mock 插件
      ...(useMock ? [departmentMockPlugin(), authMockPlugin(), employeeMockPlugin()] : []),
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
        useSource: false
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
      vueDevTools(),
      // 打包分析
      visualizer({
        open: true,
        gzipSize: true,
        brotliSize: true,
        filename: 'dist/stats.html' // 分析图生成的文件名及路径
      })
    ],
    // 依赖预构建
    optimizeDeps: {
      include: ['element-plus/es/components/*/style/css']
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
  const now = new Date().toISOString()

  const parseBody = async (req: IncomingMessage): Promise<any> => {
    return new Promise((resolve) => {
      let body = ''
      req.on('data', (chunk) => (body += chunk))
      req.on('end', () => {
        try {
          resolve(body ? JSON.parse(body) : {})
        } catch {
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
            enabledParam === null ? undefined : enabledParam === 'true' || enabledParam === '1'

          const predicate = (node: any) => {
            const nameOk = name ? String(node.name).includes(name) : true
            const typeOk = type ? String(node.type) === String(type) : true
            const brandOk = brand ? String(node.brand || '') === String(brand) : true
            const regionOk = region ? String(node.region || '') === String(region) : true
            const storeOk = store ? String(node.store || '') === String(store) : true
            const enabledOk = typeof enabled === 'boolean' ? node.enabled === enabled : true
            return nameOk && typeOk && brandOk && regionOk && storeOk && enabledOk
          }

          const filterTree = (nodes: any[], predicate: (node: any) => boolean) => {
            return nodes
              .map((node) => ({ ...node }))
              .filter((node) => {
                if (predicate(node)) return true
                if (Array.isArray(node.children)) {
                  node.children = filterTree(node.children, predicate)
                  return node.children.length > 0
                }
                return false
              })
          }

          const tree = filterTree(departmentData as any, predicate)
          return sendJson(res, { code: 200, msg: '获取成功', data: tree })
        }

        if (pathname === '/api/department/save' && req.method === 'POST') {
          const body = await parseBody(req)
          const incoming = body || {}

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
                name: String(incoming.name || '未命名部门'),
                type: String(incoming.type || '0'),
                brand: String(incoming.brand || ''),
                region: String(incoming.region || ''),
                store: String(incoming.store || ''),
                enabled: typeof incoming.enabled === 'boolean' ? incoming.enabled : true,
                parentId: Number(incoming.parentId || 0),
                createTime: now,
                children: []
              }

              if (newNode.parentId) {
                const parent = findNode(departmentData as any, newNode.parentId)
                if (parent) {
                  parent.children = parent.children || []
                  parent.children.push(newNode)
                }
              } else {
                ;(departmentData as any[]).push(newNode)
              }
            }

            return sendJson(res, { code: 200, msg: '保存成功' })
          }

          return sendJson(res, { code: 200, msg: '参数错误' })
        }

        next()
      })
    }
  }
}

function authMockPlugin(): Plugin {
  return {
    name: 'auth-mock-plugin',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(async (req: IncomingMessage, res: ServerResponse, next) => {
        if (!req.url) return next()
        const url = new URL(req.url, 'http://localhost')
        const pathname = url.pathname

        if (pathname === '/api/auth/login' && req.method === 'POST') {
          const body = await new Promise<string>((resolve) => {
            let data = ''
            req.on('data', (chunk) => (data += chunk))
            req.on('end', () => resolve(data))
          })
          const json = body ? JSON.parse(body) : {}

          if (json.username && json.password) {
            const token = 'dev-token-' + Math.random().toString(36).slice(2)
            res.statusCode = 200
            res.setHeader('Content-Type', 'application/json')
            return res.end(
              JSON.stringify({ code: 200, msg: '登录成功', data: { token, refreshToken: token } })
            )
          }

          res.statusCode = 200
          res.setHeader('Content-Type', 'application/json')
          return res.end(JSON.stringify({ code: 400, msg: '用户名或密码错误' }))
        }

        next()
      })
    }
  }
}

function employeeMockPlugin(): Plugin {
  return {
    name: 'employee-mock-plugin',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(async (req: IncomingMessage, res: ServerResponse, next) => {
        if (!req.url) return next()
        const url = new URL(req.url, 'http://localhost')
        const pathname = url.pathname

        if (pathname === '/api/user/list') {
          res.statusCode = 200
          res.setHeader('Content-Type', 'application/json')
          return res.end(JSON.stringify({ code: 200, msg: '获取成功', data: USER_LIST_DATA }))
        }

        next()
      })
    }
  }
}
