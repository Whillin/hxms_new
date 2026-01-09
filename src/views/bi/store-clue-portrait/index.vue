<template>
  <div class="page-content art-full-height">
    <ElCard class="art-custom-card" shadow="never">
      <template #header>
        <div class="card-title">到店线索画像分析</div>
      </template>

      <ElCard class="filters-card" style="margin-bottom: 12px">
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
            :disabled-date="disableFutureDate"
          />
          <el-date-picker
            v-if="periodType === 'week'"
            v-model="dateWeek"
            type="week"
            placeholder="选择周"
            size="small"
            :disabled-date="disableFutureDate"
          />
          <el-date-picker
            v-if="periodType === 'month'"
            v-model="dateMonth"
            type="month"
            placeholder="选择月份"
            size="small"
            :disabled-date="disableFutureDate"
          />
          <el-date-picker
            v-if="periodType === 'year'"
            v-model="dateYear"
            type="year"
            placeholder="选择年份"
            size="small"
            :disabled-date="disableFutureDate"
          />

          <el-select v-model="storeId" placeholder="选择门店" size="small" style="width: 150px">
            <el-option v-for="s in stores" :key="s.value" :label="s.label" :value="s.value" />
          </el-select>

          <el-select
            v-model="focusModelId"
            placeholder="选择车型"
            size="small"
            style="width: 150px"
            :disabled="storeId === '' || modelOptions.length <= 1"
          >
            <el-option v-for="m in modelOptions" :key="m.value" :label="m.label" :value="m.value" />
          </el-select>

          <el-select v-model="dealStatus" placeholder="成交状态" size="small" style="width: 140px">
            <el-option
              v-for="o in dealStatusOptions"
              :key="o.value"
              :label="o.label"
              :value="o.value"
            />
          </el-select>

          <el-button type="primary" size="small" @click="apply"> 应用 </el-button>
          <el-button size="small" @click="reset">重置</el-button>
        </div>
      </ElCard>

      <div class="content" v-loading="loading">
        <ElCard class="art-custom-card" shadow="never">
          <template #header>
            <div class="card-title">客户画像</div>
          </template>

          <el-row :gutter="12">
            <el-col :xs="24" :md="8">
              <ElCard class="art-custom-card metric-card" shadow="never">
                <div class="metric-title">平均年龄</div>
                <div class="metric-value">{{ avgAgeText }}</div>
              </ElCard>
            </el-col>
            <el-col :xs="24" :md="8">
              <ElCard class="art-custom-card metric-card" shadow="never">
                <div class="metric-title">平均车龄</div>
                <div class="metric-value">{{ avgCarAgeText }}</div>
              </ElCard>
            </el-col>
            <el-col :xs="24" :md="8">
              <ElCard class="art-custom-card metric-card" shadow="never">
                <div class="metric-title">平均里程</div>
                <div class="metric-value">{{ avgMileageText }}</div>
              </ElCard>
            </el-col>
          </el-row>

          <el-row :gutter="12" style="margin-top: 12px">
            <el-col :xs="24" :md="8">
              <ElCard class="art-custom-card chart-card" shadow="never">
                <div class="chart-title">性别占比</div>
                <div style="position: relative; height: 280px">
                  <ArtRingChart
                    v-if="genderDistList.length"
                    :data="genderDistList"
                    :radius="['0%', '60%']"
                    :showLegend="true"
                    legendPosition="bottom"
                    height="280px"
                  />
                  <div v-else class="empty-text">暂无数据</div>
                </div>
              </ElCard>
            </el-col>

            <el-col :xs="24" :md="8">
              <ElCard class="art-custom-card chart-card" shadow="never">
                <div class="chart-title">购车经历</div>
                <div style="position: relative; height: 280px">
                  <ArtRingChart
                    v-if="buyExperienceDistList.length"
                    :data="buyExperienceDistList"
                    :radius="['0%', '60%']"
                    :showLegend="true"
                    legendPosition="bottom"
                    height="280px"
                  />
                  <div v-else class="empty-text">暂无数据</div>
                </div>
              </ElCard>
            </el-col>

            <el-col :xs="24" :md="8">
              <ElCard class="art-custom-card chart-card" shadow="never">
                <div class="chart-title">到店分类</div>
                <div style="position: relative; height: 280px">
                  <ArtRingChart
                    v-if="visitCategoryDistList.length"
                    :data="visitCategoryDistList"
                    :radius="['0%', '60%']"
                    :showLegend="true"
                    legendPosition="bottom"
                    height="280px"
                  />
                  <div v-else class="empty-text">暂无数据</div>
                </div>
              </ElCard>
            </el-col>
          </el-row>
        </ElCard>

        <ElCard class="art-custom-card" shadow="never" style="margin-top: 12px">
          <template #header>
            <div class="card-title">渠道画像</div>
          </template>
          <el-row :gutter="12">
            <el-col :xs="24" :md="8">
              <ElCard class="art-custom-card chart-card" shadow="never">
                <div class="chart-title">集客类型</div>
                <div style="position: relative; height: 280px">
                  <ArtRingChart
                    v-if="channelTypeDistList.length"
                    :data="channelTypeDistList"
                    :radius="['0%', '60%']"
                    :showLegend="true"
                    legendPosition="bottom"
                    height="280px"
                  />
                  <div v-else class="empty-text">暂无数据</div>
                </div>
              </ElCard>
            </el-col>
            <el-col :xs="24" :md="8">
              <ElCard class="art-custom-card chart-card" shadow="never">
                <div class="chart-title">集客渠道</div>
                <div style="position: relative; height: 280px">
                  <ArtRingChart
                    v-if="channelSourceDistList.length"
                    :data="channelSourceDistList"
                    :radius="['40%', '60%']"
                    :showLegend="true"
                    legendPosition="bottom"
                    height="280px"
                  />
                  <div v-else class="empty-text">暂无数据</div>
                </div>
              </ElCard>
            </el-col>
            <el-col :xs="24" :md="8">
              <ElCard class="art-custom-card chart-card" shadow="never">
                <div class="chart-title">战败原因分析</div>
                <div style="position: relative; height: 280px">
                  <ArtRingChart
                    v-if="failReasonDistList.length"
                    :data="failReasonDistList"
                    :radius="['40%', '60%']"
                    :showLegend="true"
                    legendPosition="bottom"
                    height="280px"
                  />
                  <div v-else class="empty-text">暂无数据</div>
                </div>
              </ElCard>
            </el-col>
          </el-row>
        </ElCard>
      </div>
    </ElCard>
  </div>
