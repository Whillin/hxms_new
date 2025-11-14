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
import { visualizer } from 'rollup-plugin-visualizer'

export default ({ mode }: { mode: string }) => {
  const root = process.cwd()
  const env = loadEnv(mode, root)
  const {
    VITE_VERSION,
    VITE_PORT,
    VITE_BASE_URL,
    VITE_API_URL,
    VITE_API_PROXY_URL
  } = env
  // 移除 mock 开关和相关逻辑，直接启用代理
  const useProxy = true
  // 优先从 VITE_API_URL 计算代理目标（取其 origin），否则回退到 VITE_API_PROXY_URL 或默认 3001
  const devApiTarget = VITE_API_URL
    ? new URL(VITE_API_URL).origin
    : (VITE_API_PROXY_URL || 'http://localhost:3001')
  
  // 移除 mock 相关的日志
  console.log(`🚀 API_URL = ${VITE_API_URL}`)
  console.log(`🚀 VERSION = ${VITE_VERSION}`)
  console.log(`[proxy] useProxy=${useProxy} target=${devApiTarget}`)

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
      // 开发自检插件：已禁用，避免在后端未准备时产生不必要的请求与错误日志
      
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
 * 开发自检插件：在 dev 服务启动后，自动对线索接口执行一次端到端校验
 * 步骤：
 *  A. 初始列表
 *  B. 缺少手机号的必填校验
 *  C. 完整必填新增
 *  D. 手机号过滤列表
 *  E. 编辑更改销售顾问
 *  F. 再次列表确认不新增且字段更新
 */
function clueSelfCheckPlugin(): Plugin {
  return {
    name: 'clue-self-check-plugin',
    apply: 'serve',
    configureServer(server) {
      const run = async () => {
        const port = Number(server.config.server.port || 5173)
        const baseUrl = `http://localhost:${port}`
        const log = (...args: any[]) => console.log('[clue-self-check]', ...args)

        const get = async (url: string) => {
          const res = await fetch(baseUrl + url)
          const text = await res.text()
          log('GET', url, res.status, text)
          return text
        }
        const post = async (url: string, body: any) => {
          const res = await fetch(baseUrl + url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
          })
          const text = await res.text()
          log('POST', url, res.status, text)
          return text
        }

        try {
          log('start', baseUrl)
          await get('/api/clue/list?current=1&size=5')
          await post('/api/clue/save', {
            customerName: '王五',
            storeId: 11,
            visitDate: '2025-11-14'
          })
          await post('/api/clue/save', {
            id: 900001,
            customerName: '王五',
            customerPhone: '13900001111',
            storeId: 11,
            visitDate: '2025-11-14',
            receptionStatus: 'sales',
            salesConsultant: '张三',
            enterTime: '2025-11-14 10:00:00',
            leaveTime: '2025-11-14 12:00:00'
          })
          await get('/api/clue/list?current=1&size=10&customerPhone=13900001111')
          await post('/api/clue/save', {
            id: 900001,
            customerName: '王五',
            customerPhone: '13900001111',
            storeId: 11,
            visitDate: '2025-11-14',
            receptionStatus: 'sales',
            salesConsultant: '李四'
          })
          await get('/api/clue/list?current=1&size=10&customerPhone=13900001111')
          log('done')
        } catch (e: any) {
          log('error', e?.message || e)
        }
      }

      // 延迟触发，确保 dev 服务端口就绪
      setTimeout(run, 1500)
    }
  }
}

// 已移除所有基于本地数据的 mock 插件定义，统一走真实后端或代理
