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
          v-model="funnelType"
          placeholder="漏斗类型"
          size="small"
          style="width: 140px; margin-left: 8px"
        >
          <el-option label="门店" value="store" />
          <el-option label="销售顾问" value="person" />
          <el-option label="车型" value="model" />
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
          v-if="false"
          v-model="channelType"
          placeholder="渠道类型"
          size="small"
          style="width: 160px; margin-left: 8px"
        >
          <el-option v-for="o in channels" :key="o.value" :label="o.label" :value="o.value" />
        </el-select>

        <el-select
          v-if="false"
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

    <div class="charts-row" v-if="!overlayMode">
      <el-card class="art-custom-card funnel-card">
        <div class="card-title">销售漏斗</div>
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
        <div class="card-title">销售漏斗（叠加）</div>
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
  </div>
</template>

<script setup lang="ts">
  defineOptions({ name: 'SalesProcess' })

  import request from '@/utils/http'
  import { fetchGetCustomerStoreOptions } from '@/api/customer'
  import { fetchGetEmployeeList } from '@/api/system-manage'
  import { fetchGetDepartmentList } from '@/api/system-manage'
  import { fetchGetProductList, fetchGetModelsByStore } from '@/api/product'
  import { fetchChannelOptions } from '@/api/channel'
  import { useUserStore } from '@/store/modules/user'

  import { InfoFilled } from '@element-plus/icons-vue'

  const STAGES: string[] = [
    '全部商机数量',
    '首次到店',
    '首次试驾',
    '首次成交',
    '再次到店/接触（上门）',
    '再次试驾',
    '再次成交',
    '综合成交'
  ]

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

  const getPrevMonthStr = (v: any): string => {
    let d: Date
    const cur = getMonthStr(v)
    if (cur) {
      const [yy, mm] = cur.split('-')
      d = new Date(Number(yy), Number(mm) - 1, 1)
    } else {
      d = new Date()
    }
    d.setMonth(d.getMonth() - 1)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
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
      const myStore = Number(userStore.info?.storeId || 0)
      if (!storeId.value && myStore > 0) storeId.value = myStore
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
          if (n.type === 'team') {
            const idNum = Number(n.id)
            if (Number.isFinite(idNum))
              opts.push({
                label: `${nextContext.storeName || ''} ${String(n.name || idNum)}`.trim(),
                value: idNum
              })
          }
          if (n.type === 'store') {
            const idNum = Number(n.id)
            if (Number.isFinite(idNum)) {
              let brandFromPath = ''
              for (const nm of nextContext.pathNames) {
                const v = detectBrandFromText(nm)
                if (v) {
                  brandFromPath = v
                  break
                }
              }
              if (brandFromPath) storeBrandById.value[idNum] = brandFromPath
            }
          }
          if (Array.isArray(n.children)) walk(n.children, nextContext)
        }
      }
      walk(tree)
      teamOptions.value = opts
    } catch {
      teamOptions.value = []
    }
  }

  const loadModelsAndOem = async () => {
    try {
      const sid = Number(storeId.value || 0)
      const modelOpts: Array<{ label: string; value: number | ''; brand?: string }> = [
        { label: '全部车型', value: '' }
      ]
      if (Number.isFinite(sid) && sid > 0) {
        const list = await fetchGetModelsByStore(sid)
        const arr = Array.isArray(list) ? list : []
        arr.forEach((m: any) => {
          const idNum = Number(m.id)
          const label = String(m.name || idNum)
          if (Number.isFinite(idNum)) modelOpts.push({ label, value: idNum })
        })
        const oemOpts: Array<{ label: string; value: string }> = [{ label: '全部OEM', value: '' }]
        const brandVal = storeBrandById.value[sid] || accountBrand.value || ''
        if (brandVal) oemOpts.push({ label: brandVal, value: brandVal })
        oems.value = oemOpts
      } else {
        const res = await fetchGetProductList({ current: 1, size: 200 })
        const records = (res as any)?.records || []
        const brandSet = new Set<string>()
        records.forEach((p: any) => {
          const idNum = Number(p.id)
          const label = String(p.name || idNum)
          const brandVal = normalizeBrand(String(p.brand || ''))
          if (Number.isFinite(idNum)) modelOpts.push({ label, value: idNum, brand: brandVal })
          if (p.brand) brandSet.add(String(p.brand))
        })
        const oemOpts: Array<{ label: string; value: string }> = [{ label: '全部OEM', value: '' }]
        Array.from(brandSet).forEach((b) => oemOpts.push({ label: b, value: b }))
        oems.value = oemOpts
      }
      modelsAll.value = modelOpts
      models.value = modelsView.value
    } catch (e) {
      void e
    }
  }

  const loadChannels = async () => {
    try {
      const res = await fetchChannelOptions()
      const level1 = (res as any)?.level1 || []
      level2Map.value = (res as any)?.level2Map || {}
      channelMetaByLevel1.value = (res as any)?.metaByLevel1 || {}
      const opts: Array<{ label: string; value: string }> = [{ label: '全部渠道', value: '' }]
      level1.forEach((l: any) => opts.push({ label: String(l), value: String(l) }))
      channels.value = opts
    } catch (e) {
      void e
    }
  }

  watch(storeId, () => {
    loadConsultants()
    loadModelsAndOem()
    const ids = modelsView.value.map((m) => m.value)
    if (!ids.includes(modelId.value)) modelId.value = ''
    if (!ids.includes(compareModelId.value)) compareModelId.value = ''
    models.value = modelsView.value
  })

  watch(compareStoreId, () => {
    loadFunnelRight()
  })

  watch(channelType, (val) => {
    const arr = level2Map.value[String(val)] || []
    const opts: Array<{ label: string; value: string }> = [{ label: '全部二级', value: '' }]
    arr.forEach((it) =>
      opts.push({ label: String(it.label || it.value), value: String(it.value || it.label) })
    )
    channelLevel2Options.value = opts
    channelLevel2.value = ''
  })

  const apply = () => {
    loadFunnel()
    if (enableCompare.value && hasCompareSelection.value) {
      loadFunnelRight()
    } else {
      funnelItemsRight.value = []
    }
  }
  const reset = () => {
    periodType.value = 'month'
    dateDay.value = ''
    dateWeek.value = ''
    dateMonth.value = ''
    dateYear.value = ''
    storeId.value = ''
    compareStoreId.value = ''
    modelId.value = ''
    consultantId.value = ''
    oem.value = ''
    channelType.value = ''

    funnelItems.value = []
    funnelItemsRight.value = []
    renderFunnel()
  }

  onMounted(async () => {
    await Promise.all([
      loadStores(),
      loadConsultants(),
      loadModelsAndOem(),
      loadChannels(),
      loadTeams()
    ])
    apply()
  })

  const funnelItems = ref<Array<{ stage: string; value: number }>>([])
  const funnelItemsRight = ref<Array<{ stage: string; value: number }>>([])
  const prevMap = ref<Record<string, number>>({})
  const teamId = ref<number | ''>('')
  const disableFutureDate = (date: Date) => {
    return date.getTime() > Date.now()
  }

  const hasCompareSelection = computed(() => {
    if (funnelType.value === 'store') return compareStoreId.value !== ''
    if (funnelType.value === 'person')
      return compareTeamId.value !== '' || compareConsultantId.value !== ''
    if (funnelType.value === 'model') return compareModelId.value !== ''
    return false
  })

  const legendA = computed(() => {
    if (funnelType.value === 'store') return '当前门店'
    if (funnelType.value === 'person') return '当前对象'
    if (funnelType.value === 'model') return '当前车型'
    return '当前'
  })
  const legendB = computed(() => {
    if (funnelType.value === 'store') return '对比门店'
    if (funnelType.value === 'person') return '对比对象'
    if (funnelType.value === 'model') return '对比车型'
    return '对比'
  })

  const compareTitle = computed(() => {
    if (funnelType.value === 'store') return '对比门店漏斗'
    if (funnelType.value === 'person') return '对比对象漏斗'
    if (funnelType.value === 'model') return '对比车型漏斗'
    return '对比漏斗'
  })

  const tableRowsCombined = computed(() => {
    const valueMapA: Record<string, number> = {}
    funnelItems.value.forEach((it) => (valueMapA[String(it.stage)] = Number(it.value) || 0))
    const valueMapB: Record<string, number> = {}
    funnelItemsRight.value.forEach((it) => (valueMapB[String(it.stage)] = Number(it.value) || 0))

    const baseStageMap: Record<string, string | undefined> = {
      全部商机数量: undefined,
      首次到店: '全部商机数量',
      首次试驾: '首次到店',
      首次成交: '首次到店',
      '再次到店/接触（上门）': '全部商机数量',
      再次试驾: '再次到店/接触（上门）',
      再次成交: '再次到店/接触（上门）',
      综合成交: '全部商机数量'
    }

    return STAGES.map((stage) => {
      const vA = valueMapA[stage] || 0
      const vB = valueMapB[stage] || 0
      const baseStage = baseStageMap[stage]
      const baseAVal = baseStage ? valueMapA[baseStage] || 0 : vA || 0
      const baseBVal = baseStage ? valueMapB[baseStage] || 0 : vB || 0
      const baseA = Math.max(baseAVal, 1)
      const baseB = Math.max(baseBVal, 1)
      const pARaw = (vA / baseA) * 100
      const pBRaw = (vB / baseB) * 100
      const percentA = Math.min(100, Math.round(pARaw))
      const percentB = Math.min(100, Math.round(pBRaw))
      const percentAText = Math.min(100, Math.round(pARaw * 10) / 10).toFixed(1)
      const percentBText = Math.min(100, Math.round(pBRaw * 10) / 10).toFixed(1)
      const total = vA + vB
      const shareA = total > 0 ? Math.round((vA / total) * 100) : 0
      const shareB = total > 0 ? 100 - shareA : 0
      const shareAText = total > 0 ? (Math.round((vA / total) * 1000) / 10).toFixed(1) : '0.0'
      const shareBText = total > 0 ? (Math.round((vB / total) * 1000) / 10).toFixed(1) : '0.0'
      return {
        stage,
        valueA: vA,
        valueB: vB,
        percentA,
        percentB,
        percentAText,
        percentBText,
        shareA,
        shareB,
        shareAText,
        shareBText
      }
    })
  })

  const loadFunnel = async () => {
    const params: Record<string, any> = {}
    if (storeId.value !== '') params.storeId = storeId.value
    if (funnelType.value === 'model' && modelId.value !== '') params.modelId = modelId.value
    if (funnelType.value === 'person' && teamId.value !== '') params.departmentId = teamId.value
    if (funnelType.value === 'person' && consultantId.value !== '')
      params.consultantId = consultantId.value
    if (channelType.value) params.channelLevel1 = channelType.value
    if (channelLevel2.value) params.channelLevel2 = channelLevel2.value

    params.period = periodType.value
    if (periodType.value === 'day' && dateDay.value) {
      if (Array.isArray(dateDay.value)) {
        params.start = dateDay.value[0]
        params.end = dateDay.value[1]
      } else {
        params.start = dateDay.value
        params.end = dateDay.value
      }
    }
    if (periodType.value === 'week' && dateWeek.value) params.week = dateWeek.value
    if (periodType.value === 'month') {
      const m = getMonthStr(dateMonth.value)
      if (m) params.month = m
    }
    if (periodType.value === 'year' && dateYear.value) params.year = dateYear.value

    let res: { items: { stage: string; value: number }[] } | null = null
    try {
      res = await request.get<{ items: { stage: string; value: number }[] }>({
        url: '/api/bi/sales-funnel',
        params,
        showErrorMessage: false
      })
    } catch {
      try {
        res = await request.get<{ items: { stage: string; value: number }[] }>({
          url: '/api/bi/sales-funnel/open',
          params,
          showErrorMessage: false
        })
      } catch {
        res = { items: [] }
      }
    }
    const itemsA = Array.isArray(res?.items) ? res!.items : []
    funnelItems.value = itemsA.map((it) => ({
      stage: normalizeStageLabel(it.stage),
      value: Number(it.value) || 0
    }))
    await loadPrevFunnel(params)
    renderFunnel()
  }

  const loadFunnelRight = async () => {
    const params: Record<string, any> = {}
    if (funnelType.value === 'store' && compareStoreId.value !== '')
      params.storeId = compareStoreId.value
    if (funnelType.value === 'person' && compareTeamId.value !== '')
      params.departmentId = compareTeamId.value
    if (funnelType.value === 'person' && compareConsultantId.value !== '')
      params.consultantId = compareConsultantId.value
    if (funnelType.value === 'model' && compareModelId.value !== '')
      params.modelId = compareModelId.value
    if (modelId.value !== '') params.modelId = modelId.value
    if (consultantId.value !== '' && funnelType.value === 'person')
      params.consultantId = consultantId.value
    if (oem.value) void oem.value
    if (channelType.value) params.channelLevel1 = channelType.value
    if (channelLevel2.value) params.channelLevel2 = channelLevel2.value

    params.period = periodType.value
    if (periodType.value === 'day' && dateDay.value) {
      if (Array.isArray(dateDay.value)) {
        params.start = dateDay.value[0]
        params.end = dateDay.value[1]
      } else {
        params.start = dateDay.value
        params.end = dateDay.value
      }
    }
    if (periodType.value === 'week' && dateWeek.value) params.week = dateWeek.value
    if (periodType.value === 'month') {
      const m = getMonthStr(dateMonth.value)
      if (m) params.month = m
    }
    if (periodType.value === 'year' && dateYear.value) params.year = dateYear.value

    let res: { items: { stage: string; value: number }[] } | null = null
    try {
      res = await request.get<{ items: { stage: string; value: number }[] }>({
        url: '/api/bi/sales-funnel',
        params,
        showErrorMessage: false
      })
    } catch {
      try {
        res = await request.get<{ items: { stage: string; value: number }[] }>({
          url: '/api/bi/sales-funnel/open',
          params,
          showErrorMessage: false
        })
      } catch {
        res = { items: [] }
      }
    }
    const itemsB = Array.isArray(res?.items) ? res!.items : []
    funnelItemsRight.value = itemsB.map((it) => ({
      stage: normalizeStageLabel(it.stage),
      value: Number(it.value) || 0
    }))
    await loadPrevFunnelRight(params)
  }

  const loadPrevFunnel = async (baseParams: Record<string, any>) => {
    const params2: Record<string, any> = { ...baseParams }
    if (periodType.value === 'month') {
      const prev = getPrevMonthStr(dateMonth.value)
      params2.month = prev
      delete params2.start
      delete params2.end
      let res2: { items: { stage: string; value: number }[] } | null = null
      try {
        res2 = await request.get<{ items: { stage: string; value: number }[] }>({
          url: '/api/bi/sales-funnel',
          params: params2,
          showErrorMessage: false
        })
      } catch {
        try {
          res2 = await request.get<{ items: { stage: string; value: number }[] }>({
            url: '/api/bi/sales-funnel/open',
            params: params2,
            showErrorMessage: false
          })
        } catch {
          res2 = { items: [] }
        }
      }
      const itemsPrev = Array.isArray(res2?.items) ? res2!.items : []
      const map: Record<string, number> = {}
      itemsPrev.forEach((it) => (map[normalizeStageLabel(it.stage)] = Number(it.value) || 0))
      prevMap.value = map
    } else {
      prevMap.value = {}
    }
  }

  const prevMapRight = ref<Record<string, number>>({})
  const loadPrevFunnelRight = async (baseParams: Record<string, any>) => {
    const params2: Record<string, any> = { ...baseParams }
    if (periodType.value === 'month') {
      const prev = getPrevMonthStr(dateMonth.value)
      params2.month = prev
      delete params2.start
      delete params2.end
      let res2: { items: { stage: string; value: number }[] } | null = null
      try {
        res2 = await request.get<{ items: { stage: string; value: number }[] }>({
          url: '/api/bi/sales-funnel',
          params: params2,
          showErrorMessage: false
        })
      } catch {
        try {
          res2 = await request.get<{ items: { stage: string; value: number }[] }>({
            url: '/api/bi/sales-funnel/open',
            params: params2,
            showErrorMessage: false
          })
        } catch {
          res2 = { items: [] }
        }
      }
      const itemsPrev = Array.isArray(res2?.items) ? res2!.items : []
      const map: Record<string, number> = {}
      itemsPrev.forEach((it) => (map[normalizeStageLabel(it.stage)] = Number(it.value) || 0))
      prevMapRight.value = map
    } else {
      prevMapRight.value = {}
    }
  }

  const tableRows = computed(() => {
    const valueMap: Record<string, number> = {}
    funnelItems.value.forEach((it) => {
      valueMap[String(it.stage)] = Number(it.value) || 0
    })
    void 0

    const baseStageMap: Record<string, string | undefined> = {
      全部商机数量: undefined,
      首次到店: '全部商机数量',
      首次试驾: '首次到店',
      首次成交: '首次到店',
      '再次到店/接触（上门）': '全部商机数量',
      再次试驾: '再次到店/接触（上门）',
      再次成交: '再次到店/接触（上门）',
      综合成交: '全部商机数量'
    }

    return STAGES.map((stage) => {
      const v = Number(valueMap[stage] || 0)
      const baseStage = baseStageMap[stage]
      const baseVal = baseStage ? valueMap[baseStage] || 0 : v || 0
      const base = Math.max(baseVal, 1)
      const pRaw = (v / base) * 100
      const p = Math.min(100, Math.round(pRaw))
      const percentText = Math.min(100, Math.round(pRaw * 10) / 10).toFixed(1)
      const prev = prevMap.value[stage]
      const mom = typeof prev === 'number' && prev > 0 ? (v - prev) / prev : null
      const momText = mom === null ? '--' : `${(mom * 100).toFixed(1)}%`
      const momClass = mom === null ? '' : mom >= 0 ? 'mom-up' : 'mom-down'
      return { stage, value: v, percent: p, percentText, momText, momClass }
    })
  })

  const tableRowsRight = computed(() => {
    const valueMap: Record<string, number> = {}
    funnelItemsRight.value.forEach((it) => {
      valueMap[String(it.stage)] = Number(it.value) || 0
    })
    void 0

    const baseStageMap: Record<string, string | undefined> = {
      全部商机数量: undefined,
      首次到店: '全部商机数量',
      首次试驾: '首次到店',
      首次成交: '首次到店',
      '再次到店/接触（上门）': '全部商机数量',
      再次试驾: '再次到店/接触（上门）',
      再次成交: '再次到店/接触（上门）',
      综合成交: '全部商机数量'
    }

    return STAGES.map((stage) => {
      const v = Number(valueMap[stage] || 0)
      const baseStage = baseStageMap[stage]
      const baseVal = baseStage ? valueMap[baseStage] || 0 : v || 0
      const base = Math.max(baseVal, 1)
      const pRaw = (v / base) * 100
      const p = Math.min(100, Math.round(pRaw))
      const percentText = Math.min(100, Math.round(pRaw * 10) / 10).toFixed(1)
      const prev = prevMapRight.value[stage]
      const mom = typeof prev === 'number' && prev > 0 ? (v - prev) / prev : null
      const momText = mom === null ? '--' : `${(mom * 100).toFixed(1)}%`
      const momClass = mom === null ? '' : mom >= 0 ? 'mom-up' : 'mom-down'
      return { stage, value: v, percent: p, percentText, momText, momClass }
    })
  })

  const percentLabelStyle = (p: number) => {
    void p
    return { left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }
  }

  const stageInfoMap: Record<string, string> = {
    全部商机数量: '总商机个数（按筛选条件统计）',
    首次到店: '该商机的第一条到店记录',
    首次试驾: '首次到店阶段的试驾记录',
    首次成交: '成交发生在首次到店阶段',
    '再次到店/接触（上门）': '同一商机的第二次及以后到店或上门接触',
    再次试驾: '再次到店阶段的试驾记录',
    再次成交: '成交发生在再次到店阶段',
    综合成交: '成交商机个数（按商机去重计数）'
  }

  const renderFunnel = () => {}

  watch(funnelType, () => {
    compareStoreId.value = ''
    compareTeamId.value = ''
    compareConsultantId.value = ''
    compareModelId.value = ''
    teamId.value = ''
  })

  watch(enableCompare, (val) => {
    if (!val) {
      overlayMode.value = false
      compareStoreId.value = ''
      compareTeamId.value = ''
      compareConsultantId.value = ''
      compareModelId.value = ''
      funnelItemsRight.value = []
    }
  })
