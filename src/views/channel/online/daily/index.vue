<template>
  <div class="channel-online-daily">
    <el-card class="mb16" shadow="hover">
      <div class="flex gap12 align-center">
        <el-select v-model="storeId" placeholder="选择门店" style="width: 220px" @change="refresh">
          <el-option v-for="s in storeOptions" :key="s.id" :label="s.name" :value="s.id" />
        </el-select>
        <el-date-picker
          v-model="date"
          type="date"
          value-format="YYYY-MM-DD"
          placeholder="选择日期"
          :disabled-date="disableFuture"
          popper-class="daily-date-popper"
          @visible-change="onDateVisibleChange"
          @change="refresh"
        />

        <el-button type="primary" @click="refresh">刷新</el-button>
        <el-tag type="info" v-if="submitted === true">已提交</el-tag>
        <el-tag type="warning" v-else>草稿</el-tag>
        <el-tag type="danger" v-if="backfillMode">补录中</el-tag>
        <div class="flex-1" />
        <el-button @click="onSave(false)">保存草稿</el-button>
        <el-button type="success" @click="onSave(true)">提交</el-button>
      </div>
    </el-card>

    <!-- 渠道总数（组织结构图样式） -->
    <el-card shadow="never" class="mb16">
      <div class="card-title">渠道总数</div>
      <div class="org-chart">
        <div v-for="group in groupedItems" :key="group.level1" class="org-group">
          <div class="org-level1">
            <span class="org-title">{{ group.level1 }}</span>
            <el-tag type="info" class="sum-tag">合计：{{ level1Sum(group.level1) }}</el-tag>
          </div>
          <div class="org-connect"><span class="line" /></div>
          <div class="org-level2-row">
            <div v-for="it in group.items" :key="it.compoundKey" class="org-level2">
              <span class="connector" />
              <div class="box">
                <div class="label">{{ it.level2 }}</div>
                <el-input-number
                  v-model="it.count"
                  size="small"
                  :controls="false"
                  :min="0"
                  :max="100000"
                  class="matrix-input"
                  @blur="onCountBlur(it, 0, 100000)"
                  @change="onCountBlur(it, 0, 100000)"
                  @keydown="digitsKeydown"
                  @paste="digitsPaste"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </el-card>

    <!-- 分配明细表（竖排） -->
    <el-card shadow="never">
      <div class="card-title">分配明细</div>
      <el-table :data="items" stripe style="width: 100%">
        <el-table-column prop="level1" label="一级渠道" width="160" />
        <el-table-column prop="level2" label="二级渠道" width="180" />
        <el-table-column label="已分配/总数" width="180">
          <template #default="{ row }">
            <span>{{ assignedTotal(row) }}/{{ row.count }}</span>
            <el-tag :type="remaining(row) === 0 ? 'success' : 'warning'" class="remain-tag">
              剩余：{{ remaining(row) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="分配详情" min-width="360">
          <template #default="{ row }">
            <div class="alloc-summary">
              <template v-if="row.allocations && row.allocations.length">
                <el-tag v-for="(a, i) in row.allocations" :key="i" type="info" class="alloc-chip">
                  {{ employeeName(a.employeeId) }}：{{ a.count }}
                </el-tag>
              </template>
              <span v-else class="muted">未分配</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="140">
          <template #default="{ row }">
            <el-button type="primary" link @click="openAllocDialog(row)">编辑分配</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 未填报天数对话框已移除：标记改为在日历中显示红点 -->

    <!-- 编辑分配对话框 -->
    <el-dialog v-model="allocDialog.visible" title="编辑分配" width="860px" class="alloc-dialog">
      <div class="alloc-list">
        <div v-for="(alloc, idx) in allocDialog.edits" :key="idx" class="alloc-row">
          <el-select
            v-model="alloc.employeeId"
            placeholder="选择员工"
            filterable
            style="width: 320px"
            :teleported="true"
            popper-class="alloc-select-popper"
            placement="bottom-start"
          >
            <el-option
              v-for="e in employeeOptions"
              :key="e.id"
              :label="e.name"
              :value="e.id"
              :disabled="isEmployeeTaken(e.id, idx)"
            />
          </el-select>
          <el-input-number
            v-model="alloc.count"
            :controls="false"
            :min="0"
            :max="1000"
            @blur="onCountBlur(alloc, 0, 1000)"
            @change="onCountBlur(alloc, 0, 1000)"
            @keydown="digitsKeydown"
            @paste="digitsPaste"
          />
          <el-button link type="danger" @click="removeDialogAlloc(idx)">移除</el-button>
        </div>
      </div>
      <div class="alloc-actions">
        <el-button type="primary" link @click="addDialogAlloc">+ 添加分配</el-button>
        <el-tag :type="dialogRemaining() === 0 ? 'success' : 'warning'" class="remain-tag">
          剩余未分配：{{ dialogRemaining() }}
        </el-tag>
      </div>
      <template #footer>
        <el-button @click="cancelAllocDialog">取消</el-button>
        <el-button type="primary" @click="commitAllocDialog">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
  import { onMounted, onUnmounted, ref, computed, nextTick } from 'vue'
  import { ElMessage } from 'element-plus'
  import { fetchGetCustomerStoreOptions } from '@/api/customer'
  import {
    fetchOnlineDailyList,
    fetchOnlineDailyListQuiet,
    saveOnlineDaily,
    fetchOnlineDailyMissingDays
  } from '@/api/channel'
  import { fetchGetEmployeeList } from '@/api/system-manage'
  import { useUserStore } from '@/store/modules/user'

  interface DailyItem {
    compoundKey: string
    level1: string
    level2: string
    count: number
    allocations?: { employeeId: number | undefined; count: number }[]
  }

  const storeOptions = ref<Array<{ id: number; name: string }>>([])
  const employeeOptions = ref<Array<{ id: number; name: string; role?: string }>>([])
  // 全量员工姓名映射（用于显示历史分配中非可选角色的姓名）
  const employeeNameMap = ref<Record<number, string>>({})
  // 允许参与分配的岗位：销售顾问、销售经理、邀约专员
  const ALLOWED_ALLOC_ROLES = new Set(['R_SALES', 'R_SALES_MANAGER', 'R_APPOINTMENT'])
  const storeId = ref<number | undefined>(undefined)
  const date = ref<string>('')
  const missingDates = ref<string[]>([])
  const items = ref<DailyItem[]>([])
  const submitted = ref<boolean>(false)
  const backfillMode = ref(false)
  const allocDialog = ref<{
    visible: boolean
    row?: DailyItem
    edits: { employeeId?: number; count: number }[]
  }>({ visible: false, row: undefined, edits: [] })
  const userStore = useUserStore()

  // 当月缺失日期缓存（5分钟过期），避免重复批量请求
  const MISSING_CACHE_TTL = 5 * 60 * 1000
  const missingCache = new Map<string, { updatedAt: number; dates: string[] }>()
  // 日期弹层 DOM 变更监听（切月、切年、翻页等）
  let popperObserver: MutationObserver | null = null
  let markUpdateTimer: number | undefined

  const todayStr = () => {
    const d = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  }

  onMounted(async () => {
    date.value = todayStr()
    await loadStores()
    await loadEmployees()
    await refresh()
    await updateMissingMarks()
  })

  async function loadStores() {
    try {
      const list = await fetchGetCustomerStoreOptions()
      storeOptions.value = list || []
      if (!storeId.value && storeOptions.value.length) {
        storeId.value = storeOptions.value[0].id
      }
    } catch (e) {
      console.error('[store-options] failed:', e)
    }
  }

  async function loadEmployees() {
    if (!storeId.value) return
    try {
      const res: any = await fetchGetEmployeeList({ current: 1, size: 200, storeId: storeId.value })
      const records = res?.records || res?.list || []
      // 构建姓名映射，确保历史分配员工（即使被过滤）也能正常显示名字
      employeeNameMap.value = {}
      for (const r of records) {
        const name = r.name || r.userName || r.employeeName
        if (Number.isFinite(Number(r.id))) employeeNameMap.value[Number(r.id)] = String(name)
      }
      // 仅保留允许参与分配的岗位
      employeeOptions.value = records
        .filter((r: any) => ALLOWED_ALLOC_ROLES.has(String(r.role)))
        .map((r: any) => ({ id: r.id, name: r.name || r.userName || r.employeeName, role: r.role }))
    } catch (e) {
      console.error('[employee-list] failed:', e)
    }
  }

  async function refresh() {
    if (!storeId.value || !date.value) return
    backfillMode.value = date.value !== todayStr()
    await loadEmployees()
    try {
      const resp = await fetchOnlineDailyList({ storeId: storeId.value, date: date.value })
      submitted.value = !!resp.submitted
      items.value = (resp.items || []).map((it: any) => ({
        compoundKey: it.compoundKey,
        level1: it.level1,
        level2: it.level2,
        count: it.count,
        allocations: (it.allocations || []).map((a: any) => ({
          employeeId: a.employeeId,
          count: a.count
        }))
      }))
    } catch (e) {
      console.error('[fetchOnlineDailyList] failed:', e)
    }
  }

  // 限制不可选择超过今天
  function disableFuture(d: Date) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return d.getTime() > today.getTime()
  }

  // 当弹层可见时，加载当月缺失日期并高亮
  async function onDateVisibleChange(visible: boolean) {
    if (!visible) {
      detachPopperObserver()
      return
    }
    // 等待弹层节点渲染完成后再进行标记，并开启监听
    await nextTick()
    await updateMissingMarks()
    attachPopperObserver()
  }

  async function updateMissingMarks() {
    if (!storeId.value) return
    // 解析当前面板显示的年月，若不可得则根据已选日期
    const panel = document.querySelector('.daily-date-popper') as HTMLElement | null
    const headerLabels = panel?.querySelectorAll('.el-date-picker__header-label') || []
    let year: number, month: number
    if (headerLabels && headerLabels.length >= 2) {
      const yearText = headerLabels[0]?.textContent || ''
      const monthText = headerLabels[1]?.textContent || ''
      const yMatch = yearText.match(/(\d{4})/)
      const mMatch = monthText.match(/(\d{1,2})/)
      if (yMatch && mMatch) {
        year = Number(yMatch[1])
        month = Number(mMatch[1])
      } else {
        const d = new Date(date.value || todayStr())
        year = d.getFullYear()
        month = d.getMonth() + 1
      }
    } else {
      // 兜底：从第一个当前月的可选日期的 aria-label 提取年月
      const firstAvail = panel?.querySelector('.el-date-table td.available') as HTMLElement | null
      const rawLabel = firstAvail?.getAttribute('aria-label') || ''
      const norm = rawLabel ? normalizeLabel(rawLabel) : null
      if (norm) {
        const parts = norm.split('-')
        year = Number(parts[0])
        month = Number(parts[1])
      } else {
        const d = new Date(date.value || todayStr())
        year = d.getFullYear()
        month = d.getMonth() + 1
      }
    }
    const pad2 = (n: number) => String(n).padStart(2, '0')
    // 规范化 aria-label 为 YYYY-MM-DD（兼容中文“2025 年 11 月 18 日”等格式）
    const normalizeLabel = (label: string): string | null => {
      const m = label.match(/(\d{4}).*?(\d{1,2}).*?(\d{1,2})/)
      if (m) {
        const y = Number(m[1])
        const mm = Number(m[2])
        const dd = Number(m[3])
        if (Number.isFinite(y) && Number.isFinite(mm) && Number.isFinite(dd)) {
          return `${y}-${pad2(mm)}-${pad2(dd)}`
        }
      }
      // 某些场景下 aria-label 可能为空或非日期字符串
      return null
    }
    const start = `${year}-${String(month).padStart(2, '0')}-01`
    // 修正：JS Date 的月份是 0-11，获取某月最后一天需使用 (month + 1, 0)
    const endDate = new Date(year, month + 1, 0)
    const end = new Date(Math.min(endDate.getTime(), new Date(todayStr()).getTime()))
    const endStr = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`
    try {
      const res = await fetchOnlineDailyMissingDays({ storeId: storeId.value, start, end: endStr })
      // 与客户端逐日计算的结果做并集，兜底后端统计遗漏的情况
      const clientList = await computeMonthlyMissingDays(year, month)
      const unionSet = new Set<string>([...(res.missing || []), ...clientList])
      missingDates.value = Array.from(unionSet)
      // 打标：根据 aria-label（如果存在）或当前月的天数
      const tds = panel?.querySelectorAll('.el-date-table td') || []
      const missingSet = new Set(missingDates.value)
      tds.forEach((td) => {
        td.classList.remove('is-missing')
        const rawLabel = (td.getAttribute('aria-label') || '').trim()
        const normalized = rawLabel ? normalizeLabel(rawLabel) : null
        if (normalized && missingSet.has(normalized)) {
          td.classList.add('is-missing')
          return
        }
        // 兼容无 aria-label 的结构：仅标记当前月的可选日期
        const isCurrentMonth =
          td.classList.contains('current') || td.classList.contains('available')
        if (!isCurrentMonth) return
        const dayEl = td.querySelector('.el-date-table-cell__text') as HTMLElement | null
        const dayNum = Number(dayEl?.textContent || '')
        if (!Number.isFinite(dayNum)) return
        const dstr = `${year}-${pad2(month)}-${pad2(dayNum)}`
        if (missingSet.has(dstr)) td.classList.add('is-missing')
      })
    } catch (e) {
      console.error('[updateMissingMarks] failed, fallback to per-day scan:', e)
      // 后端接口不可用时，前端按日查询提交状态进行缺失标记
      const list = await computeMonthlyMissingDays(year, month)
      missingDates.value = list
      const tds = panel?.querySelectorAll('.el-date-table td') || []
      const missingSet = new Set(missingDates.value)
      tds.forEach((td) => {
        td.classList.remove('is-missing')
        const rawLabel = (td.getAttribute('aria-label') || '').trim()
        const normalized = rawLabel ? normalizeLabel(rawLabel) : null
        if (normalized && missingSet.has(normalized)) {
          td.classList.add('is-missing')
          return
        }
        const isCurrentMonth =
          td.classList.contains('current') || td.classList.contains('available')
        if (!isCurrentMonth) return
        const dayEl = td.querySelector('.el-date-table-cell__text') as HTMLElement | null
        const dayNum = Number(dayEl?.textContent || '')
        if (!Number.isFinite(dayNum)) return
        const dstr = `${year}-${pad2(month)}-${pad2(dayNum)}`
        if (missingSet.has(dstr)) td.classList.add('is-missing')
      })
    }
  }

  function attachPopperObserver() {
    const panel = document.querySelector('.daily-date-popper') as HTMLElement | null
    if (!panel) return
    // 避免重复绑定
    detachPopperObserver()
    popperObserver = new MutationObserver(() => {
      // 防抖，避免连续 DOM 变更导致的频繁计算
      if (markUpdateTimer) window.clearTimeout(markUpdateTimer)
      markUpdateTimer = window.setTimeout(() => {
        updateMissingMarks()
      }, 60)
    })
    popperObserver.observe(panel, { childList: true, subtree: true })
  }

  function detachPopperObserver() {
    if (popperObserver) {
      popperObserver.disconnect()
      popperObserver = null
    }
    if (markUpdateTimer) {
      window.clearTimeout(markUpdateTimer)
      markUpdateTimer = undefined
    }
  }

  onUnmounted(() => {
    detachPopperObserver()
  })

  // 基于每日列表的提交状态，计算当月至今天的未提交日期
  async function computeMonthlyMissingDays(year: number, month: number): Promise<string[]> {
    if (!storeId.value) return []
    const key = `${storeId.value}-${year}-${month}`
    const now = Date.now()
    const cached = missingCache.get(key)
    if (cached && now - cached.updatedAt < MISSING_CACHE_TTL) return cached.dates

    const pad = (n: number) => String(n).padStart(2, '0')
    const today = new Date(todayStr())
    // 修正月份下标：获取该月最后一天
    const endDate = new Date(year, month + 1, 0)
    const end = new Date(Math.min(endDate.getTime(), today.getTime()))
    const lastDay = end.getDate()

    const dates: string[] = []
    const delay = (ms: number) => new Promise((r) => setTimeout(r, ms))
    for (let d = 1; d <= lastDay; d++) {
      const ds = `${year}-${pad(month)}-${pad(d)}`
      try {
        const resp = await fetchOnlineDailyListQuiet({ storeId: storeId.value!, date: ds })
        if (!resp.submitted) dates.push(ds)
      } catch {
        void 0
      }
      await delay(1200)
    }

    dates.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
    missingCache.set(key, { updatedAt: now, dates })
    return dates
  }

  // 分组：一级渠道 -> 二级渠道列表（用于组织结构图样式）
  const groupedItems = computed(() => {
    const groups = new Map<string, DailyItem[]>()
    for (const it of items.value) {
      const arr = groups.get(it.level1) || []
      arr.push(it)
      groups.set(it.level1, arr)
    }
    return Array.from(groups.entries()).map(([level1, arr]) => ({ level1, items: arr }))
  })
  function level1Sum(l1: string) {
    return items.value
      .filter((it) => it.level1 === l1)
      .reduce((s, it) => s + (Number(it.count) || 0), 0)
  }

  function remaining(row: DailyItem) {
    const used = (row.allocations || []).reduce((sum, a) => sum + (Number(a.count) || 0), 0)
    return Math.max(0, Number(row.count || 0) - used)
  }

  function assignedTotal(row: DailyItem) {
    return (row.allocations || []).reduce((sum, a) => sum + (Number(a.count) || 0), 0)
  }

  function validateAll(submit: boolean): boolean {
    for (const it of items.value) {
      // 校验角色与员工
      for (const a of it.allocations || []) {
        if (!a.employeeId) {
          ElMessage.error('请为每条分配选择员工')
          return false
        }
      }
      // 不允许同一员工重复分配
      const seen = new Set<number>()
      for (const a of it.allocations || []) {
        const id = Number(a.employeeId)
        if (seen.has(id)) {
          ElMessage.error('同一员工不能重复分配，请合并数量')
          return false
        }
        seen.add(id)
      }
      const total = (it.allocations || []).reduce((sum, a) => sum + (Number(a.count) || 0), 0)
      if (submit) {
        if (total !== Number(it.count)) {
          ElMessage.error('分配总数必须等于该渠道的总数')
          return false
        }
      } else {
        if (total > Number(it.count)) {
          ElMessage.error('分配总数不能超过渠道总数')
          return false
        }
      }
    }
    return true
  }

  async function onSave(submit: boolean) {
    if (!storeId.value || !date.value) return
    if (!validateAll(submit)) return
    try {
      const payload = {
        storeId: storeId.value,
        date: date.value,
        submitted: submit,
        isBackfill: backfillMode.value,
        updatedBy: userStore.info?.userId,
        items: items.value.map((it) => ({
          compoundKey: it.compoundKey,
          level1: it.level1,
          level2: it.level2,
          count: it.count,
          allocations: (it.allocations || []).map((a) => ({
            employeeId: a.employeeId!,
            count: Number(a.count) || 0
          }))
        }))
      }
      const ok = await saveOnlineDaily(payload)
      if (ok) {
        ElMessage.success(submit ? '提交成功' : '保存成功')
        await refresh()
      }
    } catch (e: any) {
      ElMessage.error(e?.message || '保存失败')
    }
  }
  // 显示姓名、编辑分配对话框逻辑与输入校验
  function employeeName(id?: number) {
    if (!id) return '未选择'
    const name = employeeNameMap.value[id]
    if (name) return name
    const emp = employeeOptions.value.find((e) => e.id === id)
    return emp?.name || String(id)
  }

  function openAllocDialog(row: DailyItem) {
    allocDialog.value.row = row
    const edits = (row.allocations || []).map((a) => ({ employeeId: a.employeeId, count: a.count }))
    allocDialog.value.edits = edits.length ? edits : [{ employeeId: undefined, count: 1 }]
    allocDialog.value.visible = true
  }

  function cancelAllocDialog() {
    allocDialog.value.visible = false
    allocDialog.value.row = undefined
    allocDialog.value.edits = []
  }

  function addDialogAlloc() {
    allocDialog.value.edits.push({ employeeId: undefined, count: 1 })
  }

  function removeDialogAlloc(idx: number) {
    allocDialog.value.edits = allocDialog.value.edits.filter((_, i) => i !== idx)
  }

  function dialogRemaining() {
    const total = allocDialog.value.row?.count || 0
    const used = (allocDialog.value.edits || []).reduce((s, a) => s + (Number(a.count) || 0), 0)
    return Math.max(0, Number(total) - used)
  }

  function commitAllocDialog() {
    const row = allocDialog.value.row
    if (!row) return
    // 基本校验：必须选择员工
    for (const a of allocDialog.value.edits) {
      if (!a.employeeId) {
        ElMessage.error('请为每条分配选择员工')
        return
      }
    }
    // 不允许同一员工重复分配
    const seen = new Set<number>()
    for (const a of allocDialog.value.edits) {
      const id = Number(a.employeeId)
      if (seen.has(id)) {
        ElMessage.error('同一员工不能重复分配，请合并数量')
        return
      }
      seen.add(id)
    }
    const total = allocDialog.value.edits.reduce((s, a) => s + (Number(a.count) || 0), 0)
    if (submitted.value) {
      if (total !== Number(row.count)) {
        ElMessage.error('分配总数必须等于该渠道的总数')
        return
      }
    } else if (total > Number(row.count)) {
      ElMessage.error('分配总数不能超过渠道总数')
      return
    }
    row.allocations = allocDialog.value.edits.map((a) => ({
      employeeId: a.employeeId!,
      count: Number(a.count) || 0
    }))
    cancelAllocDialog()
  }

  // 某员工是否已在当前弹窗中被选择（排除当前编辑行）
  function isEmployeeTaken(empId: number, excludeIdx?: number) {
    return (allocDialog.value.edits || []).some(
      (a, i) => i !== excludeIdx && Number(a.employeeId) === Number(empId)
    )
  }

  // 仅允许整数，越界自动回退
  function onCountBlur(target: { count: number | string }, min: number, max: number) {
    let v = Math.floor(Number(target.count) || 0)
    if (!Number.isFinite(v)) v = min
    if (v < min) v = min
    if (v > max) v = max
    target.count = v
  }
  // 禁止粘贴非数字
  function digitsPaste(e: ClipboardEvent) {
    const text = e.clipboardData?.getData('text') || ''
    if (!/^\d+$/.test(text)) {
      e.preventDefault()
    }
  }
  // 阻止非数字按键（保留常用控制键）
  function digitsKeydown(e: KeyboardEvent) {
    const allowed = [
      'Backspace',
      'Tab',
      'Enter',
      'ArrowLeft',
      'ArrowRight',
      'Delete',
      'Home',
      'End'
    ]
    if (allowed.includes(e.key)) return
    if (!/\d/.test(e.key)) {
      e.preventDefault()
    }
  }
</script>

<style scoped>
  .channel-online-daily {
    padding: 8px;
  }

  .flex {
    display: flex;
  }

  .flex-1 {
    flex: 1;
  }

  .gap12 {
    gap: 12px;
  }

  .align-center {
    align-items: center;
  }

  .mb16 {
    margin-bottom: 16px;
  }

  .card-title {
    margin-bottom: 8px;
    font-weight: 600;
  }

  .alloc-container {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .alloc-summary {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .alloc-row {
    display: flex;
    gap: 12px;
    align-items: center;
    margin-bottom: 8px;
  }

  .sum-tag {
    margin-left: 8px;
  }

  /* 组织结构图样式 */
  .org-chart {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .org-group {
    padding: 8px 12px;
    background: #fafafa;
    border: 1px solid #ebeef5;
    border-radius: 8px;
  }

  .org-level1 {
    display: flex;
    gap: 12px;
    align-items: center;
    justify-content: center;
    margin-bottom: 8px;
  }

  .org-title {
    padding: 6px 10px;
    font-size: 15px;
    font-weight: 600;
    color: #333;
    background: #fff;
    border: 1px solid #cdd0d6;
    border-radius: 6px;
  }

  .org-connect {
    position: relative;
    height: 16px;
  }

  .org-connect .line {
    position: absolute;
    top: 6px;
    right: 10%;
    left: 10%;
    display: block;
    height: 0;
    border-top: 1px solid #cdd0d6;
  }

  .org-level2-row {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    justify-content: center;
  }

  .org-level2 {
    position: relative;
    padding-top: 12px;
  }

  .org-level2 .connector {
    position: absolute;
    top: 0;
    left: 50%;
    width: 0;
    height: 12px;
    border-left: 1px solid #cdd0d6;
    transform: translateX(-50%);
  }

  .org-level2 .box {
    display: flex;
    gap: 10px;
    align-items: center;
    min-width: 160px;
    padding: 8px 10px;
    background: #fff;
    border: 1px solid #cdd0d6;
    border-radius: 6px;
  }

  .org-level2 .label {
    flex: 1;
    color: #333;
  }

  .matrix-input {
    width: 110px;
  }

  .alloc-actions {
    display: flex;
    gap: 12px;
    align-items: center;
  }

  .remain {
    color: #666;
  }

  .alloc-chip {
    margin-right: 8px;
    margin-bottom: 6px;
  }

  .remain-tag {
    margin-left: 8px;
  }

  .muted {
    color: #999;
  }

  /* 编辑分配弹窗优化 */
  .alloc-dialog :deep(.el-dialog__body) {
    padding: 16px 18px;
  }

  .alloc-list {
    max-height: 420px;
    padding-right: 6px;
    overflow: auto;
  }

  /* 选择框下拉面板更高更宽，避免显得很短 */
  :deep(.alloc-select-popper) {
    min-width: 320px;
  }

  :deep(.alloc-select-popper .el-select-dropdown__wrap) {
    max-height: 480px;
  }

  /* 日期选择器弹层：未填报日期仅数字高亮（更醒目且更温和） */
  :deep(.daily-date-popper .el-date-table td.is-missing .el-date-table-cell__text) {
    box-sizing: border-box;
    display: inline-block; /* 允许背景和边框包裹数字 */
    padding: 0 2px; /* 轻微内边距，降低视觉压力 */
    font-weight: 600; /* 数字加粗，更醒目 */
    color: #ff5a5f; /* 更温和的品牌红 */
    background-color: rgb(255 90 95 / 12%); /* 淡红背景，柔和提示 */
    border: 1px solid rgb(255 90 95 / 35%); /* 细边框高亮 */
    border-radius: 6px; /* 轻微圆角，避免过于尖锐 */
  }
</style>
<style>
  /* 全局样式：日期弹层挂载到 body，使用全局选择器命中弹层 */
  .daily-date-popper .el-date-table td.is-missing .el-date-table-cell__text {
    box-sizing: border-box;
    display: inline-block;
    padding: 0 2px;
    font-weight: 600;
    color: #ff5a5f;
    background-color: rgb(255 90 95 / 12%);
    border: 1px solid rgb(255 90 95 / 35%);
    border-radius: 6px;
  }
</style>
