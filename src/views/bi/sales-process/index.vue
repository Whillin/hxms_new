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
          v-if="false"
          v-model="funnelType"
          placeholder="漏斗类型"
          size="small"
          style="width: 140px; margin-left: 8px"
        >
          <el-option label="门店" value="store" />
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
          v-if="funnelType === 'person' && !props.hideTeamSelect"
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
          v-if="funnelType === 'person' && !props.hideConsultantSelect"
          v-model="consultantId"
          :placeholder="
            (props.personRole || 'consultant') === 'inviter' ? '选择邀约专员' : '选择销售顾问'
          "
          size="small"
          style="width: 180px; margin-left: 8px"
          :multiple="(props.personRole || 'consultant') === 'inviter'"
          collapse-tags
          collapse-tags-tooltip
        >
          <el-option v-for="c in consultants" :key="c.value" :label="c.label" :value="c.value" />
        </el-select>

        <el-select
          v-if="
            enableCompare &&
            !props.disableCompare &&
            funnelType === 'person' &&
            !props.hideConsultantSelect
          "
          v-model="compareConsultantId"
          :placeholder="
            (props.personRole || 'consultant') === 'inviter' ? '对比邀约专员' : '对比顾问'
          "
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
          v-if="
            enableCompare &&
            !props.disableCompare &&
            !props.hideCompareStore &&
            funnelType === 'person'
          "
          v-model="compareStoreId"
          placeholder="对比门店"
          size="small"
          style="width: 180px; margin-left: 8px"
        >
          <el-option
            v-for="s in stores"
            :key="'cmp-store-' + s.value"
            :label="s.label"
            :value="s.value"
          />
        </el-select>

        <el-select
          v-if="
            enableCompare &&
            !props.disableCompare &&
            !props.hideCompareTeam &&
            funnelType === 'person'
          "
          v-model="compareTeamId"
          placeholder="对比小组"
          size="small"
          style="width: 180px; margin-left: 8px"
        >
          <el-option
            v-for="t in compareTeamOptions"
            :key="'cmp-team-' + t.value"
            :label="t.label"
            :value="t.value"
          />
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
          v-if="(props.personRole || 'consultant') !== 'inviter'"
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

    <el-card
      v-if="isConsultantSummaryMode"
      class="art-custom-card full-card"
      v-loading="consultantSummaryLoading"
    >
      <div class="card-title">
        {{
          (props.personRole || 'consultant') === 'inviter' ? '邀约专员指标列表' : '销售顾问指标列表'
        }}
        <el-tooltip
          content="总计=各顾问相加；平均=总计÷顾问数。低于平均以红色加粗标注。"
          placement="top"
        >
          <el-icon class="info-icon"><InfoFilled /></el-icon>
        </el-tooltip>
      </div>
      <template v-if="(props.personRole || 'consultant') !== 'inviter'">
        <el-table
          :data="consultantSummaryRows"
          border
          style="width: 100%"
          :row-class-name="tableRowClassName"
        >
          <el-table-column
            prop="name"
            :label="(props.personRole || 'consultant') === 'inviter' ? '邀约专员' : '销售顾问'"
            width="180"
          />
          <el-table-column
            v-for="st in STAGES"
            :key="'sum-' + st"
            :prop="'values.' + st"
            :label="st"
            width="120"
            align="center"
            header-align="center"
          >
            <template #default="{ row }">
              <span
                :class="{
                  'below-avg':
                    !['全部顾问', '全部邀约专员'].includes(row.name) &&
                    Object.values(row.values || {}).some((v) => Number(v) > 0) &&
                    Number((row.values || {})[st] || 0) < (consultantStageAvg[st] || 0),
                  'text-gray':
                    !['全部顾问', '全部邀约专员'].includes(row.name) &&
                    !Object.values(row.values || {}).some((v) => Number(v) > 0)
                }"
              >
                {{ (row.values || {})[st] ?? 0 }}
              </span>
            </template>
          </el-table-column>
        </el-table>
      </template>
      <template v-else>
        <el-table
          :data="inviterSummaryRows"
          border
          style="width: 100%"
          :row-class-name="tableRowClassName"
        >
          <el-table-column prop="name" label="邀约专员" width="180" />
          <el-table-column prop="leads" label="总线索数量" width="140" align="center">
            <template #default="{ row }">
              <span
                :class="{
                  'text-gray': !['全部邀约专员'].includes(row.name) && Number(row.leads || 0) === 0
                }"
                >{{ row.leads || 0 }}</span
              >
            </template>
          </el-table-column>
          <el-table-column prop="arrivals" label="到店数量" width="140" align="center">
            <template #default="{ row }">
              <span
                :class="{
                  'below-avg':
                    !['全部邀约专员'].includes(row.name) &&
                    Object.values({ leads: row.leads, arrivals: row.arrivals }).some(
                      (v) => Number(v) > 0
                    ) &&
                    Number(row.arrivals || 0) < inviterAvgArrivals,
                  'text-gray':
                    !['全部邀约专员'].includes(row.name) &&
                    Number(row.leads || 0) === 0 &&
                    Number(row.arrivals || 0) === 0
                }"
                >{{ row.arrivals || 0 }}</span
              >
            </template>
          </el-table-column>
          <el-table-column prop="rateText" label="到店率" width="120" align="center">
            <template #default="{ row }">
              <span
                :class="{
                  'below-avg':
                    !['全部邀约专员'].includes(row.name) &&
                    Number(row.leads || 0) > 0 &&
                    row.rate < inviterAvgRate,
                  'text-gray':
                    !['全部邀约专员'].includes(row.name) &&
                    Number(row.leads || 0) === 0 &&
                    Number(row.arrivals || 0) === 0
                }"
                >{{ row.rateText }}</span
              >
            </template>
          </el-table-column>
        </el-table>
      </template>
    </el-card>

    <div
      class="charts-row"
      :class="{ single: !(enableCompare && hasCompareSelection) }"
      v-if="!overlayMode && !isConsultantSummaryMode"
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

    <div v-if="overlayMode && !isConsultantSummaryMode">
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
  </div>