</template>

<script setup lang="ts">
  import { computed, onMounted, ref, watch } from 'vue'
  import { storeToRefs } from 'pinia'
  import request from '@/utils/http'
  import { fetchGetCustomerStoreOptions } from '@/api/customer'
  import { fetchGetModelsByStore } from '@/api/product'
  import { useUserStore } from '@/store/modules/user'

  type PeriodType = 'day' | 'week' | 'month' | 'year'

  const periodType = ref<PeriodType>('month')
  const dateDay = ref<[string, string] | string | undefined>()
  const dateWeek = ref<any>()
  const dateMonth = ref<any>()
  const dateYear = ref<any>()

  const userStore = useUserStore()
  const { info } = storeToRefs(userStore)

  const storeId = ref<number | ''>('')
  const focusModelId = ref<number | ''>('')
  const dealStatus = ref<'all' | 'done' | 'undone'>('all')

  const dealStatusOptions: Array<{ label: string; value: 'all' | 'done' | 'undone' }> = [
    { label: '全部', value: 'all' as const },
    { label: '已成交', value: 'done' as const },
    { label: '未成交', value: 'undone' as const }
  ]

  const stores = ref<Array<{ label: string; value: number | '' }>>([
    { label: '全部门店', value: '' }
  ])
  const modelOptions = ref<Array<{ label: string; value: number | '' }>>([
    { label: '全部车型', value: '' }
  ])

  const loading = ref(false)
  const avgAge = ref<number | null>(null)
  const avgCarAge = ref<number | null>(null)
  const avgMileage = ref<number | null>(null)
  const gender = ref<Array<{ name: string; value: number }>>([])
  const buyExperience = ref<Array<{ name: string; value: number }>>([])
  const visitCategory = ref<Array<{ name: string; value: number }>>([])
  const failReason = ref<Array<{ name: string; value: number }>>([])
  const channelType = ref<Array<{ name: string; value: number }>>([])
  const channelSource = ref<Array<{ name: string; value: number }>>([])

  const disableFutureDate = (d: Date) => d.getTime() > Date.now()

  const pad2 = (n: number) => `${n}`.padStart(2, '0')

  const toLocalYmd = (d: Date) => {
    const y = d.getFullYear()
    const m = pad2(d.getMonth() + 1)
    const day = pad2(d.getDate())
    return `${y}-${m}-${day}`
  }

  const toLocalYm = (d: Date) => {
    const y = d.getFullYear()
    const m = pad2(d.getMonth() + 1)
    return `${y}-${m}`
  }

  const toLocalY = (d: Date) => `${d.getFullYear()}`

  const normalizeDate = (v: any) => {
    if (!v) return ''
    if (typeof v === 'string') return v
    const t = v?.getTime?.()
    if (typeof t === 'number' && !Number.isNaN(t)) return toLocalYmd(v as Date)
    return String(v)
  }

  const avgAgeText = computed(() => (typeof avgAge.value === 'number' ? `${avgAge.value} 岁` : '-'))
  const avgCarAgeText = computed(() =>
    typeof avgCarAge.value === 'number' ? `${avgCarAge.value} 年` : '-'
  )
  const avgMileageText = computed(() => {
    if (typeof avgMileage.value !== 'number') return '-'
    if (avgMileage.value >= 10000) {
      return `${(avgMileage.value / 10000).toFixed(1)} 万公里`
    }
    return `${avgMileage.value} 公里`
  })

  type DistRow = { name: string; value: number }
  type DistViewRow = { name: string; value: number; percent: number; percentText: string }
  const toDistList = (arr: DistRow[]): DistViewRow[] => {
    const list = Array.isArray(arr) ? arr : []
    const filtered = list
      .map((x) => ({
        name: String(x.name || '').trim() || '未知',
        value: Math.max(0, Number(x.value || 0))
      }))
      .filter((x) => x.value > 0)
      .sort((a, b) => b.value - a.value)
    const sum = filtered.reduce((s, x) => s + x.value, 0)
    if (sum <= 0) return []
    return filtered.map((x) => {
      const pct = Math.max(0, Math.min(100, Math.round((x.value / sum) * 100)))
      return { ...x, percent: pct, percentText: `${pct}%` }
    })
  }

  const genderDistList = computed(() => toDistList(gender.value))
  const buyExperienceDistList = computed(() => toDistList(buyExperience.value))
  const visitCategoryDistList = computed(() => toDistList(visitCategory.value))
  const failReasonDistList = computed(() => toDistList(failReason.value))
  const channelTypeDistList = computed(() => toDistList(channelType.value))
  const channelSourceDistList = computed(() => toDistList(channelSource.value))

  const loadStores = async () => {
    const res = await fetchGetCustomerStoreOptions()
    const list = Array.isArray(res) ? res : []
    const opts: Array<{ label: string; value: number | '' }> = [{ label: '全部门店', value: '' }]
    list.forEach((x) => {
      const id = Number((x as any)?.id || 0)
      if (!Number.isFinite(id) || id <= 0) return
      opts.push({ label: String((x as any)?.name || id), value: id })
    })
    stores.value = opts
  }

  const loadModels = async () => {
    modelOptions.value = [{ label: '全部车型', value: '' }]
    focusModelId.value = ''

    if (storeId.value === '') {
      return
    }

    const sid = Number(storeId.value)
    if (!Number.isFinite(sid) || sid <= 0) return

    try {
      const list = await fetchGetModelsByStore(sid)
      const arr = Array.isArray(list) ? list : []
      const opts: Array<{ label: string; value: number | '' }> = [{ label: '全部车型', value: '' }]
      arr.forEach((m: any) => {
        const id = Number(m.id)
        if (!Number.isFinite(id) || id <= 0) return
        const label = String(m.name || id)
        opts.push({ label, value: id })
      })
      modelOptions.value = opts
    } catch {
      modelOptions.value = [{ label: '全部车型', value: '' }]
    }
  }

  const buildParams = () => {
    const params: Record<string, any> = { period: periodType.value }
    if (storeId.value !== '') params.storeId = Number(storeId.value)
    if (focusModelId.value !== '') params.focusModelId = Number(focusModelId.value)
    if (dealStatus.value !== 'all') params.dealStatus = dealStatus.value

    if (periodType.value === 'day' && dateDay.value) {
      if (Array.isArray(dateDay.value)) {
        params.start = dateDay.value[0]
        params.end = dateDay.value[1]
      } else {
        params.start = dateDay.value
        params.end = dateDay.value
      }
    }
    if (periodType.value === 'week' && dateWeek.value) params.week = normalizeDate(dateWeek.value)
    if (periodType.value === 'month' && dateMonth.value) {
      const raw = dateMonth.value
      if (typeof raw === 'string') params.month = String(raw).slice(0, 7)
      else if (raw?.getTime?.() !== undefined) params.month = toLocalYm(raw as Date)
      else params.month = normalizeDate(raw).slice(0, 7)
    }
    if (periodType.value === 'year' && dateYear.value) {
      const raw = dateYear.value
      if (typeof raw === 'string') params.year = String(raw).slice(0, 4)
      else if (raw?.getTime?.() !== undefined) params.year = toLocalY(raw as Date)
      else params.year = normalizeDate(raw).slice(0, 4)
    }
    return params
  }

  const loadPortrait = async () => {
    loading.value = true
    try {
      const data = await request.get<{
        total: number
        avgAge: number | null
        avgCarAge: number | null
        avgMileage: number | null
        gender: { name: string; value: number }[]
        buyExperience: { name: string; value: number }[]
        visitCategory: { name: string; value: number }[]
        failReason: { name: string; value: number }[]
        channelType: { name: string; value: number }[]
        channelSource: { name: string; value: number }[]
      }>({
        url: '/api/bi/store-clue-portrait',
        params: buildParams(),
        showErrorMessage: false
      })
      const a = data?.avgAge
      avgAge.value = typeof a === 'number' && Number.isFinite(a) ? a : null
      const b = data?.avgCarAge
      avgCarAge.value = typeof b === 'number' && Number.isFinite(b) ? b : null
      const c = data?.avgMileage
      avgMileage.value = typeof c === 'number' && Number.isFinite(c) ? c : null
      gender.value = Array.isArray(data?.gender) ? data.gender : []
      buyExperience.value = Array.isArray(data?.buyExperience) ? data.buyExperience : []
      visitCategory.value = Array.isArray(data?.visitCategory) ? data.visitCategory : []
      failReason.value = Array.isArray(data?.failReason) ? data.failReason : []
      channelType.value = Array.isArray(data?.channelType) ? data.channelType : []
      channelSource.value = Array.isArray(data?.channelSource) ? data.channelSource : []
    } finally {
      loading.value = false
    }
  }

  const apply = async () => {
    await loadPortrait()
  }

  const reset = async () => {
    periodType.value = 'month'
    dateDay.value = undefined
    dateWeek.value = undefined
    dateMonth.value = new Date()
    dateYear.value = undefined
    storeId.value = ''
    focusModelId.value = ''
    dealStatus.value = 'all'
    await loadModels()
    await loadPortrait()
  }

  watch(storeId, async () => {
    await loadModels()
  })

  onMounted(async () => {
    await loadStores()
    dateMonth.value = new Date()
    const defaultStoreId = Number((info.value as any)?.storeId || 0)
    const selectableStoreIds = new Set(
      (stores.value || [])
        .map((s) => Number((s as any)?.value))
        .filter((id) => Number.isFinite(id) && id > 0)
    )
    if (
      Number.isFinite(defaultStoreId) &&
      defaultStoreId > 0 &&
      selectableStoreIds.has(defaultStoreId)
    ) {
      storeId.value = defaultStoreId
    } else {
      storeId.value = ''
    }
    await loadModels()
    await loadPortrait()
  })
