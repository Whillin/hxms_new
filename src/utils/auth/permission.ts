/**
 * 权限匹配工具：统一 v-auth 指令与 useAuth.hasAuth 的匹配行为
 * 支持：
 * - 原样匹配（如 'add'）
 * - 大小写与带前缀匹配（如 'B_ADD'/'b_add'）
 * - 带模块前缀的权限键后缀匹配（如 'ClueLeads_add' 匹配 'add'）
 */

/** 归一化候选集 */
export function normalizeCandidates(auth: string): string[] {
  const lower = String(auth).toLowerCase()
  const upper = String(auth).toUpperCase()
  return [auth, lower, upper, `B_${upper}`, `b_${lower}`]
}

/**
 * 匹配权限标识
 * @param mark 实际权限键（可能为带模块前缀，如 'Module_action'）
 * @param auth 期望动作（如 'add'）
 */
export function matchPermission(mark: string, auth: string): boolean {
  const candidates = normalizeCandidates(auth)
  const str = String(mark)
  const parts = str.split('_')
  const last = parts[parts.length - 1] || str
  const lastLower = last.toLowerCase()
  const lastUpper = last.toUpperCase()

  return (
    candidates.includes(str) ||
    candidates.includes(last) ||
    candidates.includes(lastLower) ||
    candidates.includes(lastUpper) ||
    candidates.includes(`B_${lastUpper}`) ||
    candidates.includes(`b_${lastLower}`)
  )
}
