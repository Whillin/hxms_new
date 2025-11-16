/**
 * 版本化 TTL 本地缓存
 * - 使用 localStorage，键名包含应用版本，随版本升级自动失效
 * - 面向列表与字典等稳定数据的首屏提速
 */
import { StorageConfig } from '@/utils/storage/storage-config'

export interface TtlEntry<T> {
  value: T
  createdAt: number
  expiresAt: number
}

/**
 * 生成完整缓存键：`sys-v<version>-<storeId>:<key>`
 */
function makeFullKey(storeId: string, key: string): string {
  return StorageConfig.generateStorageKey(`${storeId}:${key}`)
}

/**
 * 安全解析 JSON
 */
function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

/**
 * 读取缓存
 */
export function getCache<T>(storeId: string, key: string): T | null {
  const fullKey = makeFullKey(storeId, key)
  const entry = safeParse<TtlEntry<T>>(localStorage.getItem(fullKey))
  if (!entry) return null
  if (Date.now() >= entry.expiresAt) {
    // 过期即清理
    try {
      localStorage.removeItem(fullKey)
    } catch (err) {
      console.warn('[ttl-cache] removeItem failed (expired)', err)
    }
    return null
  }
  return entry.value
}

/**
 * 写入缓存
 */
export function setCache<T>(storeId: string, key: string, value: T, ttlMs: number): void {
  const now = Date.now()
  const fullKey = makeFullKey(storeId, key)
  const payload: TtlEntry<T> = {
    value,
    createdAt: now,
    expiresAt: now + ttlMs
  }
  try {
    localStorage.setItem(fullKey, JSON.stringify(payload))
  } catch (err) {
    // 存储满或隐私模式下失败不影响功能
    console.warn('[ttl-cache] setCache failed', err)
  }
}

/**
 * 清空某个 storeId 下的全部缓存项
 */
export function clearStore(storeId: string): void {
  const prefix = StorageConfig.generateStorageKey(`${storeId}:`)
  const keys = Object.keys(localStorage)
  keys.forEach((k) => {
    if (k.startsWith(prefix)) {
      try {
        localStorage.removeItem(k)
      } catch (err) {
        console.warn('[ttl-cache] removeItem failed (clearStore)', err)
      }
    }
  })
}

/**
 * 工具：稳定字符串化查询参数（按 key 排序，过滤分页键）
 */
export function stableParamsKey(params: Record<string, unknown> = {}): string {
  const omitKeys = new Set(['current', 'size'])
  const entries = Object.entries(params)
    .filter(([k, v]) => !omitKeys.has(k) && v !== undefined)
    .sort(([a], [b]) => (a > b ? 1 : a < b ? -1 : 0))
  return entries.map(([k, v]) => `${k}=${String(v)}`).join('&')
}

/** 默认 TTL：12 小时 */
export const DEFAULT_TTL_MS = 12 * 60 * 60 * 1000
