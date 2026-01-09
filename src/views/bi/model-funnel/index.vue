<template>
  <div class="bi-model-funnel">
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
          v-model="modelId"
          placeholder="选择车型"
          size="small"
          style="width: 180px; margin-left: 8px"
        >
          <el-option v-for="m in modelsView" :key="m.value" :label="m.label" :value="m.value" />
        </el-select>

        <el-switch
          v-model="enableCompare"
          active-text="对比模式"
          size="small"
          style="margin-left: 8px"
        />
        <el-select
          v-if="enableCompare"
          v-model="compareModelId"
          placeholder="对比车型"
          size="small"
          style="width: 180px; margin-left: 8px"
        >
          <el-option
            v-for="m in modelsView"
            :key="'cmp-' + m.value"
            :label="m.label"
            :value="m.value"
          />
        </el-select>
        <el-switch
          v-if="enableCompare"
          v-model="overlayMode"
          active-text="叠加展示"
          size="small"
          style="margin-left: 8px"
        />
        <el-button type="primary" size="small" style="margin-left: 8px" @click="apply"
          >应用</el-button
        >
        <el-button size="small" style="margin-left: 6px" @click="reset">重置</el-button>
      </div>
    </el-card>

    <el-card class="art-custom-card" shadow="never">
      <template #header>
        <div class="card-title">车型线索转化分析</div>
      </template>
      <el-tabs v-model="tab" tab-position="bottom">
        <el-tab-pane label="各车型总到店转化分析" name="overall">
          <div
            v-if="!overlayMode"
            class="charts-row"
            :class="{ single: !(enableCompare && hasCompareSelection) }"
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
            <el-card
              v-if="enableCompare && hasCompareSelection"
              class="art-custom-card funnel-card"
            >
              <div class="card-title">{{ compareTitle }}</div>
              <el-table :data="tableRowsRight" border style="width: 100%">
                <el-table-column prop="stage" label="环节" min-width="360">
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
                <span v-if="hasCompareSelection" class="legend-item"
                  ><i class="legend-dot dot-b"></i>{{ legendB }}</span
                >
              </div>
              <el-table :data="tableRowsCombined" border style="width: 100%">
                <el-table-column prop="stage" label="环节" min-width="360">
                  <template #default="scope">
                    <div class="stage-cell"
                      ><span>{{ scope.row.stage }}</span></div
                    >
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
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

