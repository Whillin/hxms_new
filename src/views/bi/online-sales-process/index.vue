<template>
  <div class="bi-sales">
    <el-card class="art-custom-card" style="margin-bottom: 12px">
      <div class="filters">
        <el-radio-group v-model="periodType" size="small">
          <el-radio-button label="day">日</el-radio-button>
          <el-radio-button label="week">周</el-radio-button>
          <el-radio-button label="month">月</el-radio-button>
          <el-radio-button label="year">年</el-radio-button>
        </el-radio-group>
        <el-date-picker
          v-if="periodType === 'day'"
          v-model="dateDay"
          type="daterange"
          range-separator="至"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          value-format="YYYY-MM-DD"
          size="small"
          style="margin-left: 8px"
          :disabled-date="disableFutureDate"
        />
        <el-date-picker
          v-if="periodType === 'week'"
          v-model="dateWeek"
          type="week"
          placeholder="选择周"
          size="small"
          style="margin-left: 8px"
          :disabled-date="disableFutureDate"
        />
        <el-date-picker
          v-if="periodType === 'month'"
          v-model="dateMonth"
          type="month"
          placeholder="选择月份"
          size="small"
          style="margin-left: 8px"
          :disabled-date="disableFutureDate"
        />
        <el-date-picker
          v-if="periodType === 'year'"
          v-model="dateYear"
          type="year"
          placeholder="选择年份"
          size="small"
          style="margin-left: 8px"
          :disabled-date="disableFutureDate"
        />

        <el-select
          v-model="storeId"
          placeholder="选择门店"
          size="small"
          style="width: 180px; margin-left: 8px"
        >
          <el-option v-for="s in stores" :key="s.value" :label="s.label" :value="s.value" />
        </el-select>

        <el-select
          v-if="enableCompare && funnelType === 'store'"
          v-model="compareStoreId"
          placeholder="对比门店"
          size="small"
          style="width: 180px; margin-left: 8px"
        >
          <el-option
            v-for="s in stores"
            :key="'cmp-' + s.value"
            :label="s.label"
            :value="s.value"
          />
        </el-select>

        <el-select
          v-if="enableCompare && funnelType === 'person'"
          v-model="compareTeamId"
          placeholder="对比小组"
          size="small"
          style="width: 180px; margin-left: 8px"
        >
          <el-option v-for="t in teamOptions" :key="t.value" :label="t.label" :value="t.value" />
        </el-select>

        <el-select
          v-if="enableCompare && funnelType === 'person'"
          v-model="compareConsultantId"
          placeholder="对比顾问"
          size="small"
          style="width: 180px; margin-left: 8px"
        >
          <el-option
            v-for="c in consultants"
            :key="'cmpc-' + c.value"
            :label="c.label"
            :value="c.value"
          />
        </el-select>

        <el-select
          v-if="funnelType === 'person'"
          v-model="teamId"
          placeholder="选择小组"
          size="small"
          style="width: 180px; margin-left: 8px"
        >
          <el-option
            v-for="t in teamOptions"
            :key="'mt-' + t.value"
            :label="t.label"
            :value="t.value"
          />
        </el-select>

        <el-select
          v-if="funnelType === 'person'"
          v-model="consultantId"
          placeholder="选择销售顾问"
          size="small"
          style="width: 180px; margin-left: 8px"
        >
          <el-option v-for="c in consultants" :key="c.value" :label="c.label" :value="c.value" />
        </el-select>

        <el-select
          v-if="funnelType === 'model'"
          v-model="modelId"
          placeholder="选择车型"
          size="small"
          style="width: 180px; margin-left: 8px"
        >
          <el-option v-for="m in modelsView" :key="m.value" :label="m.label" :value="m.value" />
        </el-select>

        <el-select
          v-if="enableCompare && funnelType === 'model'"
          v-model="compareModelId"
          placeholder="对比车型"
          size="small"
          style="width: 180px; margin-left: 8px"
        >
          <el-option
            v-for="m in modelsView"
            :key="'cmpm-' + m.value"
            :label="m.label"
            :value="m.value"
          />
        </el-select>

        <el-select
          v-if="false"
          v-model="oem"
          placeholder="选择OEM"
          size="small"
          style="width: 160px; margin-left: 8px"
        >
          <el-option v-for="o in oems" :key="o.value" :label="o.label" :value="o.value" />
        </el-select>

        <el-select
          v-model="channelType"
          placeholder="渠道一级"
          size="small"
          style="width: 160px; margin-left: 8px"
        >
          <el-option v-for="o in channels" :key="o.value" :label="o.label" :value="o.value" />
        </el-select>

        <el-select
          v-model="channelLevel2"
          placeholder="渠道二级"
          size="small"
          style="width: 160px; margin-left: 8px"
        >
          <el-option
            v-for="o in channelLevel2Options"
            :key="o.value"
            :label="o.label"
            :value="o.value"
          />
        </el-select>

        <el-button type="primary" size="small" style="margin-left: 8px" @click="apply">
          应用
        </el-button>
        <el-button
          size="small"
          style="margin-left: 8px"
          :loading="insightLoading"
          @click="fetchInsight"
        >
          智能解读
        </el-button>

        <el-switch
          v-model="enableCompare"
          active-text="对比模式"
          size="small"
          style="margin-left: 8px"
        />
        <el-switch
          v-if="enableCompare"
          v-model="overlayMode"
          active-text="叠加展示"
          size="small"
          style="margin-left: 8px"
        />
        <el-button size="small" style="margin-left: 6px" @click="reset">重置</el-button>
      </div>
    </el-card>

    <div
      class="charts-row"
      :class="{ single: !(enableCompare && hasCompareSelection) }"
      v-if="!overlayMode"
    >
      <el-card class="art-custom-card funnel-card">
        <div class="card-title">{{ leftTitle }}</div>
        <el-table :data="tableRows" border style="width: 100%">
          <el-table-column prop="stage" label="环节" min-width="360">
            <template #header>
              <div class="stage-header">
                <span>环节</span>
                <span class="note">注：该漏斗图展示效果非实际数据比例</span>
              </div>
            </template>
            <template #default="scope">
              <div class="stage-cell">
                <span>{{ scope.row.stage }}</span>
                <el-tooltip
                  v-if="stageInfoMap[scope.row.stage]"
                  :content="stageInfoMap[scope.row.stage]"
                  placement="top"
                >
                  <el-icon class="info-icon"><InfoFilled /></el-icon>
                </el-tooltip>
              </div>
              <div class="progress stacked">
                <div class="bar" :style="{ width: scope.row.percent + '%' }"></div>
                <span
                  class="bar-overlay-text"
                  :style="percentLabelStyle(scope.row.percent)"
                  :class="{ light: scope.row.percent === 0 }"
                  >{{ scope.row.percentText }}%</span
                >
              </div>
            </template>
          </el-table-column>
          <el-table-column
            prop="value"
            label="实际量"
            width="120"
            align="center"
            header-align="center"
          />
          <el-table-column
            prop="momText"
            label="MOM"
            width="120"
            align="center"
            header-align="center"
          >
            <template #default="scope">
              <span :class="scope.row.momClass">{{ scope.row.momText }}</span>
            </template>
          </el-table-column>
        </el-table>
      </el-card>
      <el-card v-if="enableCompare && hasCompareSelection" class="art-custom-card funnel-card">
        <div class="card-title">{{ compareTitle }}</div>
        <el-table :data="tableRowsRight" border style="width: 100%">
          <el-table-column prop="stage" label="环节" min-width="360">
            <template #header>
              <div class="stage-header">
                <span>环节</span>
                <span class="note">注：该漏斗图展示效果非实际数据比例</span>
              </div>
            </template>
            <template #default="scope">
              <div class="stage-cell">
                <span>{{ scope.row.stage }}</span>
                <el-tooltip
                  v-if="stageInfoMap[scope.row.stage]"
                  :content="stageInfoMap[scope.row.stage]"
                  placement="top"
                >
                  <el-icon class="info-icon"><InfoFilled /></el-icon>
                </el-tooltip>
              </div>
              <div class="progress stacked">
                <div class="bar" :style="{ width: scope.row.percent + '%' }"></div>
                <span
                  class="bar-overlay-text"
                  :style="percentLabelStyle(scope.row.percent)"
                  :class="{ light: scope.row.percent === 0 }"
                  >{{ scope.row.percentText }}%</span
                >
              </div>
            </template>
          </el-table-column>
          <el-table-column
            prop="value"
            label="实际量"
            width="120"
            align="center"
            header-align="center"
          />
          <el-table-column
            prop="momText"
            label="MOM"
            width="120"
            align="center"
            header-align="center"
          >
            <template #default="scope">
              <span :class="scope.row.momClass">{{ scope.row.momText }}</span>
            </template>
          </el-table-column>
        </el-table>
      </el-card>
    </div>

    <div v-else>
      <el-card class="art-custom-card">
        <div class="card-title">{{ overlayTitle }}</div>
        <div class="legend">
          <span class="legend-item"><i class="legend-dot dot-a"></i>{{ legendA }}</span>
          <span v-if="hasCompareSelection" class="legend-item">
            <i class="legend-dot dot-b"></i>{{ legendB }}
          </span>
        </div>
        <el-table :data="tableRowsCombined" border style="width: 100%">
          <el-table-column prop="stage" label="环节" min-width="360">
            <template #default="scope">
              <div class="stage-cell">
                <span>{{ scope.row.stage }}</span>
              </div>
              <div class="progress split">
                <div class="bar bar-a" :style="{ width: scope.row.shareA + '%' }"></div>
                <div
                  v-if="hasCompareSelection"
                  class="bar bar-b"
                  :style="{ width: scope.row.shareB + '%', left: scope.row.shareA + '%' }"
                ></div>
                <span class="bar-overlay-text" :style="{ left: scope.row.shareA / 2 + '%' }"
                  >{{ scope.row.shareAText }}%</span
                >
                <span
                  v-if="hasCompareSelection"
                  class="bar-overlay-text light"
                  :style="{ left: scope.row.shareA + scope.row.shareB / 2 + '%' }"
                  >{{ scope.row.shareBText }}%</span
                >
              </div>
            </template>
          </el-table-column>
          <el-table-column
            prop="valueA"
            label="实际量A"
            width="120"
            align="center"
            header-align="center"
          />
          <el-table-column
            v-if="hasCompareSelection"
            prop="valueB"
            label="实际量B"
            width="120"
            align="center"
            header-align="center"
          />
        </el-table>
      </el-card>
    </div>

    <el-card class="art-custom-card" v-if="insight">
      <div class="card-title">{{ insight.title }}</div>
      <div class="insight-block">
        <div class="insight-section">
          <div class="insight-subtitle">概要</div>
          <ul>
            <li v-for="(s, i) in insight.summary" :key="'s-' + i">{{ s }}</li>
          </ul>
        </div>
        <div class="insight-section">
          <div class="insight-subtitle">关键指标</div>
          <div class="metrics">
            <span v-for="m in insight.metrics" :key="m.name" class="metric">
              {{ m.name }}：{{ m.value }}（{{ m.percent }}%）
            </span>
          </div>
        </div>
        <div class="insight-section" v-if="insight.issues && insight.issues.length">
          <div class="insight-subtitle">问题定位</div>
          <ul>
            <li v-for="(s, i) in insight.issues" :key="'i-' + i">{{ s }}</li>
          </ul>
        </div>
        <div class="insight-section">
          <div class="insight-subtitle">行动建议</div>
          <ul>
            <li v-for="(s, i) in insight.actions" :key="'a-' + i">{{ s }}</li>
          </ul>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
  defineOptions({ name: 'BIOnlineSalesProcess' })
  const props = defineProps<{ title?: string }>()

  import request from '@/utils/http'
  import { fetchGetCustomerStoreOptions } from '@/api/customer'
  import { fetchGetEmployeeList } from '@/api/system-manage'
  import { fetchGetDepartmentList } from '@/api/system-manage'
  import { fetchGetProductList, fetchGetModelsByStore } from '@/api/product'
  import { fetchChannelOptions } from '@/api/channel'
  import { useUserStore } from '@/store/modules/user'

  import { InfoFilled } from '@element-plus/icons-vue'

  const periodType = ref<'day' | 'week' | 'month' | 'year'>('month')
  const dateDay = ref<string | [string, string]>('')
  const dateWeek = ref<string>('')
  const dateMonth = ref<string>('')
  const dateYear = ref<string>('')

  const getMonthStr = (v: any): string => {
    if (v === undefined || v === null || v === '') return ''
    if (typeof v === 'string') {
      const s = v.trim()
      if (/^\d{4}-\d{2}$/.test(s)) return s
      const d = new Date(s)
      if (!Number.isNaN(d.getTime()))
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      return ''
    }
    if (typeof v === 'number') {
      const d = new Date(v)
      if (!Number.isNaN(d.getTime()))
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      return ''
    }
    if (v instanceof Date) {
      const d = v as Date
      if (!Number.isNaN(d.getTime()))
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    }
    return ''
  }

  const storeId = ref<number | ''>('')
  const funnelType = ref<'store' | 'person' | 'model'>('store')
  const compareModelId = ref<number | ''>('')
  const compareStoreId = ref<number | ''>('')
  const compareTeamId = ref<number | ''>('')
  const compareConsultantId = ref<number | ''>('')

  const overlayMode = ref<boolean>(false)
  const enableCompare = ref<boolean>(false)
  const modelId = ref<number | ''>('')
  const consultantId = ref<number | ''>('')
  const oem = ref<string>('')
  const channelType = ref<string>('')
  const stores = ref<Array<{ label: string; value: number | '' }>>([
    { label: '全部门店', value: '' }
  ])
  const consultants = ref<Array<{ label: string; value: number | '' }>>([
    { label: '全部顾问', value: '' }
  ])
  const modelsAll = ref<Array<{ label: string; value: number | ''; brand?: string }>>([
    { label: '全部车型', value: '' }
  ])
  const models = ref<Array<{ label: string; value: number | '' }>>([
    { label: '全部车型', value: '' }
  ])
  const storeBrandById = ref<Record<number, string>>({})
  const accountBrand = ref<string>('')
  const normalizeStageLabel = (s: string) => {
    return String(s) === '全部订单数量' ? '全部商机数量' : String(s)
  }
  const normalizeBrand = (s: string) => {
    const t = String(s || '').toLowerCase()
    if (/小鹏|xpeng/.test(t)) return 'xpeng'
    if (/奥迪|audi/.test(t)) return 'audi'
    if (/比亚迪|byd/.test(t)) return 'byd'
    if (/特斯拉|tesla/.test(t)) return 'tesla'
    return t.trim()
  }
  const detectBrandFromText = (text: string) => {
    const t = String(text || '').toLowerCase()
    if (/小鹏|xpeng/.test(t)) return 'xpeng'
    if (/奥迪|audi/.test(t)) return 'audi'
    if (/比亚迪|byd/.test(t)) return 'byd'
    if (/特斯拉|tesla/.test(t)) return 'tesla'
    return ''
  }
  const currentBrand = computed(() => {
    const sid = storeId.value
    const fallback = normalizeBrand(String(userStore.info?.brandName || accountBrand.value || ''))
    if (sid === '' || !sid) return fallback || ''
    const sidNum = Number(sid)
    const mapped = storeBrandById.value[sidNum]
    if (mapped) return mapped
    const s = stores.value.find((x) => x.value === sid)
    const name = String(s?.label || '')
    const byName = detectBrandFromText(name)
    if (byName) return byName
    return fallback || ''
  })
  const modelsView = computed(() => {
    const brand = currentBrand.value
    if (!brand) return modelsAll.value.map((m) => ({ label: m.label, value: m.value }))
    const list = modelsAll.value.filter((m) => String(m.brand || '') === String(brand))
    const out = [{ label: '全部车型', value: '' } as { label: string; value: number | '' }]
    list.forEach((m) => out.push({ label: m.label, value: m.value }))
    return out
  })
  const oems = ref<Array<{ label: string; value: string }>>([{ label: '全部OEM', value: '' }])
  const channels = ref<Array<{ label: string; value: string }>>([{ label: '全部渠道', value: '' }])
  const channelLevel2 = ref<string>('')
  const channelLevel2Options = ref<Array<{ label: string; value: string }>>([
    { label: '全部二级', value: '' }
  ])
  const channelMetaByLevel1 = ref<Record<string, { category: string; businessSource: string }>>({})
  const level2Map = ref<Record<string, { label: string; value: string }[]>>({})
  const teamOptions = ref<Array<{ label: string; value: number | '' }>>([])

  const userStore = useUserStore()

  const loadStores = async () => {
    try {
      const res = await fetchGetCustomerStoreOptions()
      const list = Array.isArray(res) ? res : []
      const opts: Array<{ label: string; value: number | '' }> = [{ label: '全部门店', value: '' }]
      list.forEach((s: any) => {
        const idNum = Number(s.id)
        const label = String(s.name || s.storeName || idNum)
        if (Number.isFinite(idNum)) opts.push({ label, value: idNum })
      })
      stores.value = opts
      const detected = new Set<string>()
      stores.value.forEach((s) => {
        const v = detectBrandFromText(s.label)
        if (v) detected.add(v)
      })
      if (detected.size === 1) accountBrand.value = Array.from(detected)[0]
      const onlyOneStore = opts.filter((o) => o.value !== '').length === 1
      if (!storeId.value) {
        if (onlyOneStore) {
          const one = opts.find((o) => o.value !== '')
          if (one) storeId.value = Number(one.value)
        } else {
          storeId.value = ''
        }
      }
    } catch (e) {
      void e
    }
  }

  const ALLOWED = new Set(['R_SALES', 'R_SALES_MANAGER'])
  const loadConsultants = async () => {
    try {
      const sid = Number(storeId.value || 0)
      const res: any = await fetchGetEmployeeList({ current: 1, size: 200, storeId: sid })
      const records = res?.records || res?.list || []
      const opts: Array<{ label: string; value: number | '' }> = [{ label: '全部顾问', value: '' }]
      records
        .filter((r: any) => ALLOWED.has(String(r.role)))
        .forEach((r: any) => {
          const idNum = Number(r.id)
          const label = String(r.name || r.userName || r.employeeName || idNum)
          if (Number.isFinite(idNum)) opts.push({ label, value: idNum })
        })
      consultants.value = opts
    } catch (e) {
      void e
    }
  }

  const loadTeams = async () => {
    try {
      const res = await fetchGetDepartmentList({})
      const tree: any[] = Array.isArray(res as any)
        ? (res as any as any[])
        : (res as any)?.data || []
      const opts: Array<{ label: string; value: number | '' }> = []
      const walk = (
        arr: any[],
        context: { storeName?: string; pathNames: string[] } = { pathNames: [] }
      ) => {
        for (const n of arr) {
          const nodeName = String(n.name || n.id)
          const nextContext = {
            storeName: n.type === 'store' ? nodeName : context.storeName,
            pathNames: [...context.pathNames, nodeName]
          }
          const isTeam = String(n.type || '') === 'team'
          if (isTeam) {
            const label = `${nextContext.storeName || ''} - ${nodeName}`
            opts.push({ label, value: Number(n.id) })
          }
          const isStore = String(n.type || '') === 'store'
          if (isStore) {
            let brandFromPath = ''
            for (const p of nextContext.pathNames) {
              const v = detectBrandFromText(String(p || ''))
              if (v) {
                brandFromPath = v
                break
              }
            }
            if (brandFromPath) {
              const idNum = Number(n.id)
              if (Number.isFinite(idNum)) {
                storeBrandById.value[idNum] = normalizeBrand(brandFromPath)
              }
            }
          }
          const children = (n.children || []) as any[]
          if (children.length) walk(children, nextContext)
        }
      }
      walk(tree)
      teamOptions.value = opts
    } catch (e) {
      void e
    }
  }

  const loadModels = async () => {
    try {
      const brand = currentBrand.value
      let list: any[] = []
      const sidNum = Number(storeId.value || 0)
      if (Number.isFinite(sidNum) && sidNum > 0) {
        const byStore = await fetchGetModelsByStore(sidNum)
        const arr = Array.isArray(byStore) ? byStore : []
        if (arr.length) list = arr
      } else if (brand) {
        const catsRes: any = await request.get({ url: '/api/category/all' })
        const cats: any[] = Array.isArray(catsRes?.data) ? catsRes.data : []
        const target = cats.find(
          (c: any) => String(c.level || 0) === '0' && normalizeBrand(String(c.name || '')) === brand
        )
        if (target) {
          const prods: any = await request.get({
            url: `/api/category/${Number(target.id)}/products`,
            params: { includeChildren: 'true' }
          })
          const arr = Array.isArray(prods?.data) ? prods.data : []
          if (arr.length) list = arr
        }
      }
      if (!list.length) {
        const res: any = await fetchGetProductList({ current: 1, size: 200 })
        list = res?.records || res?.list || []
      }
      const opts: Array<{ label: string; value: number | ''; brand?: string }> = [
        { label: '全部车型', value: '' }
      ]
      list.forEach((m: any) => {
        const idNum = Number(m.id)
        const label = String(m.name || m.modelName || idNum)
        const brandRaw = String(m.brand || (m as any).series || '')
        const b = normalizeBrand(brandRaw) || brand
        if (Number.isFinite(idNum)) opts.push({ label, value: idNum, brand: b })
      })
      modelsAll.value = opts
      models.value = opts.map((m) => ({ label: m.label, value: m.value }))
    } catch (e) {
      void e
    }
  }

  watch(
    () => storeId.value,
    () => {
      void loadModels()
    }
  )

  const disableFutureDate = (date: Date) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return date > today
  }

  const loadChannelOptions = async () => {
    try {
      const resp = await fetchChannelOptions()
      const meta: Record<string, { category: string; businessSource: string }> =
        (resp as any)?.metaByLevel1 || {}
      const l1all: string[] = (resp as any)?.level1 || []
      let l1online = l1all.filter((l1) => String(meta?.[l1]?.category || '') === '线上')
      // 兜底：若综合字典未返回线上项，则回退到线上渠道字典
      if (!l1online.length) {
        const online = await (await import('@/api/channel')).fetchOnlineChannelOptions()
        const l1list: string[] = online?.level1 || []
        const arr: Array<{ label: string; value: string }> = [{ label: '全部渠道', value: '' }]
        l1list.forEach((l1) => arr.push({ label: l1, value: l1 }))
        channels.value = arr
        const l2mapRaw = online?.level2Map || {}
        level2Map.value = (l1list || []).reduce((acc: any, k: string) => {
          const list = Array.isArray(l2mapRaw[k]) ? l2mapRaw[k] : []
          const opts: Array<{ label: string; value: string }> = [{ label: '全部二级', value: '' }]
          list.forEach((v: any) =>
            opts.push({ label: String(v.label || v), value: String(v.value || v) })
          )
          acc[k] = opts
          return acc
        }, {})
        return
      }
      const arr: Array<{ label: string; value: string }> = [{ label: '全部渠道', value: '' }]
      l1online.forEach((l1) => arr.push({ label: l1, value: l1 }))
      channels.value = arr
      channelMetaByLevel1.value = meta
      const l2mapRaw = (resp as any)?.level2Map || {}
      level2Map.value = l1online.reduce((acc: any, k: string) => {
        const list = Array.isArray(l2mapRaw[k]) ? l2mapRaw[k] : []
        const opts: Array<{ label: string; value: string }> = [{ label: '全部二级', value: '' }]
        list.forEach((v: any) =>
          opts.push({ label: String(v.label || v), value: String(v.value || v) })
        )
        acc[k] = opts
        return acc
      }, {})
    } catch (e) {
      void e
    }
  }

  const stageInfoMap: Record<string, string> = {
    全部商机数量: '包含指定维度下所有商机（下钻：顾问/门店/车型）',
    首次到店: '首次到店是指该客户首次到达该门店的行为（下钻：顾问/门店）',
    首次试驾: '首次试驾是在到店后进行的第一次试驾活动（下钻：顾问/门店/车型）',
    首次成交: '首次成交指首次下订或签订合同（下钻：顾问/门店/车型）',
    '再次到店/接触（上门）': '再次到店（或上门）表示后续跟进中的再次到店或接触行为',
    再次试驾: '再次试驾发生在再次到店后，是进一步促成成交的重要环节（下钻：顾问/门店/车型）',
    再次成交: '再次成交指非首次的成交行为（复购/转化）（下钻：顾问/门店/车型）',
    综合试驾: '综合试驾指首次试驾与再次试驾的总和（下钻：顾问/门店/车型）',
    综合成交: '综合成交指所有成交行为的集合（下钻：顾问/门店/车型）',
    线索转化率: '线索转化率 = 综合成交 / 全部线索数量'
  }

  const tableRows = ref<
    {
      stage: string
      percent: number
      percentText: string
      value: number
      momText: string
      momClass: string
    }[]
  >([])
  const tableRowsRight = ref<
    {
      stage: string
      percent: number
      percentText: string
      value: number
      momText: string
      momClass: string
    }[]
  >([])
  const tableRowsCombined = ref<
    {
      stage: string
      shareA: number
      shareAText: string
      shareB: number
      shareBText: string
      valueA: number
      valueB: number
    }[]
  >([])

  const percentLabelStyle = (p: number) => {
    void p
    return { left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }
  }

  const legendA = ref('当前选择')
  const legendB = ref('对比选择')
  const compareTitle = ref('对比选择')
  const leftTitle = computed(() => {
    const base = String(props.title || '线上线索转化分析')
    const name = String(legendA.value || '')
    if (!name || /全部/.test(name) || ['当前选择', '选择', '车型', '门店', '顾问'].includes(name))
      return base
    return `${name}线索转化分析`
  })
  const overlayTitle = computed(() => `${String(props.title || '线上线索转化分析')}（叠加）`)
  const hasCompareSelection = ref(false)
  const insightLoading = ref(false)
  const insight = ref<{
    title: string
    summary: string[]
    metrics: { name: string; value: number; percent: number }[]
    issues: string[]
    actions: string[]
  } | null>(null)
  const requestFunnelCache = new Map<
    string,
    {
      ts: number
      items: { stage: string; percent?: number; value: number; mom?: number; percentRaw?: number }[]
    }
  >()
  const requestFunnelInflight = new Map<
    string,
    Promise<{ stage: string; percent?: number; value: number; mom?: number; percentRaw?: number }[]>
  >()
  const requestFunnel = async (params: Record<string, any>) => {
    const key = JSON.stringify(params)
    const cached = requestFunnelCache.get(key)
    if (cached && Date.now() - cached.ts < 60_000) return cached.items
    const inflight = requestFunnelInflight.get(key)
    if (inflight) return await inflight
    const tries = [0, 150, 350, 800]
    const doFetch = async () => {
      for (let i = 0; i < tries.length; i++) {
        const delay = tries[i]
        if (delay > 0) await new Promise((r) => setTimeout(r, delay))
        try {
          const r = await request.get<{
            items: {
              stage: string
              percent?: number
              value: number
              mom?: number
              percentRaw?: number
            }[]
          }>({
            url: '/api/bi/sales-funnel',
            params,
            showErrorMessage: false
          })
          return Array.isArray(r?.items) ? r!.items : []
        } catch {
          continue
        }
      }
      return []
    }
    const p = doFetch().then((items) => {
      requestFunnelInflight.delete(key)
      requestFunnelCache.set(key, { ts: Date.now(), items })
      return items
    })
    requestFunnelInflight.set(key, p)
    return await p
  }
  const compareItems = (
    a: { stage: string; percent?: number; value: number; mom?: number }[],
    b: { stage: string; percent?: number; value: number; mom?: number }[]
  ) => {
    if (a.length !== b.length) return true
    const mapA: Record<string, number> = {}
    const mapB: Record<string, number> = {}
    a.forEach((it) => (mapA[normalizeStageLabel(it.stage)] = Number(it.value) || 0))
    b.forEach((it) => (mapB[normalizeStageLabel(it.stage)] = Number(it.value) || 0))
    const keys = new Set<string>([...Object.keys(mapA), ...Object.keys(mapB)])
    for (const k of keys) {
      if ((mapA[k] || 0) !== (mapB[k] || 0)) return true
    }
    return false
  }

  const apply = async () => {
    const mode = funnelType.value
    const cmpModelId = Number(compareModelId.value || 0)
    const cmpStoreId = Number(compareStoreId.value || 0)
    const cmpTeamId = Number(compareTeamId.value || 0)
    const cmpConsultantId = Number(compareConsultantId.value || 0)

    const period = periodType.value
    let dateStart = ''
    let dateEnd = ''
    let month = ''
    let year = ''
    if (period === 'day') {
      const r = dateDay.value
      if (Array.isArray(r) && r.length === 2) {
        dateStart = String(r[0] || '')
        dateEnd = String(r[1] || '')
      }
    } else if (period === 'week') {
      dateStart = String(dateWeek.value || '')
    } else if (period === 'month') {
      month = getMonthStr(dateMonth.value)
    } else if (period === 'year') {
      year = String(dateYear.value || '')
    }

    const buildTitle = (
      mode: 'store' | 'person' | 'model',
      storeId: number,
      teamId: number,
      consultantId: number,
      modelId: number
    ): string => {
      if (mode === 'store') {
        const s = stores.value.find((x) => Number(x.value || 0) === Number(storeId))
        return s?.label || '门店'
      }
      if (mode === 'person') {
        const c = consultants.value.find((x) => Number(x.value || 0) === Number(consultantId))
        if (c) return c.label
        const t = teamOptions.value.find((x) => Number(x.value || 0) === Number(teamId))
        if (t) return t.label
        return '销售顾问'
      }
      if (mode === 'model') {
        const m = models.value.find((x) => Number(x.value || 0) === Number(modelId))
        return m?.label || '车型'
      }
      return '选择'
    }

    const buildParams = (
      storeId: number,
      teamId: number,
      consultantId: number,
      modelId: number
    ): Record<string, any> => {
      const params: Record<string, any> = { period }
      if (dateStart && dateEnd) {
        params.start = dateStart
        params.end = dateEnd
      }
      if (month) params.month = month
      if (year) params.year = year
      if (storeId) params.storeId = storeId
      params.channelCategory = '线上'
      params.businessSource = '线上'
      if (teamId) params.teamId = teamId
      if (consultantId) params.consultantId = consultantId
      if (modelId) params.modelId = modelId
      if (channelType.value) params.channelLevel1 = channelType.value
      if (channelLevel2.value) params.channelLevel2 = channelLevel2.value
      return params
    }

    const sid = Number(storeId.value || 0)
    const tid = Number(teamId.value || 0)
    const cid = Number(consultantId.value || 0)
    const mid = Number(modelId.value || 0)

    const paramsA = buildParams(sid, tid, cid, mid)
    const paramsB = buildParams(cmpStoreId, cmpTeamId, cmpConsultantId, cmpModelId)
    legendA.value = buildTitle(mode, sid, tid, cid, mid)
    legendB.value = buildTitle(mode, cmpStoreId, cmpTeamId, cmpConsultantId, cmpModelId)
    compareTitle.value = legendB.value

    try {
      let itemsA: {
        stage: string
        percent?: number
        value: number
        mom?: number
        percentRaw?: number
      }[] = []
      if (mode === 'person' && cid) {
        const baseline = await requestFunnel(paramsA)
        const keys = ['consultantId', 'ownerId', 'employeeId', 'consultantName']
        const name = String(
          consultants.value.find((x) => Number(x.value || 0) === Number(cid))?.label || ''
        )
        for (const key of keys) {
          const attempt = { ...paramsA }
          if (key === 'consultantName') attempt[key] = name
          else attempt[key] = cid
          const resItems = await requestFunnel(attempt)
          if (compareItems(resItems, baseline)) {
            itemsA = resItems
            break
          }
        }
        if (!itemsA.length) {
          itemsA = baseline
        }
      } else if (mode === 'store' && sid) {
        const baseline = await requestFunnel(paramsA)
        const sLabel = String(
          stores.value.find((x) => Number(x.value || 0) === Number(sid))?.label || ''
        )
        const attempts: Record<string, any>[] = [
          { ...paramsA, storeName: sLabel },
          { ...paramsA, storeIds: [sid] },
          { ...paramsA, storeIdList: [sid] }
        ]
        for (const attempt of attempts) {
          const resItems = await requestFunnel(attempt)
          if (compareItems(resItems, baseline)) {
            itemsA = resItems
            break
          }
        }
        if (!itemsA.length) itemsA = baseline
      } else if (mode === 'store' && !sid) {
        // 全部门店：限制为账号可见门店集合
        const ids = stores.value
          .map((s) => Number(s.value || 0))
          .filter((n) => Number.isFinite(n) && n > 0)
        const baseline = await requestFunnel(paramsA)
        const attempts: Record<string, any>[] = [
          { ...paramsA, storeIds: ids },
          { ...paramsA, storeIdList: ids }
        ]
        for (const attempt of attempts) {
          const resItems = await requestFunnel(attempt)
          if (compareItems(resItems, baseline)) {
            itemsA = resItems
            break
          }
        }
        if (!itemsA.length) itemsA = baseline
      } else {
        itemsA = await requestFunnel(paramsA)
      }

      const buildRows = (
        arr: { stage: string; value: number; mom?: number; percent?: number; percentRaw?: number }[]
      ) => {
        const valueMap: Record<string, number> = {}
        arr.forEach((it) => {
          const k = normalizeStageLabel(it.stage)
          valueMap[k] = Math.max(0, Number(it.value || 0))
        })

        const baseStageMap: Record<string, string | undefined> = {
          全部线索数量: undefined,
          全部商机数量: '全部线索数量',
          首次到店: '全部商机数量',
          首次试驾: '首次到店',
          首次成交: '首次到店',
          '再次到店/接触（上门）': '全部商机数量',
          再次试驾: '再次到店/接触（上门）',
          再次成交: '再次到店/接触（上门）',
          综合试驾: '全部商机数量',
          综合成交: '全部商机数量',
          线索转化率: '全部线索数量'
        }

        const rows = [] as any[]
        arr.forEach((it) => {
          const stage = normalizeStageLabel(it.stage)
          const v0 = Math.max(0, Number(it.value || 0))
          const baseStage = baseStageMap[stage]
          const baseVal = baseStage ? Math.max(0, Number(valueMap[baseStage] || 0)) : v0
          const v = baseStage ? Math.min(v0, baseVal) : v0
          const raw0 =
            typeof it.percentRaw === 'number'
              ? Number(it.percentRaw)
              : baseVal > 0
                ? (v / baseVal) * 100
                : v > 0
                  ? 100
                  : 0
          const percent = Math.max(0, Math.min(100, Math.round(raw0)))
          const percentText = String(percent)
          const mom = Number(it.mom || 0)
          const momText = mom > 0 ? `↑ ${mom}%` : mom < 0 ? `↓ ${Math.abs(mom)}%` : `${mom}%`
          const momClass = mom > 0 ? 'inc' : mom < 0 ? 'dec' : 'flat'
          rows.push({ stage, percent, percentText, value: v, momText, momClass })
        })
        return rows
      }
      tableRows.value = buildRows(itemsA || [])
      // 兜底：若后端暂未返回新增行，前端强制补齐（值可为0，比例按口径计算）
      const ensureExtraRows = (rows: any[]) => {
        const exists = (name: string) => rows.some((r) => r.stage === name)
        const valueMap: Record<string, number> = {}
        rows.forEach((r) => (valueMap[r.stage] = Math.max(0, Number(r.value || 0))))
        // 基准映射
        const baseStageMap: Record<string, string | undefined> = {
          全部线索数量: undefined,
          全部商机数量: '全部线索数量',
          首次到店: '全部商机数量',
          首次试驾: '首次到店',
          首次成交: '首次到店',
          '再次到店/接触（上门）': '全部商机数量',
          再次试驾: '再次到店/接触（上门）',
          再次成交: '再次到店/接触（上门）',
          综合试驾: '全部商机数量',
          综合成交: '全部商机数量',
          线索转化率: '全部线索数量'
        }
        const addRow = (stage: string, v: number) => {
          const baseStage = baseStageMap[stage]
          const baseVal = baseStage ? Math.max(0, Number(valueMap[baseStage] || 0)) : v
          const vClamped = baseStage ? Math.min(v, baseVal) : v
          const raw = baseVal > 0 ? (vClamped / baseVal) * 100 : vClamped > 0 ? 100 : 0
          const percent = Math.max(0, Math.min(100, Math.round(raw)))
          const percentText = String(percent)
          rows.push({
            stage,
            percent,
            percentText,
            value: vClamped,
            momText: '0%',
            momClass: 'flat'
          })
        }
        if (!exists('综合试驾')) {
          addRow('综合试驾', (valueMap['首次试驾'] || 0) + (valueMap['再次试驾'] || 0))
        }
        if (!exists('线索转化率')) {
          addRow('线索转化率', valueMap['综合成交'] || 0)
        }
        return rows
      }
      tableRows.value = ensureExtraRows(tableRows.value)
      const STAGE_ORDER = [
        '全部线索数量',
        '全部商机数量',
        '首次到店',
        '首次试驾',
        '首次成交',
        '再次到店/接触（上门）',
        '再次试驾',
        '再次成交',
        '综合试驾',
        '综合成交',
        '线索转化率'
      ]
      const sortRows = (rows: any[]) => {
        const idx = (name: string) => {
          const i = STAGE_ORDER.indexOf(name)
          return i >= 0 ? i : 999
        }
        rows.sort((a, b) => idx(a.stage) - idx(b.stage))
        return rows
      }
      tableRows.value = sortRows(tableRows.value)

      if (enableCompare.value && (cmpModelId || cmpStoreId || cmpTeamId || cmpConsultantId)) {
        let itemsB: {
          stage: string
          percent?: number
          value: number
          mom?: number
          percentRaw?: number
        }[] = []
        const baseline = await requestFunnel(paramsB)
        if (mode === 'person' && cmpConsultantId) {
          const keys = ['consultantId', 'ownerId', 'employeeId', 'consultantName']
          const name = String(
            consultants.value.find((x) => Number(x.value || 0) === Number(cmpConsultantId || 0))
              ?.label || ''
          )
          for (const key of keys) {
            const attempt = { ...paramsB }
            if (key === 'consultantName') attempt[key] = name
            else attempt[key] = cmpConsultantId
            const resItems = await requestFunnel(attempt)
            if (compareItems(resItems, baseline)) {
              itemsB = resItems
              break
            }
          }
          if (!itemsB.length) itemsB = baseline
        } else if (mode === 'store' && cmpStoreId) {
          const sLabel = String(
            stores.value.find((x) => Number(x.value || 0) === Number(cmpStoreId || 0))?.label || ''
          )
          const attempts: Record<string, any>[] = [
            { ...paramsB, storeName: sLabel },
            { ...paramsB, storeIds: [cmpStoreId] },
            { ...paramsB, storeIdList: [cmpStoreId] }
          ]
          for (const attempt of attempts) {
            const resItems = await requestFunnel(attempt)
            if (compareItems(resItems, baseline)) {
              itemsB = resItems
              break
            }
          }
          if (!itemsB.length) itemsB = baseline
        } else {
          itemsB = baseline
        }
        tableRowsRight.value = buildRows(itemsB || [])
        tableRowsRight.value = ensureExtraRows(tableRowsRight.value)
        tableRowsRight.value = sortRows(tableRowsRight.value)
        hasCompareSelection.value = (tableRowsRight.value || []).length > 0
        const combined = [] as any[]
        tableRows.value.forEach((left) => {
          const right = tableRowsRight.value.find((x) => x.stage === left.stage)
          const a = Math.max(0, Math.min(100, Number(left.percent || 0)))
          const b = Math.max(0, Math.min(100, Number(right?.percent || 0)))
          const aText = String(a)
          const bText = String(b)
          const valA = Math.max(0, Number(left.value || 0))
          const valB = Math.max(0, Number(right?.value || 0))
          combined.push({
            stage: left.stage,
            shareA: a,
            shareAText: aText,
            shareB: b,
            shareBText: bText,
            valueA: valA,
            valueB: valB
          })
        })
        tableRowsCombined.value = combined
      } else {
        hasCompareSelection.value = false
        tableRowsRight.value = []
        tableRowsCombined.value = []
      }
    } catch (e) {
      void e
    }
  }

  const fetchInsight = async () => {
    const period = periodType.value
    let dateStart = ''
    let dateEnd = ''
    let month = ''
    let year = ''
    if (period === 'day') {
      const r = dateDay.value
      if (Array.isArray(r) && r.length === 2) {
        dateStart = String(r[0] || '')
        dateEnd = String(r[1] || '')
      }
    } else if (period === 'week') {
      dateStart = String(dateWeek.value || '')
    } else if (period === 'month') {
      month = getMonthStr(dateMonth.value)
    } else if (period === 'year') {
      year = String(dateYear.value || '')
    }
    const params: Record<string, any> = { period }
    if (dateStart && dateEnd) {
      params.start = dateStart
      params.end = dateEnd
    }
    if (month) params.month = month
    if (year) params.year = year
    const sid = Number(storeId.value || 0)
    const tid = Number(teamId.value || 0)
    const cid = Number(consultantId.value || 0)
    const mid = Number(modelId.value || 0)
    if (sid) params.storeId = sid
    if (tid) params.teamId = tid
    if (cid) params.consultantId = cid
    if (mid) params.modelId = mid
    params.channelCategory = '线上'
    params.businessSource = '线上'
    if (channelType.value) params.channelLevel1 = channelType.value
    if (channelLevel2.value) params.channelLevel2 = channelLevel2.value
    insightLoading.value = true
    try {
      const r = await request.get<{ insight: any }>({
        url: '/api/bi/sales-funnel-insight',
        params,
        showErrorMessage: false
      })
      insight.value = (r as any)?.insight || null
    } catch {
      insight.value = null
    } finally {
      insightLoading.value = false
    }
  }

  const reset = () => {
    periodType.value = 'month'
    dateDay.value = ''
    dateWeek.value = ''
    dateMonth.value = ''
    dateYear.value = ''
    storeId.value = ''
    teamId.value = ''
    consultantId.value = ''
    modelId.value = ''
    compareStoreId.value = ''
    compareTeamId.value = ''
    compareConsultantId.value = ''
    compareModelId.value = ''
    enableCompare.value = false
    overlayMode.value = false
    channelLevel2.value = ''
  }

  const teamId = ref<number | ''>('')

  let applyTimer: any = null
  const scheduleApply = () => {
    if (applyTimer) clearTimeout(applyTimer)
    applyTimer = setTimeout(() => {
      applyTimer = null
      void apply()
    }, 200)
  }

  onMounted(async () => {
    await loadStores()
    await loadConsultants()
    await loadTeams()
    await loadModels()
    await loadChannelOptions()
    watch(
      () => channelType.value,
      (l1) => {
        const opts = level2Map.value[String(l1 || '')] || [{ label: '全部二级', value: '' }]
        channelLevel2Options.value = opts
        channelLevel2.value = ''
        scheduleApply()
      },
      { immediate: true }
    )
    watch(
      () => channelLevel2.value,
      () => {
        scheduleApply()
      }
    )
    scheduleApply()
  })