</script>

<style lang="scss" scoped>
  .card-title {
    font-size: 16px;
    font-weight: 600;
  }

  .page-content.art-full-height {
    display: flex;
    flex-direction: column;
    overflow: auto !important;
  }

  .art-custom-card {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-height: 0;
  }

  :deep(.art-custom-card .el-card__body) {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-height: 0;
    overflow: auto;
  }

  .content {
    flex: 1;
    min-height: 0;
  }

  .filters {
    display: flex;
    flex-wrap: nowrap;
    gap: 6px;
    align-items: center;
    padding: 2px 0;
  }

  .filters-card {
    flex: none;
  }

  :deep(.filters-card .el-card__body) {
    display: block;
    min-height: auto;
    padding: 8px 10px;
  }

  .metric-card {
    min-height: 120px;
  }

  .metric-title {
    font-size: 12px;
    color: var(--art-gray-text-700);
  }

  .metric-value {
    margin-top: 10px;
    font-size: 28px;
    font-weight: 700;
    color: var(--art-gray-text-900);
  }

  .metric-sub {
    margin-top: 10px;
    font-size: 14px;
    color: var(--art-gray-text-800);
  }

  .chart-card {
    min-height: 260px;
  }

  .chart-title {
    padding: 4px 0 8px;
    font-size: 14px;
    font-weight: 600;
    color: var(--art-gray-text-900);
  }

  .dist-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .dist-item {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .dist-head {
    display: flex;
    gap: 8px;
    align-items: baseline;
    justify-content: space-between;
  }

  .dist-name {
    font-size: 13px;
    font-weight: 600;
    color: var(--art-gray-text-900);
  }

  .dist-meta {
    font-size: 12px;
    color: var(--art-gray-text-700);
  }

  .empty-text {
    padding: 12px 0;
    color: var(--art-gray-text-600);
  }
</style>