</script>

<style lang="scss" scoped>
  .filters {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
  }

  .bi-sales {
    padding-bottom: 8px;
  }

  .charts-row {
    display: flex;
    gap: 12px;
  }

  .funnel-card {
    flex: 0 0 48%;
    width: 48%;
  }

  .legend {
    display: flex;
    gap: 16px;
    align-items: center;
    padding: 0 12px 8px;
    font-size: 12px;
    color: var(--art-gray-text-700);
  }

  .legend-item {
    display: inline-flex;
    gap: 6px;
    align-items: center;
  }

  .legend-dot {
    display: inline-block;
    width: 10px;
    height: 10px;
    border-radius: 50%;
  }

  .legend-dot.dot-a {
    background: #ff5b79;
  }

  .legend-dot.dot-b {
    background: #b7bdc6;
  }

  .card-title {
    padding: 4px 12px 8px;
    font-size: 14px;
    font-weight: 600;
    color: var(--art-gray-text-900);
  }

  .progress {
    position: relative;
    width: 100%;
    height: 16px;
    overflow: hidden;
    background: #eceff3;
    border-radius: 999px;
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

  .bar.bar-a {
    background: #ff5b79;
  }

  .bar.bar-b {
    background: #b7bdc6;
  }

  .progress.split .bar {
    position: absolute;
    top: 0;
    left: 0;
  }

  .progress-list {
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding: 8px 12px;
  }

  .progress-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 12px 0;
    font-size: 12px;
    color: var(--art-gray-text-700);
  }

  .header-left {
    display: flex;
    flex: 1;
    gap: 12px;
    align-items: baseline;
    min-width: 0;
  }

  .header-left .label {
    flex-shrink: 0;
    width: 160px;
    font-weight: 600;
    color: var(--art-gray-text-900);
  }

  .header-left .hint {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    color: var(--art-gray-text-600);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .header-right {
    display: flex;
    gap: 16px;
    align-items: center;
  }

  .header-right .col-value {
    width: 80px;
    text-align: right;
  }

  .progress-item {
    display: flex;
    gap: 16px;
    align-items: center;
  }

  .progress-value {
    width: 80px;
    font-size: 13px;
    font-weight: 500;
    color: var(--art-gray-text-900);
    text-align: right;
  }

  .progress-label {
    display: flex;
    gap: 6px;
    align-items: center;
    width: 160px;
    font-size: 13px;
    font-weight: 500;
    color: var(--art-gray-text-900);
  }

  .mom-up {
    color: #27ae60;
  }

  .mom-down {
    color: #ff3b30;
  }

  .stage-header {
    display: flex;
    gap: 10px;
    align-items: center;
  }

  .stage-header .note {
    font-size: 12px;
    color: var(--art-gray-text-700);
  }

  .stage-cell {
    display: flex;
    gap: 6px;
    align-items: center;
  }

  .progress.stacked {
    margin-top: 4px;
  }

  .info-icon {
    color: #b3b3b3;
    cursor: help;
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
</style>