</script>

<style scoped>
  .bi-sales {
    padding: 12px;
  }

  .charts-row {
    display: flex;
    gap: 12px;
  }

  .insight-block {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }

  .insight-section {
    padding: 4px 8px;
  }

  .insight-subtitle {
    margin-bottom: 6px;
    font-weight: 600;
  }

  .metrics {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .metric {
    display: inline-block;
    padding: 2px 8px;
    font-size: 12px;
    color: var(--el-color-primary);
    background: var(--el-color-primary-light-9);
    border-radius: 12px;
  }

  .filters {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .card-title {
    margin-bottom: 8px;
    font-weight: 600;
  }

  .funnel-card {
    flex: 0 0 48%;
    width: 48%;
    margin-bottom: 12px;
  }

  .charts-row.single .funnel-card {
    flex: 1 1 100%;
    width: 100%;
  }

  .stage-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .stage-cell {
    display: flex;
    gap: 6px;
    align-items: center;
  }

  .info-icon {
    color: #b3b3b3;
    cursor: help;
  }

  .progress {
    position: relative;
    width: 100%;
    height: 16px;
    overflow: hidden;
    background: #eceff3;
    border-radius: 999px;
  }

  .progress.stacked {
    margin-top: 4px;
  }

  .bar {
    position: relative;
    z-index: 1;
    height: 100%;
    margin: 0 auto;
    background: #ff5b79;
    border-radius: 999px;
    transition: width 0.3s ease;
  }

  .bar-overlay-text {
    position: absolute;
    top: 50%;
    left: 50%;
    z-index: 2;
    font-size: 13px;
    font-weight: 600;
    line-height: 1;
    color: #fff;
    text-shadow: 0 0 2px rgb(0 0 0 / 25%);
    letter-spacing: 0.2px;
    white-space: nowrap;
    pointer-events: none;
    transform: translate(-50%, -50%);
  }

  .bar-overlay-text.light {
    color: #ff3b30;
    text-shadow: 0 0 1px rgb(0 0 0 / 15%);
  }

  .progress.split .bar {
    position: absolute;
    top: 0;
    left: 0;
  }

  .bar.bar-a {
    background: #ff5b79;
  }

  .bar.bar-b {
    background: #b7bdc6;
  }

  .legend {
    display: flex;
    gap: 12px;
    margin-bottom: 8px;
  }

  .legend-dot {
    display: inline-block;
    width: 10px;
    height: 10px;
    margin-right: 4px;
    vertical-align: middle;
    border-radius: 50%;
  }

  .legend-dot.dot-a {
    background: #ff5b79;
  }

  .legend-dot.dot-b {
    background: #b7bdc6;
  }

  .inc {
    color: var(--el-color-success);
  }

  .dec {
    color: var(--el-color-danger);
  }

  .flat {
    color: #999;
  }
</style>
