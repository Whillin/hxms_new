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
import { URL } from 'url'
import { visualizer } from 'rollup-plugin-visualizer'

export default ({ mode }: { mode: string }) => {
  const root = process.cwd()
  const env = loadEnv(mode, root)
  const { VITE_VERSION, VITE_PORT, VITE_BASE_URL, VITE_API_URL, VITE_API_PROXY_URL } = env
  // 移除 mock 开关和相关逻辑，直接启用代理
  const useProxy = true
  // 优先从 VITE_API_URL 计算代理目标（取其 origin），否则回退到 VITE_API_PROXY_URL 或默认 3001
  const devApiTarget = VITE_API_URL
    ? new URL(VITE_API_URL).origin
    : VITE_API_PROXY_URL || 'http://localhost:3001'

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
              changeOrigin: true,
              secure: false
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
              // 额外拆分常见重量依赖，提升并行加载与缓存收益
              if (id.includes('/xlsx') || id.includes('node_modules/xlsx')) {
                return 'xlsx'
              }
              if (id.includes('/lodash') || id.includes('lodash-es')) {
                return 'lodash'
              }
              if (id.includes('/dayjs') || id.includes('node_modules/dayjs')) {
                return 'dayjs'
              }
              if (id.includes('/axios') || id.includes('node_modules/axios')) {
                return 'axios'
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

// 已移除所有基于本地数据的 mock 插件定义，统一走真实后端或代理