</template>

<script setup lang="ts">
  defineOptions({ name: 'BISalesProcess' })
  const props = defineProps<{
    forcedChannelLevel1?: string
    title?: string
    forcedFunnelType?: 'store' | 'person' | 'model'
    hideConsultantSelect?: boolean
    preferBlankStore?: boolean
    ignoreStoreWhenTeamSelected?: boolean
    hideTeamSelect?: boolean
    disableCompare?: boolean
    hideCompareStore?: boolean
    hideCompareTeam?: boolean
    personRole?: 'consultant' | 'inviter'
  }>()

  import request from '@/utils/http'
  import { fetchGetCustomerStoreOptions } from '@/api/customer'
  import { fetchGetEmployeeList } from '@/api/system-manage'
  import { fetchGetDepartmentList } from '@/api/system-manage'
  import { fetchChannelOptions } from '@/api/channel'
  import { fetchGetClueList } from '@/api/clue'
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
  const getVisibleStoreIds = (): number[] => {
    return stores.value.map((s) => Number(s.value || 0)).filter((n) => Number.isFinite(n) && n > 0)
  }

  const storeId = ref<number | ''>('')
  const funnelType = ref<'store' | 'person' | 'model'>(props.forcedFunnelType || 'store')
  const compareStoreId = ref<number | ''>('')
  const compareTeamId = ref<number | ''>('')
  const compareConsultantId = ref<number | ''>('')

  const overlayMode = ref<boolean>(false)
  const enableCompare = ref<boolean>(false)
  const consultantId = ref<number | '' | any[]>(
    (props.personRole || 'consultant') === 'inviter' ? [] : ''
  )
  const channelType = ref<string>('')
  const stores = ref<Array<{ label: string; value: number | '' }>>([
    { label: '全部门店', value: '' }
  ])
  const consultants = ref<Array<{ label: string; value: number | '' }>>(
    (props.personRole || 'consultant') === 'inviter' ? [] : [{ label: '全部顾问', value: '' }]
  )
  const normalizeStageLabel = (s: string) => {
    return String(s) === '全部订单数量' ? '全部商机数量' : String(s)
  }
  const channels = ref<Array<{ label: string; value: string }>>([{ label: '全部渠道', value: '' }])
  const channelLevel2 = ref<string>('')
  const channelLevel2Options = ref<Array<{ label: string; value: string }>>([
    { label: '全部二级', value: '' }
  ])
  const channelMetaByLevel1 = ref<Record<string, { category: string; businessSource: string }>>({})
  const level2Map = ref<Record<string, { label: string; value: string }[]>>({})
  const teamOptions = ref<Array<{ label: string; value: number | '' }>>([])
  const teamOptionsAll = ref<Array<{ label: string; value: number | '' }>>([])

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
      const onlyOneStore = opts.filter((o) => o.value !== '').length === 1
      if (!storeId.value) {
        const userStore = useUserStore()
        const preferredId = Number((userStore.info as any)?.storeId || 0)
        if (!props.preferBlankStore && preferredId > 0) {
          const hasPreferred = opts.some((o) => Number(o.value || 0) === preferredId)
          storeId.value = hasPreferred ? preferredId : ''
        } else if (!props.preferBlankStore && onlyOneStore) {
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

  const consultantAllowedRoles = computed(() =>
    (props.personRole || 'consultant') === 'inviter'
      ? new Set(['R_APPOINTMENT'])
      : new Set(['R_SALES', 'R_SALES_MANAGER'])
  )
  const loadConsultants = async () => {
    try {
      const sid = Number(storeId.value || 0)
      const res: any = await fetchGetEmployeeList({ current: 1, size: 200, storeId: sid })
      const records = res?.records || res?.list || []
      const opts: Array<{ label: string; value: number | '' }> = []
      if ((props.personRole || 'consultant') !== 'inviter') {
        opts.push({
          label: '全部顾问',
          value: ''
        })
      }
      records
        .filter((r: any) => consultantAllowedRoles.value.has(String(r.role)))
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
      const optsAll: Array<{ label: string; value: number | '' }> = []
      const selectedSid = Number(storeId.value || 0)
      const walk = (arr: any[], context: { storeName?: string; storeId?: number } = {}) => {
        for (const n of arr) {
          const nodeName = String(n.name || n.id)
          const nextContext: { storeName?: string; storeId?: number } = {
            storeName: n.type === 'store' ? nodeName : context.storeName,
            storeId:
              n.type === 'store'
                ? Number(n.id)
                : typeof context.storeId === 'number'
                  ? context.storeId
                  : undefined
          }
          if (n.type === 'team') {
            const idNum = Number(n.id)
            if (Number.isFinite(idNum)) {
              optsAll.push({
                label: `${nextContext.storeName || ''} ${String(n.name || idNum)}`.trim(),
                value: idNum
              })
            }
          }
          if (Array.isArray(n.children)) walk(n.children, nextContext)
        }
      }
      walk(tree)
      teamOptionsAll.value = optsAll
      // 依据当前门店筛选主选择的小组选项；对比小组选项使用全部
      const filtered =
        Number.isFinite(selectedSid) && selectedSid > 0
          ? optsAll.filter((opt) => {
              // 提取 label 前缀中的门店名进行匹配（label 构成为 "门店名 小组名"）
              const label = String(opt.label || '')
              return label.startsWith(
                (stores.value.find((s) => Number(s.value || 0) === selectedSid)?.label || '').trim()
              )
            })
          : optsAll
      teamOptions.value = filtered
    } catch {
      teamOptions.value = []
      teamOptionsAll.value = []
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
    loadTeams()
    teamId.value = ''
  })
  watch(compareStoreId, () => {
    compareTeamId.value = ''
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
    if (isConsultantSummaryMode.value) {
      loadConsultantSummary()
    } else {
      loadFunnel()
      if (enableCompare.value && hasCompareSelection.value) {
        loadFunnelRight()
      } else {
        funnelItemsRight.value = []
      }
    }
  }
  const reset = () => {
    periodType.value = 'month'
    dateDay.value = ''
    dateWeek.value = ''
    dateMonth.value = ''
    dateYear.value = ''
    storeId.value = props.preferBlankStore ? '' : storeId.value
    compareStoreId.value = ''
    consultantId.value = ''
    channelType.value = String(props.forcedChannelLevel1 || '')

    funnelItems.value = []
    funnelItemsRight.value = []
    renderFunnel()
  }

  let applyTimer: any = null
  const scheduleApply = () => {
    if (applyTimer) clearTimeout(applyTimer)
    applyTimer = setTimeout(() => {
      applyTimer = null
      apply()
    }, 200)
  }

  onMounted(async () => {
    await Promise.all([loadStores(), loadConsultants(), loadChannels(), loadTeams()])
    channelType.value = String(props.forcedChannelLevel1 || '')
    scheduleApply()
  })

  const funnelItems = ref<Array<{ stage: string; value: number }>>([])
  const funnelItemsRight = ref<Array<{ stage: string; value: number }>>([])
  const prevMap = ref<Record<string, number>>({})
  const teamId = ref<number | ''>('')
  const disableFutureDate = (date: Date) => {
    return date.getTime() > Date.now()
  }
  const isConsultantSummaryMode = computed(() => {
    if ((props.personRole || 'consultant') === 'inviter') return true
    return (
      funnelType.value === 'person' &&
      !enableCompare.value &&
      !overlayMode.value &&
      String(consultantId.value || '') === '' &&
      !!props.hideTeamSelect &&
      !props.hideConsultantSelect
    )
  })
  const consultantSummaryRows = ref<Array<{ name: string; values: Record<string, number> }>>([])
  const consultantSummaryLoading = ref<boolean>(false)
  const consultantStageAvg = ref<Record<string, number>>({})
  const inviterSummaryRows = ref<
    Array<{ name: string; leads: number; arrivals: number; rate: number; rateText: string }>
  >([])
  const inviterAvgArrivals = ref<number>(0)
  const inviterAvgRate = ref<number>(0)
  const tableRowClassName = (params: any) => {
    const row = params?.row || {}
    const nm = String(row?.name || '')
    if (nm === '全部顾问' || nm === '全部邀约专员') return 'row-total'
    return ''
  }

  const hasCompareSelection = computed(() => {
    if (funnelType.value === 'store') return compareStoreId.value !== ''
    if (funnelType.value === 'person' && !props.disableCompare)
      return compareTeamId.value !== '' || compareConsultantId.value !== ''
    return false
  })

  const legendA = computed(() => {
    if (funnelType.value === 'store') {
      const sid = Number(storeId.value || 0)
      const s = stores.value.find((x) => Number(x.value || 0) === sid)
      return s?.label || '全部门店'
    }
    if (funnelType.value === 'person') {
      const cid = Number(consultantId.value || 0)
      const tid = Number(teamId.value || 0)
      const c = consultants.value.find((x) => Number(x.value || 0) === cid)
      if (c) return c.label
      const t = teamOptions.value.find((x) => Number(x.value || 0) === tid)
      if (t) return t.label
      return props.hideConsultantSelect
        ? '小组'
        : (props.personRole || 'consultant') === 'inviter'
          ? '邀约专员'
          : '销售顾问'
    }
    return '当前'
  })
  const legendB = computed(() => {
    if (!hasCompareSelection.value) return ''
    if (funnelType.value === 'store') {
      const sid = Number(compareStoreId.value || 0)
      const s = stores.value.find((x) => Number(x.value || 0) === sid)
      return s?.label || '对比门店'
    }
    if (funnelType.value === 'person') {
      const tid = Number(compareTeamId.value || 0)
      const t = teamOptionsAll.value.find((x) => Number(x.value || 0) === tid)
      if (t) return t.label
      if (!props.hideConsultantSelect && compareConsultantId.value !== '') {
        const cid = Number(compareConsultantId.value || 0)
        const c = consultants.value.find((x) => Number(x.value || 0) === cid)
        if (c) return c.label
      }
      return (props.personRole || 'consultant') === 'inviter' ? '对比邀约专员' : '对比对象'
    }
    return '对比'
  })
  const compareTeamOptions = computed(() => {
    const sid = Number(compareStoreId.value || 0)
    if (Number.isFinite(sid) && sid > 0) {
      const storeLabel = (
        stores.value.find((s) => Number(s.value || 0) === sid)?.label || ''
      ).trim()
      return teamOptionsAll.value.filter((opt) => String(opt.label || '').startsWith(storeLabel))
    }
    return teamOptionsAll.value
  })
  const leftTitle = computed(() => {
    const base = String(props.title || '销售漏斗')
    const name = String(legendA.value || '')
    if (!name || /全部/.test(name) || ['当前', '当前对象', '销售顾问'].includes(name)) return base
    return `${name}到店转化分析`
  })
  const overlayTitle = computed(() => `${String(props.title || '到店转化分析')}（叠加）`)

  const compareTitle = computed(() => {
    if (!hasCompareSelection.value) return ''
    if (funnelType.value === 'store') return legendB.value || '对比门店漏斗'
    if (funnelType.value === 'person') return legendB.value || '对比对象漏斗'
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

  const requestFunnel = async (params: Record<string, any>) => {
    const key = JSON.stringify({ p: params })
    const now = Date.now()
    const ttl = 15 * 1000
    if (!requestFunnelCache.has(key)) requestFunnelCache.set(key, { ts: 0, items: [] })
    const cached = requestFunnelCache.get(key)!
    if (cached.ts && now - cached.ts < ttl) return cached.items
    if (requestFunnelInflight.has(key)) return await requestFunnelInflight.get(key)!
    const doFetch = async (): Promise<{ stage: string; value: number }[]> => {
      const tries = [0, 300, 700]
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
    a: { stage: string; value: number }[],
    b: { stage: string; value: number }[]
  ) => {
    if (a.length !== b.length) return true
    const mapA: Record<string, number> = {}
    const mapB: Record<string, number> = {}
    a.forEach((it) => (mapA[normalizeStageLabel(it.stage)] = Number(it.value) || 0))
    b.forEach((it) => (mapB[normalizeStageLabel(it.stage)] = Number(it.value) || 0))
    for (const st of STAGES) {
      const k = normalizeStageLabel(st)
      if ((mapA[k] || 0) !== (mapB[k] || 0)) return true
    }
    return false
  }
  const requestFunnelCache = new Map<
    string,
    { ts: number; items: { stage: string; value: number }[] }
  >()
  const requestFunnelInflight = new Map<string, Promise<{ stage: string; value: number }[]>>()

  const loadFunnel = async () => {
    const base: Record<string, any> = {}
    if (
      storeId.value !== '' &&
      !(props.ignoreStoreWhenTeamSelected && funnelType.value === 'person' && teamId.value !== '')
    )
      base.storeId = storeId.value
    // 人维度未选门店时：仅当未选择具体小组/顾问，才限定为账号可见门店集合
    if (
      funnelType.value === 'person' &&
      storeId.value === '' &&
      String(teamId.value || '') === '' &&
      (String(consultantId.value || '') === '' || !!props.hideConsultantSelect)
    ) {
      const ids = getVisibleStoreIds()
      if (ids.length) {
        ;(base as any).storeIds = ids
        ;(base as any).storeIdList = ids
      }
    }
    if (funnelType.value === 'person' && !props.hideTeamSelect && teamId.value !== '')
      base.teamId = teamId.value
    if (channelType.value) base.channelLevel1 = channelType.value
    if (channelLevel2.value) base.channelLevel2 = channelLevel2.value
    const meta = channelMetaByLevel1.value[String(channelType.value || '')]
    if (meta && meta.businessSource) base.businessSource = meta.businessSource

    base.period = periodType.value
    if (periodType.value === 'day' && dateDay.value) {
      if (Array.isArray(dateDay.value)) {
        base.start = dateDay.value[0]
        base.end = dateDay.value[1]
      } else {
        base.start = dateDay.value
        base.end = dateDay.value
      }
    }
    if (periodType.value === 'week' && dateWeek.value) base.week = dateWeek.value
    if (periodType.value === 'month') {
      const m = getMonthStr(dateMonth.value)
      if (m) base.month = m
    }
    if (periodType.value === 'year' && dateYear.value) base.year = dateYear.value

    let effectiveParams = { ...base }
    let itemsA: { stage: string; value: number }[] = []
    if (funnelType.value === 'person' && !props.hideConsultantSelect && consultantId.value !== '') {
      const sid = Number(storeId.value || 0)
      const cName = String(
        consultants.value.find((x) => Number(x.value || 0) === Number(consultantId.value || 0))
          ?.label || ''
      ).trim()
      const localItems = await buildFunnelFromCluesByConsultant(sid, cName)
      itemsA = localItems
      effectiveParams = { ...base }
    } else if (funnelType.value === 'person' && !props.hideTeamSelect && teamId.value !== '') {
      const sid = Number(storeId.value || 0)
      const tid = Number(teamId.value || 0)
      const localItems = await buildFunnelFromCluesByTeam(sid, tid)
      itemsA = localItems
      effectiveParams = { ...base }
    } else {
      if (funnelType.value === 'store' && storeId.value !== '') {
        const baseline = await requestFunnel(base)
        const sid = Number(storeId.value || 0)
        const sLabel = String(stores.value.find((x) => Number(x.value || 0) === sid)?.label || '')
        const attempts: Record<string, any>[] = [
          { ...base, storeName: sLabel },
          { ...base, storeIds: [sid] },
          { ...base, storeIdList: [sid] }
        ]
        for (const attempt of attempts) {
          const resItems = await requestFunnel(attempt)
          if (compareItems(resItems, baseline)) {
            itemsA = resItems
            effectiveParams = attempt
            break
          }
        }
        if (!itemsA.length) {
          itemsA = baseline
          effectiveParams = { ...base }
        }
      } else {
        itemsA = await requestFunnel(base)
        effectiveParams = { ...base }
      }
    }
    // 门店维度：统一以线索聚合为准（全部门店=账号可见范围）
    // 人维度：当未选择具体小组与顾问时，也采用线索聚合，避免后端口径不一致
    if (funnelType.value === 'store') {
      const sid = Number(storeId.value || 0)
      const localItems = await buildFunnelFromClues(sid)
      funnelItems.value = localItems.map((it) => ({
        stage: normalizeStageLabel(it.stage),
        value: Number(it.value) || 0
      }))
    } else if (
      funnelType.value === 'person' &&
      (String(teamId.value || '') === '' || !!props.hideTeamSelect) &&
      (String(consultantId.value || '') === '' || !!props.hideConsultantSelect)
    ) {
      const sid = Number(storeId.value || 0)
      const localItems = await buildFunnelFromClues(sid)
      funnelItems.value = localItems.map((it) => ({
        stage: normalizeStageLabel(it.stage),
        value: Number(it.value) || 0
      }))
    } else {
      funnelItems.value = itemsA.map((it) => ({
        stage: normalizeStageLabel(it.stage),
        value: Number(it.value) || 0
      }))
    }
    await loadPrevFunnel(effectiveParams)
    renderFunnel()
  }

  const loadConsultantSummary = async () => {
    consultantSummaryLoading.value = true
    // 邀约专员表格模式：无漏斗，仅三字段（总线索、到店、到店率）
    if ((props.personRole || 'consultant') === 'inviter') {
      const buildRange = (): [string, string] | null => {
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
      const range = buildRange()
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
      const sid = Number(storeId.value || 0)
      const visibleIds = getVisibleStoreIds()
      const filtered = all.filter((x) => {
        const s0 = Number((x as any)?.storeId || 0)
        if (sid > 0 && s0 !== sid) return false
        if (!(sid > 0) && visibleIds.length && !visibleIds.includes(s0)) return false
        const src = String(
          (x as any)?.businessSource || (x as any)?.source || (x as any)?.channelCategory || ''
        )
        if (src && src !== '线上') return false
        return true
      })
      const extractInviter = (it: any) => {
        const candidates = [
          String((it as any)?.inviter || ''),
          String((it as any)?.inviterName || ''),
          String((it as any)?.invitePerson || ''),
          String((it as any)?.appointmentStaff || ''),
          String((it as any)?.appointmentUser || ''),
          String((it as any)?.invitedBy || ''),
          String((it as any)?.salesConsultant || '')
        ]
        for (const s of candidates) {
          const nm = String(s || '').trim()
          if (nm) return nm
        }
        return ''
      }
      const isArrival = (it: any) => {
        const cat = String((it as any)?.visitCategory || '')
        return cat === '首次' || cat === '再次'
      }
      let csAll = consultants.value.filter((c) => c.value !== '')
      if (Array.isArray(consultantId.value) && consultantId.value.length > 0) {
        const set = new Set(consultantId.value.map((v) => Number(v)))
        csAll = csAll.filter((c) => set.has(Number(c.value)))
      }
      const nameSet = new Set<string>(
        csAll.map((c) => String(c.label || '').trim()).filter((s) => !!s)
      )
      const counter: Record<string, { leads: number; arrivals: number }> = {}
      csAll.forEach((c) => {
        const nm = String(c.label || '').trim()
        if (nm) counter[nm] = { leads: 0, arrivals: 0 }
      })
      filtered.forEach((it) => {
        const nm = extractInviter(it)
        if (!nm || !nameSet.has(nm)) return
        counter[nm].leads++
        if (isArrival(it)) counter[nm].arrivals++
      })
      // 若无真实数据，注入测试数据（便于验证视图与标注规则）

      const rows: Array<{
        name: string
        leads: number
        arrivals: number
        rate: number
        rateText: string
      }> = []
      Object.keys(counter).forEach((nm) => {
        const { leads, arrivals } = counter[nm]
        const rate = leads > 0 ? arrivals / leads : 0
        rows.push({
          name: nm,
          leads,
          arrivals,
          rate,
          rateText: `${Math.round(rate * 1000) / 10}%`
        })
      })
      const total = rows.reduce(
        (acc, r) => {
          acc.leads += r.leads
          acc.arrivals += r.arrivals
          return acc
        },
        { leads: 0, arrivals: 0 }
      )
      const active = rows.filter((r) => Number(r.leads || 0) > 0 || Number(r.arrivals || 0) > 0)
      const cnt = active.length || 1
      inviterAvgArrivals.value = Math.round(total.arrivals / cnt)
      inviterAvgRate.value =
        active.reduce((sum, r) => sum + (r.leads > 0 ? r.arrivals / r.leads : 0), 0) / cnt
      inviterSummaryRows.value = [
        {
          name: '全部邀约专员',
          leads: total.leads,
          arrivals: total.arrivals,
          rate: total.leads > 0 ? total.arrivals / total.leads : 0,
          rateText: `${Math.round((total.leads > 0 ? total.arrivals / total.leads : 0) * 1000) / 10}%`
        },
        ...rows
      ]
      consultantSummaryLoading.value = false
      return
    }
    const params: Record<string, any> = {}
    if (storeId.value !== '') params.storeId = storeId.value
    // 未选门店：限定账号可见门店集合
    if (storeId.value === '') {
      const ids = getVisibleStoreIds()
      if (ids.length) {
        ;(params as any).storeIds = ids
        ;(params as any).storeIdList = ids
      }
    }
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
    if (channelType.value) params.channelLevel1 = channelType.value
    if (channelLevel2.value) params.channelLevel2 = channelLevel2.value

    const ensureVals = (arr: any[]): Record<string, number> => {
      const vals: Record<string, number> = {}
      for (const it of arr) {
        const st = normalizeStageLabel(String(it.stage || ''))
        vals[st] = Math.max(0, Number(it.value || 0))
      }
      STAGES.forEach((st) => {
        const k = normalizeStageLabel(st)
        if (vals[k] === undefined) vals[k] = 0
      })
      return vals
    }

    const sumValues = (rows: Array<{ name: string; values: Record<string, number> }>) => {
      const out: Record<string, number> = {}
      STAGES.forEach((st) => (out[normalizeStageLabel(st)] = 0))
      rows.forEach((r) => {
        STAGES.forEach((st) => {
          const k = normalizeStageLabel(st)
          out[k] += Math.max(0, Number((r.values || {})[k] || 0))
        })
      })
      return out
    }
    const rowsAllSame = (rows: Array<{ name: string; values: Record<string, number> }>) => {
      if (!rows.length) return false
      const first = rows[0]?.values || {}
      for (const r of rows) {
        for (const st of STAGES) {
          const k = normalizeStageLabel(st)
          const v1 = Math.max(0, Number((r.values || {})[k] || 0))
          const v0 = Math.max(0, Number(first[k] || 0))
          if (v1 !== v0) {
            return false
          }
        }
      }
      return true
    }
    const cs = consultants.value.filter((c) => c.value !== '')
    const keys = ['consultantId', 'ownerId', 'employeeId', 'consultantName']
    const fetchByKey = async (key: string, c: any, name?: string) => {
      const pv: Record<string, any> =
        key === 'consultantName'
          ? { ...params, [key]: String(name || '') }
          : { ...params, [key]: c.value }
      try {
        const r = await request.get<{ items: { stage: string; value: number }[] }>({
          url: '/api/bi/sales-funnel',
          params: pv,
          showErrorMessage: false
        })
        return ensureVals(Array.isArray(r?.items) ? r!.items : [])
      } catch {
        try {
          const r2 = await request.get<{ items: { stage: string; value: number }[] }>({
            url: '/api/bi/sales-funnel/open',
            params: pv,
            showErrorMessage: false
          })
          return ensureVals(Array.isArray(r2?.items) ? r2!.items : [])
        } catch {
          const vals: Record<string, number> = {}
          STAGES.forEach((st) => (vals[normalizeStageLabel(st)] = 0))
          return vals
        }
      }
    }
    let rows: Array<{ name: string; values: Record<string, number> }> = []
    for (const key of keys) {
      const tasks = cs.map(async (c) => {
        const name = String(c.label || c.value || '').trim() || '未命名'
        const vals = await fetchByKey(key, c, name)
        return { name, values: vals }
      })
      const result = await Promise.all(tasks)
      rows = result
      const hasDiff = !rowsAllSame(rows)
      if (hasDiff) break
    }
    if (rowsAllSame(rows)) {
      const buildRange = (): [string, string] | null => {
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
      const range = buildRange()
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
      const sid = Number(storeId.value || 0)
      const filtered = all.filter((x) => {
        const s0 = Number((x as any)?.storeId || 0)
        if (sid > 0 && s0 !== sid) return false
        return true
      })
      const initVals = (): Record<string, number> => {
        const obj: Record<string, number> = {}
        STAGES.forEach((st) => (obj[normalizeStageLabel(st)] = 0))
        return obj
      }
      const byName: Record<
        string,
        { name: string; values: Record<string, number>; phoneSet: Set<string> }
      > = {}
      const totalPhones = new Set<string>()
      filtered.forEach((it: any) => {
        const name = String((it as any)?.salesConsultant || '').trim() || '未命名'
        if (!byName[name]) byName[name] = { name, values: initVals(), phoneSet: new Set<string>() }
        const vals = byName[name].values
        const phone = String((it as any)?.customerPhone || '')
        const visitCat = String((it as any)?.visitCategory || '')
        const td = !!(it as any)?.testDrive
        const deal = !!(it as any)?.dealDone
        vals[normalizeStageLabel('全部商机数量')]++
        if (visitCat === '首次') {
          vals[normalizeStageLabel('首次到店')]++
          if (td) vals[normalizeStageLabel('首次试驾')]++
          if (deal) vals[normalizeStageLabel('首次成交')]++
        } else if (visitCat === '再次') {
          vals[normalizeStageLabel('再次到店/接触（上门）')]++
          if (td) vals[normalizeStageLabel('再次试驾')]++
          if (deal) vals[normalizeStageLabel('再次成交')]++
        }
        if (deal) {
          byName[name].phoneSet.add(phone)
          if (phone) totalPhones.add(phone)
        }
      })
      Object.values(byName).forEach((row) => {
        row.values[normalizeStageLabel('综合成交')] = row.phoneSet.size
      })
      const rowsLocalRaw = Object.values(byName).map((r) => ({ name: r.name, values: r.values }))
      const csAll = consultants.value.filter((c) => c.value !== '')
      const rowsLocal: Array<{ name: string; values: Record<string, number> }> = []
      const nameSet = new Set<string>(rowsLocalRaw.map((r) => r.name))
      rowsLocal.push(...rowsLocalRaw)
      csAll.forEach((c) => {
        const nm = String(c.label || c.value || '').trim() || '未命名'
        if (!nameSet.has(nm)) {
          rowsLocal.push({ name: nm, values: initVals() })
        }
      })
      rows = rowsLocal
    }
    const total = sumValues(rows)
    consultantSummaryRows.value = [
      {
        name: (props.personRole || 'consultant') === 'inviter' ? '全部邀约专员' : '全部顾问',
        values: total
      },
      ...rows
    ]
    const active = rows.filter((r) => Object.values(r.values || {}).some((v) => Number(v) > 0))
    const cnt = active.length || 1
    const avg: Record<string, number> = {}
    STAGES.forEach((st) => {
      const k = normalizeStageLabel(st)
      avg[k] = Math.round(Math.max(0, Number(total[k] || 0)) / cnt)
    })
    consultantStageAvg.value = avg
    consultantSummaryLoading.value = false
  }
  const loadFunnelRight = async () => {
    const base: Record<string, any> = {}
    if (funnelType.value === 'store' && compareStoreId.value !== '')
      base.storeId = compareStoreId.value
    if (funnelType.value === 'person' && compareTeamId.value !== '')
      base.teamId = compareTeamId.value
    if (
      funnelType.value === 'person' &&
      !props.hideConsultantSelect &&
      compareConsultantId.value !== ''
    )
      base.consultantId = compareConsultantId.value

    if (consultantId.value !== '' && funnelType.value === 'person' && !props.hideConsultantSelect)
      base.consultantId = consultantId.value
    // 人维度未选门店时：仅当未选择具体小组/顾问，才限定账号可见门店集合
    if (
      funnelType.value === 'person' &&
      storeId.value === '' &&
      String(compareTeamId.value || '') === '' &&
      (String(compareConsultantId.value || '') === '' || !!props.hideConsultantSelect)
    ) {
      const ids = getVisibleStoreIds()
      if (ids.length) {
        ;(base as any).storeIds = ids
        ;(base as any).storeIdList = ids
      }
    }
    if (channelType.value) base.channelLevel1 = channelType.value
    if (channelLevel2.value) base.channelLevel2 = channelLevel2.value
    const metaR = channelMetaByLevel1.value[String(channelType.value || '')]
    if (metaR && metaR.businessSource) base.businessSource = metaR.businessSource

    base.period = periodType.value
    if (periodType.value === 'day' && dateDay.value) {
      if (Array.isArray(dateDay.value)) {
        base.start = dateDay.value[0]
        base.end = dateDay.value[1]
      } else {
        base.start = dateDay.value
        base.end = dateDay.value
      }
    }
    if (periodType.value === 'week' && dateWeek.value) base.week = dateWeek.value
    if (periodType.value === 'month') {
      const m = getMonthStr(dateMonth.value)
      if (m) base.month = m
    }
    if (periodType.value === 'year' && dateYear.value) base.year = dateYear.value

    let effectiveParamsRight = { ...base }
    let itemsB: { stage: string; value: number }[] = []
    if (
      funnelType.value === 'person' &&
      !props.hideConsultantSelect &&
      compareConsultantId.value !== ''
    ) {
      const sid = Number(storeId.value || 0)
      const cName = String(
        consultants.value.find(
          (x) => Number(x.value || 0) === Number(compareConsultantId.value || 0)
        )?.label || ''
      ).trim()
      const localItems = await buildFunnelFromCluesByConsultant(sid, cName)
      itemsB = localItems
      effectiveParamsRight = { ...base }
    } else if (
      funnelType.value === 'person' &&
      !props.hideCompareTeam &&
      compareTeamId.value !== ''
    ) {
      const sid = Number(compareStoreId.value || storeId.value || 0)
      const tid = Number(compareTeamId.value || 0)
      const localItems = await buildFunnelFromCluesByTeam(sid, tid)
      itemsB = localItems
      effectiveParamsRight = { ...base }
    } else {
      if (funnelType.value === 'store' && compareStoreId.value !== '') {
        const baseline = await requestFunnel(base)
        const sid = Number(compareStoreId.value || 0)
        const sLabel = String(stores.value.find((x) => Number(x.value || 0) === sid)?.label || '')
        const attempts: Record<string, any>[] = [
          { ...base, storeName: sLabel },
          { ...base, storeIds: [sid] },
          { ...base, storeIdList: [sid] }
        ]
        for (const attempt of attempts) {
          const resItems = await requestFunnel(attempt)
          if (compareItems(resItems, baseline)) {
            itemsB = resItems
            effectiveParamsRight = attempt
            break
          }
        }
        if (!itemsB.length) {
          itemsB = baseline
          effectiveParamsRight = { ...base }
        }
      } else {
        itemsB = await requestFunnel(base)
        effectiveParamsRight = { ...base }
      }
    }
    // 门店维度：统一以线索聚合为准
    // 人维度：当未选择具体小组与顾问时，也采用线索聚合
    if (funnelType.value === 'store' && compareStoreId.value !== '') {
      const sid = Number(compareStoreId.value || 0)
      const localItems = await buildFunnelFromClues(sid)
      funnelItemsRight.value = localItems.map((it) => ({
        stage: normalizeStageLabel(it.stage),
        value: Number(it.value) || 0
      }))
    } else if (
      funnelType.value === 'person' &&
      (String(compareTeamId.value || '') === '' || !!props.hideCompareTeam) &&
      (String(compareConsultantId.value || '') === '' || !!props.hideConsultantSelect)
    ) {
      const sid = Number(compareStoreId.value || 0) || Number(storeId.value || 0)
      const localItems = await buildFunnelFromClues(sid)
      funnelItemsRight.value = localItems.map((it) => ({
        stage: normalizeStageLabel(it.stage),
        value: Number(it.value) || 0
      }))
    } else {
      funnelItemsRight.value = itemsB.map((it) => ({
        stage: normalizeStageLabel(it.stage),
        value: Number(it.value) || 0
      }))
    }
    await loadPrevFunnelRight(effectiveParamsRight)
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
      const itemsPrev = await requestFunnel(params2)
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

  const buildFunnelFromClues = async (sid: number) => {
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
    const filteredRaw = all.filter((x) => {
      const s0 = Number((x as any)?.storeId || 0)
      if (sid > 0 && s0 !== sid) return false
      if (!(sid > 0) && visibleIds.length && !visibleIds.includes(s0)) return false
      // 渠道与业务来源过滤（若有设置）
      const lvl1Sel = String(channelType.value || '')
      const lvl2Sel = String(channelLevel2.value || '')
      const metaSel = channelMetaByLevel1.value[lvl1Sel]
      const sourceSel = String(metaSel?.businessSource || '')
      if (lvl1Sel) {
        const lvl1 = String((x as any)?.channelLevel1 || (x as any)?.firstChannel || '')
        if (lvl1 && lvl1Sel && lvl1 !== lvl1Sel) return false
      }
      if (lvl2Sel) {
        const lvl2 = String((x as any)?.channelLevel2 || (x as any)?.secondChannel || '')
        if (lvl2 && lvl2Sel && lvl2 !== lvl2Sel) return false
      }
      if (sourceSel) {
        const src = String((x as any)?.businessSource || (x as any)?.source || '')
        if (src && sourceSel && src !== sourceSel) return false
      }
      return true
    })
    const filtered = filteredRaw

    const keyOf = (it: any) =>
      String(
        (it as any)?.customerPhone || (it as any)?.customerSnapshot?.phone || (it as any)?.id || ''
      )
    const allSet = new Set<string>()
    const firstSet = new Set<string>()
    const firstTdSet = new Set<string>()
    const firstDealSet = new Set<string>()
    const againSet = new Set<string>()
    const againTdSet = new Set<string>()
    const againDealSet = new Set<string>()
    const dealPhoneSet = new Set<string>()
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
    map[normalizeStageLabel('全部商机数量')] = allSet.size
    map[normalizeStageLabel('首次到店')] = firstSet.size
    map[normalizeStageLabel('首次试驾')] = firstTdSet.size
    map[normalizeStageLabel('首次成交')] = firstDealSet.size
    map[normalizeStageLabel('再次到店/接触（上门）')] = againSet.size
    map[normalizeStageLabel('再次试驾')] = againTdSet.size
    map[normalizeStageLabel('再次成交')] = againDealSet.size
    map[normalizeStageLabel('综合成交')] = dealPhoneSet.size
    return STAGES.map((st) => ({
      stage: st,
      value: Math.max(0, Number(map[normalizeStageLabel(st)] || 0))
    }))
  }
  const buildFunnelFromCluesByConsultant = async (sid: number, consultantName: string) => {
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
    const filteredRaw = all.filter((x) => {
      const s0 = Number((x as any)?.storeId || 0)
      if (sid > 0 && s0 !== sid) return false
      if (!(sid > 0) && visibleIds.length && !visibleIds.includes(s0)) return false
      const lvl1Sel = String(channelType.value || '')
      const lvl2Sel = String(channelLevel2.value || '')
      const metaSel = channelMetaByLevel1.value[lvl1Sel]
      const sourceSel = String(metaSel?.businessSource || '')
      if (lvl1Sel) {
        const lvl1 = String((x as any)?.channelLevel1 || (x as any)?.firstChannel || '')
        if (lvl1 && lvl1Sel && lvl1 !== lvl1Sel) return false
      }
      if (lvl2Sel) {
        const lvl2 = String((x as any)?.channelLevel2 || (x as any)?.secondChannel || '')
        if (lvl2 && lvl2Sel && lvl2 !== lvl2Sel) return false
      }
      if (sourceSel) {
        const src = String((x as any)?.businessSource || (x as any)?.source || '')
        if (src && sourceSel && src !== sourceSel) return false
      }
      const name = String((x as any)?.salesConsultant || '').trim()
      if (consultantName && name && name !== consultantName) return false
      return true
    })
    const filtered = filteredRaw
    const keyOf = (it: any) =>
      String(
        (it as any)?.customerPhone || (it as any)?.customerSnapshot?.phone || (it as any)?.id || ''
      )
    const allSet = new Set<string>()
    const firstSet = new Set<string>()
    const firstTdSet = new Set<string>()
    const firstDealSet = new Set<string>()
    const againSet = new Set<string>()
    const againTdSet = new Set<string>()
    const againDealSet = new Set<string>()
    const dealPhoneSet = new Set<string>()
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
    const out: Record<string, number> = {}
    out[normalizeStageLabel('全部商机数量')] = allSet.size
    out[normalizeStageLabel('首次到店')] = firstSet.size
    out[normalizeStageLabel('首次试驾')] = firstTdSet.size
    out[normalizeStageLabel('首次成交')] = firstDealSet.size
    out[normalizeStageLabel('再次到店/接触（上门）')] = againSet.size
    out[normalizeStageLabel('再次试驾')] = againTdSet.size
    out[normalizeStageLabel('再次成交')] = againDealSet.size
    out[normalizeStageLabel('综合成交')] = dealPhoneSet.size
    return STAGES.map((st) => ({
      stage: st,
      value: Math.max(0, Number(out[normalizeStageLabel(st)] || 0))
    }))
  }
  const buildFunnelFromCluesByTeam = async (sid: number, deptId: number) => {
    const range = buildRangeForClue()
    const visibleIds = getVisibleStoreIds()
    // 获取该小组的员工姓名集合（销售相关岗位）
    let memberNames = new Set<string>()
    try {
      const res: any = await fetchGetEmployeeList({
        current: 1,
        size: 500,
        departmentId: deptId,
        storeId: sid > 0 ? sid : undefined
      })
      const records = res?.records || res?.list || []
      records.forEach((r: any) => {
        const role = String(r.role || '')
        if (role && (role === 'R_SALES' || role === 'R_SALES_MANAGER')) {
          const nm = String(r.name || r.userName || r.employeeName || '').trim()
          if (nm) memberNames.add(nm)
        }
      })
    } catch {
      memberNames = new Set<string>()
    }
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
    const filteredRaw = all.filter((x) => {
      const s0 = Number((x as any)?.storeId || 0)
      if (sid > 0 && s0 !== sid) return false
      if (!(sid > 0) && visibleIds.length && !visibleIds.includes(s0)) return false
      const lvl1Sel = String(channelType.value || '')
      const lvl2Sel = String(channelLevel2.value || '')
      const metaSel = channelMetaByLevel1.value[lvl1Sel]
      const sourceSel = String(metaSel?.businessSource || '')
      if (lvl1Sel) {
        const lvl1 = String((x as any)?.channelLevel1 || (x as any)?.firstChannel || '')
        if (lvl1 && lvl1Sel && lvl1 !== lvl1Sel) return false
      }
      if (lvl2Sel) {
        const lvl2 = String((x as any)?.channelLevel2 || (x as any)?.secondChannel || '')
        if (lvl2 && lvl2Sel && lvl2 !== lvl2Sel) return false
      }
      if (sourceSel) {
        const src = String((x as any)?.businessSource || (x as any)?.source || '')
        if (src && sourceSel && src !== sourceSel) return false
      }
      const name = String((x as any)?.salesConsultant || '').trim()
      if (memberNames.size && name && !memberNames.has(name)) return false
      return true
    })
    const filtered = filteredRaw
    const keyOf = (it: any) =>
      String(
        (it as any)?.customerPhone || (it as any)?.customerSnapshot?.phone || (it as any)?.id || ''
      )
    const allSet = new Set<string>()
    const firstSet = new Set<string>()
    const firstTdSet = new Set<string>()
    const firstDealSet = new Set<string>()
    const againSet = new Set<string>()
    const againTdSet = new Set<string>()
    const againDealSet = new Set<string>()
    const dealPhoneSet = new Set<string>()
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
    const out: Record<string, number> = {}
    out[normalizeStageLabel('全部商机数量')] = allSet.size
    out[normalizeStageLabel('首次到店')] = firstSet.size
    out[normalizeStageLabel('首次试驾')] = firstTdSet.size
    out[normalizeStageLabel('首次成交')] = firstDealSet.size
    out[normalizeStageLabel('再次到店/接触（上门）')] = againSet.size
    out[normalizeStageLabel('再次试驾')] = againTdSet.size
    out[normalizeStageLabel('再次成交')] = againDealSet.size
    out[normalizeStageLabel('综合成交')] = dealPhoneSet.size
    return STAGES.map((st) => ({
      stage: st,
      value: Math.max(0, Number(out[normalizeStageLabel(st)] || 0))
    }))
  }

  watch(funnelType, () => {
    compareStoreId.value = ''
    compareTeamId.value = ''
    compareConsultantId.value = ''
    teamId.value = ''
  })

  watch(enableCompare, (val) => {
    if (!val) {
      overlayMode.value = false
      compareStoreId.value = ''
      compareTeamId.value = ''
      compareConsultantId.value = ''
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

  .charts-row.single .funnel-card {
    flex: 1 1 100%;
    width: 100%;
  }

  .full-card {
    flex: 1 1 100%;
    width: 100%;
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

  .info-icon {
    margin-left: 6px;
    color: var(--art-gray-text-600);
    cursor: help;
  }

  .below-avg {
    font-weight: 600;
    color: #ff4d4f;
  }

  .text-gray {
    color: #999;
  }

  .stage-header {
    display: inline-flex;
    gap: 6px;
    align-items: center;
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