<script setup lang="ts">
  defineOptions({ name: 'BIModelFunnel' })
  const props = defineProps<{ title?: string }>()

  import request from '@/utils/http'
  import { fetchGetCustomerStoreOptions } from '@/api/customer'
  import { fetchGetModelsByStore } from '@/api/product'
  import { fetchGetDepartmentList } from '@/api/system-manage'
  import { fetchGetClueList } from '@/api/clue'
  import { InfoFilled } from '@element-plus/icons-vue'
  import { ref, computed, watch, onMounted } from 'vue'
  import { useUserStore } from '@/store/modules/user'

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

  const disableFutureDate = (date: Date) => date.getTime() > Date.now()

  const storeId = ref<number | ''>('')
  const stores = ref<Array<{ label: string; value: number | '' }>>([
    { label: '全部门店', value: '' }
  ])
  const getVisibleStoreIds = (): number[] =>
    stores.value.map((s) => Number(s.value || 0)).filter((n) => Number.isFinite(n) && n > 0)
  const modelId = ref<number | ''>('')
  const models = ref<Array<{ label: string; value: number | '' }>>([
    { label: '全部车型', value: '' }
  ])
  const enableCompare = ref<boolean>(false)
  const overlayMode = ref<boolean>(false)
  const compareModelId = ref<number | ''>('')
  const tab = ref<'overall'>('overall')

  const modelsAll = ref<Array<{ label: string; value: number | ''; brand?: string }>>([
    { label: '全部车型', value: '' }
  ])
  const accountBrand = ref<string>('')
  const storeBrandById = ref<Record<number, string>>({})
  const normalizeBrand = (s: string) => {
    const t = String(s || '').toLowerCase()
    if (/小鹏|xpeng/.test(t)) return 'xpeng'
    if (/奥迪|audi/.test(t)) return 'audi'
    if (/比亚迪|byd/.test(t)) return 'byd'
    if (/大众|volkswagen|vw/.test(t)) return 'volkswagen'
    if (/特斯拉|tesla/.test(t)) return 'tesla'
    return t.trim()
  }
  const detectBrandFromText = (text: string) => {
    const t = String(text || '').toLowerCase()
    if (/小鹏|xpeng/.test(t)) return 'xpeng'
    if (/奥迪|audi/.test(t)) return 'audi'
    if (/比亚迪|byd/.test(t)) return 'byd'
    if (/大众|volkswagen|vw/.test(t)) return 'volkswagen'
    if (/特斯拉|tesla/.test(t)) return 'tesla'
    return ''
  }
  const userStore = useUserStore()
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
    if (!list.length) return [{ label: '全部车型', value: '' }]
    const out = [{ label: '全部车型', value: '' } as { label: string; value: number | '' }]
    list.forEach((m) => out.push({ label: m.label, value: m.value }))
    return out
  })

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
      try {
        const deptRes = await fetchGetDepartmentList({})
        const tree: any[] = Array.isArray(deptRes as any)
          ? (deptRes as any as any[])
          : (deptRes as any)?.data || []
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
      } catch (err) {
        void err
      }
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

  const loadModels = async () => {
    try {
      const sid = Number(storeId.value)
      if (!Number.isFinite(sid) || sid <= 0) {
        const brandCanon = currentBrand.value
        if (!brandCanon) {
          models.value = [{ label: '全部车型', value: '' }]
          modelsAll.value = [{ label: '全部车型', value: '' }]
          return
        }
        const catsRes: any = await request.get({ url: '/api/category/all' })
        const cats: any[] = Array.isArray(catsRes?.data) ? catsRes.data : []
        const target = cats.find(
          (c: any) =>
            String(c.level || 0) === '0' && normalizeBrand(String(c.name || '')) === brandCanon
        )
        if (!target) {
          models.value = [{ label: '全部车型', value: '' }]
          modelsAll.value = [{ label: '全部车型', value: '' }]
          return
        }
        const prods: any = await request.get({
          url: `/api/category/${Number(target.id)}/products`,
          params: { includeChildren: 'true' }
        })
        const arr2 = Array.isArray(prods?.data) ? prods.data : []
        const opts: Array<{ label: string; value: number | ''; brand?: string }> = [
          { label: '全部车型', value: '' }
        ]
        arr2.forEach((m: any) => {
          const idNum = Number(m.id)
          const label = String(m.name || idNum)
          if (Number.isFinite(idNum)) opts.push({ label, value: idNum, brand: brandCanon })
        })
        modelsAll.value = opts
        models.value = opts.map((m) => ({ label: m.label, value: m.value }))
        return
      }
      const brandCanon = currentBrand.value
      const list: any = await fetchGetModelsByStore(sid)
      const arr: any[] = Array.isArray(list)
        ? list
        : Array.isArray((list as any)?.records)
          ? (list as any).records
          : []
      const opts: Array<{ label: string; value: number | ''; brand?: string }> = [
        { label: '全部车型', value: '' }
      ]
      arr.forEach((m: any) => {
        const idNum = Number(m.id)
        const label = String(m.name || idNum)
        if (Number.isFinite(idNum)) {
          const brand = normalizeBrand(String(m.brand || brandCanon || ''))
          opts.push({ label, value: idNum, brand })
        }
      })
      modelsAll.value = opts
      models.value = opts.map((m) => ({ label: m.label, value: m.value }))
    } catch {
      models.value = [{ label: '全部车型', value: '' }]
      modelsAll.value = [{ label: '全部车型', value: '' }]
    }
  }

  watch(storeId, () => {
    modelId.value = ''
    compareModelId.value = ''
    enableCompare.value = false
    loadModels()
  })

  const funnelItems = ref<Array<{ stage: string; value: number }>>([])
  const funnelItemsRight = ref<Array<{ stage: string; value: number }>>([])
  const prevMap = ref<Record<string, number>>({})
  const prevMapRight = ref<Record<string, number>>({})

  const hasCompareSelection = computed(() => compareModelId.value !== '')

  const legendA = computed(() => {
    const mid = Number(modelId.value || 0)
    const m = modelsView.value.find((x) => Number(x.value || 0) === mid)
    return m?.label || '当前车型'
  })
  const legendB = computed(() => {
    const mid = Number(compareModelId.value || 0)
    const m = modelsView.value.find((x) => Number(x.value || 0) === mid)
    return m?.label || '对比车型'
  })
  const compareTitle = computed(() => legendB.value || '对比车型漏斗')
  const leftTitle = computed(() => {
    const mid = Number(modelId.value || 0)
    const m = modelsView.value.find((x) => Number(x.value || 0) === mid)
    return m?.label ? `${m.label}线索转化分析` : '车型线索转化分析'
  })
  const overlayTitle = computed(() => `${String(props.title || '车型线索转化分析')}（叠加）`)

  const loadFunnel = async () => {
    const params: Record<string, any> = {}
    if (storeId.value !== '') params.storeId = Number(storeId.value)
    if (modelId.value !== '') params.modelId = modelId.value
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

    // 统一采用线索聚合：确保门店维度不会回退成全量
    const sid = Number(storeId.value || 0)
    const mid = Number(modelId.value || 0)
    const localItems = await buildFunnelFromCluesByModel(sid, mid)
    funnelItems.value = localItems.map((it) => ({
      stage: normalizeStageLabel(String(it.stage)),
      value: Number(it.value) || 0
    }))
    await loadPrevFunnel(params)
  }

  const loadFunnelRight = async () => {
    if (!enableCompare.value || compareModelId.value === '') {
      funnelItemsRight.value = []
      prevMapRight.value = {}
      return
    }
    const params: Record<string, any> = {}
    if (storeId.value !== '') params.storeId = Number(storeId.value)
    params.period = periodType.value
    if (periodType.value === 'month') {
      const m = getMonthStr(dateMonth.value)
      if (m) params.month = m
    }
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
    if (periodType.value === 'year' && dateYear.value) params.year = dateYear.value
    params.modelId = compareModelId.value

    const sid = Number(storeId.value || 0)
    const mid = Number(compareModelId.value || 0)
    const localItems = await buildFunnelFromCluesByModel(sid, mid)
    funnelItemsRight.value = localItems.map((it) => ({
      stage: normalizeStageLabel(String(it.stage)),
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
      const itemsPrev = await requestFunnel(params2)
      const map: Record<string, number> = {}
      itemsPrev.forEach(
        (it) => (map[normalizeStageLabel(String(it.stage))] = Number(it.value) || 0)
      )
      prevMap.value = map
    } else {
      prevMap.value = {}
    }
  }

  const loadPrevFunnelRight = async (baseParams: Record<string, any>) => {
    const params2: Record<string, any> = { ...baseParams }
    if (periodType.value === 'month') {
      const prev = getPrevMonthStr(dateMonth.value)
      params2.month = prev
      delete params2.start
      delete params2.end
      const itemsPrev = await requestFunnel(params2)
      const map: Record<string, number> = {}
      itemsPrev.forEach(
        (it) => (map[normalizeStageLabel(String(it.stage))] = Number(it.value) || 0)
      )
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
    return [
      '全部商机数量',
      '首次到店',
      '首次试驾',
      '首次成交',
      '再次到店/接触（上门）',
      '再次试驾',
      '再次成交',
      '综合成交'
    ].map((stage) => {
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
    return [
      '全部商机数量',
      '首次到店',
      '首次试驾',
      '首次成交',
      '再次到店/接触（上门）',
      '再次试驾',
      '再次成交',
      '综合成交'
    ].map((stage) => {
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
    return [
      '全部商机数量',
      '首次到店',
      '首次试驾',
      '首次成交',
      '再次到店/接触（上门）',
      '再次试驾',
      '再次成交',
      '综合成交'
    ].map((stage) => {
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

  const percentLabelStyle = (p: number) => {
    void p
    return {
      left: '50%',
      top: '50%',
      transform: 'translate(-50%, -50%)'
    }
  }
  const normalizeStageLabel = (s: string) => {
    return String(s) === '全部订单数量' ? '全部商机数量' : String(s)
  }
  const requestFunnelCache = new Map<
    string,
    { ts: number; items: { stage: string; value: number }[] }
  >()
  const requestFunnelInflight = new Map<string, Promise<{ stage: string; value: number }[]>>()
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
          const r = await request.get<{ items: { stage: string; value: number }[] }>({
            url: '/api/bi/sales-funnel',
            params,
            showErrorMessage: false
          })
          return Array.isArray(r?.items) ? r!.items : []
        } catch {
          try {
            const r2 = await request.get<{ items: { stage: string; value: number }[] }>({
              url: '/api/bi/sales-funnel/open',
              params,
              showErrorMessage: false
            })
            return Array.isArray(r2?.items) ? r2!.items : []
          } catch {
            continue
          }
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

  const stageInfoMap: Record<string, string> = {
    全部商机数量: '总商机个数（按筛选条件统计）',
    首次到店: '该商机的第一条到店记录',
    首次试驾: '首次到店阶段的试驾记录',
    首次成交: '成交发生在首次到店阶段',
    '再次到店/接触（上门）': '同一商机的第二次及以后到店或上门接触',
    再次试驾: '再次到店阶段的试驾记录',
    再次成交: '再次到店阶段的试驾记录',
    综合成交: '成交商机个数（按商机去重计数）'
  }
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

  const buildRangeForClue = (): [string, string] | null => {
    if (periodType.value === 'day' && dateDay.value) {
      if (Array.isArray(dateDay.value)) {
        const s = String(dateDay.value[0] || '')
        const e = String(dateDay.value[1] || '')
        if (s && e) return [s, e]
      } else {
        const d = String(dateDay.value || '')
        if (d) return [d, d]
      }
    }
    if (periodType.value === 'month' && dateMonth.value) {
      const d = dateMonth.value as any
      const y = Number(new Date(d).getFullYear())
      const m = Number(new Date(d).getMonth())
      const start = new Date(y, m, 1)
      const end = new Date(y, m + 1, 0)
      const fmt = (x: Date) =>
        `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`
      return [fmt(start), fmt(end)]
    }
    if (periodType.value === 'year' && dateYear.value) {
      const y = Number(dateYear.value || 0)
      if (Number.isFinite(y) && y > 0) return [`${y}-01-01`, `${y}-12-31`]
    }
    return null
  }
  const buildFunnelFromCluesByModel = async (sid: number, mid: number) => {
    const range = buildRangeForClue()
    const visibleIds = getVisibleStoreIds()
    const pageSize = 500
    let page = 1
    let all: any[] = []
    while (true) {
      const p: any = { current: page, size: pageSize }
      if (range) p.daterange = range
      try {
        const resp: any = await fetchGetClueList(p)
        const list: any[] = (resp?.records as any) || []
        all = all.concat(list)
        if (!Array.isArray(list) || list.length < pageSize) break
        page++
      } catch {
        break
      }
    }
    const modelNameSel = String(
      modelsView.value.find((x) => Number(x.value || 0) === Number(mid))?.label || ''
    ).trim()
    const filtered = all.filter((x) => {
      const s0 = Number((x as any)?.storeId || 0)
      if (sid > 0 && s0 !== sid) return false
      if (!(sid > 0) && visibleIds.length && !visibleIds.includes(s0)) return false
      const dealId = Number((x as any)?.dealModelId || 0)
      const dealName = String((x as any)?.dealModelName || '')
      const crmName = String((x as any)?.convertOrRetentionModel || '')
      if (Number.isFinite(mid) && mid > 0) {
        if (dealId && dealId === mid) return true
        if (modelNameSel && dealName && dealName === modelNameSel) return true
        if (modelNameSel && crmName && crmName === modelNameSel) return true
        return false
      }
      return true
    })
    const key = (s: string) => normalizeStageLabel(s)
    const allSet = new Set<string>()
    const firstSet = new Set<string>()
    const firstTdSet = new Set<string>()
    const firstDealSet = new Set<string>()
    const againSet = new Set<string>()
    const againTdSet = new Set<string>()
    const againDealSet = new Set<string>()
    const dealPhoneSet = new Set<string>()
    const keyOf = (it: any) =>
      String(
        (it as any)?.customerPhone || (it as any)?.customerSnapshot?.phone || (it as any)?.id || ''
      )
    filtered.forEach((it: any) => {
      const k = keyOf(it)
      if (!k) return
      const visitCat = String((it as any)?.visitCategory || '')
      const td = !!(it as any)?.testDrive
      const deal = !!(it as any)?.dealDone
      if (!allSet.has(k)) allSet.add(k)
      if (visitCat === '首次') {
        firstSet.add(k)
        if (td) firstTdSet.add(k)
        if (deal) firstDealSet.add(k)
      } else if (visitCat === '再次') {
        againSet.add(k)
        if (td) againTdSet.add(k)
        if (deal) againDealSet.add(k)
      }
      if (deal) dealPhoneSet.add(k)
    })
    const map: Record<string, number> = {}
    map[key('全部商机数量')] = allSet.size
    map[key('首次到店')] = firstSet.size
    map[key('首次试驾')] = firstTdSet.size
    map[key('首次成交')] = firstDealSet.size
    map[key('再次到店/接触（上门）')] = againSet.size
    map[key('再次试驾')] = againTdSet.size
    map[key('再次成交')] = againDealSet.size
    map[key('综合成交')] = dealPhoneSet.size
    return STAGES.map((st) => ({ stage: st, value: Math.max(0, Number(map[key(st)] || 0)) }))
  }

  const apply = () => {
    loadFunnel()
    loadFunnelRight()
  }
  const reset = () => {
    periodType.value = 'month'
    dateDay.value = ''
    dateWeek.value = ''
    dateMonth.value = ''
    dateYear.value = ''
    storeId.value = ''
    modelId.value = ''
    compareModelId.value = ''
    enableCompare.value = false
    overlayMode.value = false
    funnelItems.value = []
    funnelItemsRight.value = []
  }

  onMounted(async () => {
    await loadStores()
    const userStore = useUserStore()
    const myStore = Number(userStore.info?.storeId || 0)
    const selectableCount = stores.value.filter((o) => o.value !== '').length
    if (!storeId.value && Number.isFinite(myStore) && myStore > 0 && selectableCount === 1) {
      storeId.value = myStore
    }
    await loadModels()
    apply()
  })
</script>

<style scoped>
  .filters {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
  }

  .charts-row {
    display: flex;
    gap: 12px;
    width: 100%;
  }

  .funnel-card {
    flex: 0 0 48%;
    width: 48%;
  }

  .charts-row.single .funnel-card {
    flex: 1 1 100%;
    width: 100%;
    max-width: 100%;
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
