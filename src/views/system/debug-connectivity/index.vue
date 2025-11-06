<template>
  <div class="debug-page">
    <h2>云端连通性调试</h2>
    <div class="info">
      <p>版本：{{ appVersion || '未设置' }}</p>
      <p>Mock 开关：{{ useMock }}</p>
      <p>API 代理：{{ apiProxyUrl || '未设置' }}</p>
    </div>

    <div class="actions">
      <ElButton type="primary" @click="testGetDebug">测试 GET /api/auth/debug-di</ElButton>
      <ElButton type="warning" @click="testPostLogin" style="margin-left: 8px"
        >测试 POST /api/auth/login</ElButton
      >
    </div>

    <div class="result" v-if="lastResult">
      <h3>最后一次结果</h3>
      <pre>{{ lastResult }}</pre>
    </div>
  </div>
</template>

<script setup lang="ts">
  defineOptions({ name: 'DebugConnectivity' })

  const appVersion = (typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '') as string
  const useMock = import.meta.env.VITE_USE_MOCK
  const apiProxyUrl = import.meta.env.VITE_API_PROXY_URL

  const lastResult = ref('')

  const safeStringify = (obj: unknown) => {
    try {
      return JSON.stringify(obj, null, 2)
    } catch {
      return String(obj)
    }
  }

  const testGetDebug = async () => {
    lastResult.value = ''
    try {
      const res = await fetch('/api/auth/debug-di', { method: 'GET' })
      const text = await res.text()
      lastResult.value = `HTTP ${res.status}\n` + text
    } catch (err) {
      lastResult.value = '[GET debug-di] 错误：\n' + safeStringify(err)
    }
  }

  const testPostLogin = async () => {
    lastResult.value = ''
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userName: 'Admin', password: '123456' })
      })
      const text = await res.text()
      lastResult.value = `HTTP ${res.status}\n` + text
    } catch (err) {
      lastResult.value = '[POST login] 错误：\n' + safeStringify(err)
    }
  }
</script>

<style scoped>
  .debug-page {
    padding: 16px;
  }

  .info p {
    margin: 4px 0;
  }

  .actions {
    margin: 12px 0;
  }

  .result pre {
    padding: 12px;
    background: #f7f7f7;
    border-radius: 6px;
  }
</style>
