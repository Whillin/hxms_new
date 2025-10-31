<template>
  <div class="opportunity-list-page art-full-height">
    <!-- 搜索栏 -->
    <ArtSearchBar
      ref="searchRef"
      v-model="searchForm"
      :items="searchItems"
      :is-expand="false"
      :show-expand="true"
      :label-width="110"
      @search="handleSearch"
      @reset="handleReset"
    />

    <ElCard class="art-table-card" shadow="never">
      <ArtTableHeader v-model:columns="columnChecks" :loading="loading" @refresh="refreshData">
        <template #left>
          <ElSpace wrap>
            <span class="list-filter">
              <ElLink
                :underline="false"
                :type="listMode === 'mine' ? 'primary' : 'default'"
                @click="switchListMode('mine')"
                >我的商机</ElLink
              >
              <ElLink
                :underline="false"
                :type="listMode === 'sub' ? 'primary' : 'default'"
                @click="switchListMode('sub')"
                >下属商机</ElLink
              >
              <ElLink
                :underline="false"
                :type="listMode === 'today' ? 'primary' : 'default'"
                @click="switchListMode('today')"
                >今日跟进商机</ElLink
              >
              <ElLink
                :underline="false"
                :type="listMode === 'all' ? 'primary' : 'default'"
                @click="switchListMode('all')"
                >全部</ElLink
              >
            </span>
            <ElButton type="primary" @click="openAddDialog">新增商机</ElButton>
            <ElButton @click="refreshData">刷新</ElButton>
          </ElSpace>
        </template>
      </ArtTableHeader>

      <ArtTable
        :loading="loading"
        :data="data"
        :columns="columns"
        :pagination="pagination"
        @pagination:size-change="handleSizeChange"
        @pagination:current-change="handleCurrentChange"
      >
        <template #operation="{ row }">
          <div style="text-align: right">
            <ArtButtonTable type="view" @click="openFollowDrawer(row)" />
            <ArtButtonTable type="edit" @click="editRow(row)" />
            <ElPopconfirm title="确认删除该商机？" @confirm="deleteRow(row)">
              <template #reference>
                <ArtButtonTable type="delete" />
              </template>
            </ElPopconfirm>
          </div>
        </template>
      </ArtTable>
    </ElCard>

    <!-- 新增/编辑弹窗 -->
    <ElDialog
      v-model="dialogVisible"
      :title="editingId ? '编辑商机' : '新增商机'"
      width="800px"
      destroy-on-close
    >
      <ElForm ref="formRef" :model="formModel" :rules="formRules" label-width="110px">
        <ElRow :gutter="12">
          <ElCol :span="12">
            <ElFormItem label="留档日期" prop="visitDate">
              <ElDatePicker
                v-model="formModel.visitDate"
                type="date"
                value-format="YYYY-MM-DD"
                placeholder="请选择留档日期"
              />
            </ElFormItem>
          </ElCol>
          <ElCol :span="12">
            <ElFormItem label="销售顾问" prop="salesConsultant">
              <ElInput v-model="formModel.salesConsultant" placeholder="请输入销售顾问" />
            </ElFormItem>
          </ElCol>
          <ElCol :span="12">
            <ElFormItem label="客户名称" prop="customerName">
              <ElInput v-model="formModel.customerName" placeholder="请输入客户名称" />
            </ElFormItem>
          </ElCol>
          <ElCol :span="12">
            <ElFormItem label="电话" prop="customerPhone">
              <ElInput v-model="formModel.customerPhone" placeholder="请输入客户电话" />
            </ElFormItem>
          </ElCol>
          <ElCol :span="12">
            <ElFormItem label="商机编码" prop="opportunityCode">
              <ElInput
                v-model="formModel.opportunityCode"
                placeholder="保存时自动生成编码"
                disabled
              />
            </ElFormItem>
          </ElCol>
          <ElCol :span="12">
            <ElFormItem label="一级渠道" prop="channelLevel1">
              <ElSelect v-model="formModel.channelLevel1" placeholder="请选择">
                <ElOption v-for="opt in channelLevel1Options" :key="opt.value" v-bind="opt" />
              </ElSelect>
            </ElFormItem>
          </ElCol>
          <ElCol :span="12">
            <ElFormItem label="关注车型" prop="focusModelName">
              <ElSelect v-model="formModel.focusModelName" placeholder="请选择">
                <ElOption v-for="opt in nameOptions" :key="opt.value" v-bind="opt" />
              </ElSelect>
            </ElFormItem>
          </ElCol>
          <ElCol :span="12">
            <ElFormItem label="商机级别" prop="opportunityLevel">
              <ElSelect v-model="formModel.opportunityLevel" placeholder="请选择">
                <ElOption v-for="opt in opportunityLevelOptions" :key="opt.value" v-bind="opt" />
              </ElSelect>
            </ElFormItem>
          </ElCol>
          <ElCol :span="12">
            <ElFormItem label="试驾" prop="testDrive">
              <ElSelect v-model="formModel.testDrive" placeholder="请选择">
                <ElOption label="否" :value="false" />
                <ElOption label="是" :value="true" />
              </ElSelect>
            </ElFormItem>
          </ElCol>
          <ElCol :span="12">
            <ElFormItem label="议价" prop="bargaining">
              <ElSelect v-model="formModel.bargaining" placeholder="请选择">
                <ElOption label="否" :value="false" />
                <ElOption label="是" :value="true" />
              </ElSelect>
            </ElFormItem>
          </ElCol>
          <ElCol :span="12">
            <ElFormItem label="购车经历" prop="buyExperience">
              <ElSelect v-model="formModel.buyExperience" placeholder="请选择">
                <ElOption v-for="opt in buyExperienceOptions" :key="opt.value" v-bind="opt" />
              </ElSelect>
            </ElFormItem>
          </ElCol>
          <ElCol :span="12">
            <ElFormItem label="现用车型" prop="currentModel">
              <ElInput v-model="formModel.currentModel" placeholder="请输入现用车型" />
            </ElFormItem>
          </ElCol>
          <ElCol :span="12">
            <ElFormItem label="车龄(年)" prop="carAge">
              <ElInputNumber v-model="formModel.carAge" :min="0" />
            </ElFormItem>
          </ElCol>
          <ElCol :span="12">
            <ElFormItem label="居住区域" prop="livingArea">
              <ElCascader
                v-model="formModel.livingArea"
                :options="cityCascaderOptionsRef"
                :props="{ value: 'label', label: 'label', children: 'children' }"
                placeholder="请选择省/市/区"
              />
            </ElFormItem>
          </ElCol>
          <ElCol :span="24">
            <ElFormItem label="客户描述" prop="customerDesc">
              <ElInput
                v-model="formModel.customerDesc"
                type="textarea"
            -   rows="3"
            +   :rows="3"
                placeholder="请输入客户描述"
              />
            </ElFormItem>
          </ElCol>
          <ElCol :span="12">
            <ElFormItem label="最新状态" prop="latestStatus">
              <ElSelect v-model="formModel.latestStatus" placeholder="请选择最新状态">
                <ElOption label="跟进中" value="跟进中" />
                <ElOption label="已战败" value="已战败" />
                <ElOption label="已成交" value="已成交" />
              </ElSelect>
            </ElFormItem>
          </ElCol>
          <ElCol :span="12">
            <ElFormItem
              label="战败/未成交分析"
              prop="defeatReasons"
              :required="formModel.latestStatus !== '已成交'"
            >
              <ElSelect
                v-model="formModel.defeatReasons"
                multiple
                collapse-tags
                :disabled="formModel.latestStatus === '已成交'"
                placeholder="请选择原因"
              >
                <ElOption v-for="opt in defeatReasonOptions" :key="opt.value" v-bind="opt" />
              </ElSelect>
            </ElFormItem>
          </ElCol>
          <ElCol :span="24">
            <ElFormItem label="备注" prop="remark">
              <ElInput
                v-model="formModel.remark"
                type="textarea"
            -   rows="2"
            +   :rows="2"
                placeholder="请输入备注"
              />
            </ElFormItem>
          </ElCol>
        </ElRow>
      </ElForm>
      <template #footer>
        <ElButton @click="dialogVisible = false">取消</ElButton>
        <ElButton type="primary" @click="submitForm">保存</ElButton>
      </template>
    </ElDialog>

    <!-- 跟进记录与操作抽屉 -->
    <ElDrawer v-model="followDrawerVisible" title="跟进记录与操作" size="60%" destroy-on-close>
      <div class="follow-panel">
        <div class="follow-form">
          <h4>跟进操作</h4>
          <ElForm ref="followFormRef" :model="followForm" :rules="followRules" label-width="110px">
            <ElFormItem label="跟进内容" prop="content">
              <ElInput
                v-model="followForm.content"
                type="textarea"
            -   rows="3"
            +   :rows="3"
                placeholder="请输入跟进内容"
              />
            </ElFormItem>
            <ElFormItem label="下次联系时间" prop="nextContactTime">
              <ElDatePicker
                v-model="followForm.nextContactTime"
                type="datetime"
                value-format="YYYY-MM-DD HH:mm:ss"
                placeholder="选择下次联系时间"
              />
            </ElFormItem>
            <ElFormItem label="跟进状态" prop="status">
              <ElSelect v-model="followForm.status" placeholder="请选择">
                <ElOption v-for="opt in followStatusOptions" :key="opt.value" v-bind="opt" />
              </ElSelect>
            </ElFormItem>
            <ElFormItem label="跟进方式" prop="method">
              <ElSelect v-model="followForm.method" placeholder="请选择">
                <ElOption v-for="opt in followMethodOptions" :key="opt.value" v-bind="opt" />
              </ElSelect>
            </ElFormItem>
          </ElForm>
          <ElButton type="primary" @click="saveFollow">立即保存</ElButton>
        </div>
        <div class="follow-table">
          <ArtTable
            :loading="followLoading"
            :data="followTableData"
            :columns="followColumns"
            :pagination="followPagination"
            @pagination:size-change="handleFollowSizeChange"
            @pagination:current-change="handleFollowCurrentChange"
          >
            <template #operation="{ row }">
              <div style="text-align: right">
                <ElPopconfirm title="确认删除该跟进记录？" @confirm="deleteFollowRow(row)">
                  <template #reference>
                    <ArtButtonTable type="delete" />
                  </template>
                </ElPopconfirm>
              </div>
            </template>
          </ArtTable>
        </div>
      </div>
    </ElDrawer>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed, onMounted } from 'vue'
  import { ElMessage } from 'element-plus'
  import ArtButtonTable from '@/components/core/forms/art-button-table/index.vue'
  import { regionData } from 'element-china-area-data'
  import { useTable } from '@/composables/useTable'
  import type { ColumnOption } from '@/types/component'
  import { useProductStore } from '@/store/modules/product'
  import { storeToRefs } from 'pinia'
  import { useOpportunityFollowStore } from '@/store/modules/opportunityFollow'
  import { fetchChannelOptions } from '@/api/channel'

  defineOptions({ name: 'OpportunityList' })

  interface OpportunityItem {
    id: string
    visitDate: string
    salesConsultant: string
    customerName: string
    customerPhone: string
    opportunityCode: string
    channelLevel1: string
    focusModelName: string
    opportunityLevel: 'H' | 'A' | 'B' | 'C'
    testDrive: boolean
    bargaining: boolean
    buyExperience: '首购' | '换购' | '增购'
    currentModel: string
    carAge: number
    livingArea: string[]
    customerDesc: string
    latestStatus: '跟进中' | '已战败' | '已成交'
    defeatReasons: string[]
    remark: string
  }

  interface FollowUpRecord {
    id: string
    opportunityId: string
    opportunityName?: string
    content: string
    nextContactTime: string
    status: string
    method: string
    createdAt: string
  }

  const searchRef = ref()
  const cityCascaderOptionsRef = ref<any[]>(regionData as any)

  const productStore = useProductStore()
  const { nameOptions } = storeToRefs(productStore)

  // 当前用户与下属（演示用）
  const currentUser = '张一'
  const subordinates = ['李二']
  const listMode = ref<'all' | 'mine' | 'sub' | 'today'>('all')
  const switchListMode = (mode: 'all' | 'mine' | 'sub' | 'today') => {
    listMode.value = mode
    refreshData()
  }

  // 选项：一级渠道/商机级别/购车经历/战败分析
  const channelLevel1Options = ref<{ label: string; value: string }[]>([])
  
  onMounted(async () => {
    try {
      const resp = await fetchChannelOptions()
      channelLevel1Options.value = (resp.level1 || []).map((v: string) => ({ label: v, value: v }))
    } catch (e: any) {
      console.error('[fetchChannelOptions] failed:', e)
    }
  })
  const opportunityLevelOptions = [
    { label: 'H', value: 'H' },
    { label: 'A', value: 'A' },
    { label: 'B', value: 'B' },
    { label: 'C', value: 'C' }
  ]
  const buyExperienceOptions = [
    { label: '首购', value: '首购' },
    { label: '换购', value: '换购' },
    { label: '增购', value: '增购' }
  ]
  const defeatReasonOptions = [
    { label: '预算不足', value: '预算不足' },
    { label: '购买竞品', value: '购买竞品' },
    { label: '同城同品', value: '同城同品' },
    { label: '价格优惠', value: '价格优惠' },
    { label: '装备配置', value: '装备配置' },
    { label: '内外设计', value: '内外设计' },
    { label: '服务体验', value: '服务体验' },
    { label: '金融方案', value: '金融方案' },
    { label: '购车计划', value: '购车计划' },
    { label: '交付时间', value: '交付时间' }
  ]

  // 搜索表单
  const searchForm = ref({
    visitDate: undefined as any,
    salesConsultant: undefined as any,
    customerName: undefined as any,
    customerPhone: undefined as any,
    opportunityCode: undefined as any,
    channelLevel1: undefined as any,
    focusModelName: undefined as any,
    opportunityLevel: undefined as any,
    testDrive: undefined as any,
    bargaining: undefined as any,
    buyExperience: undefined as any,
    currentModel: undefined as any,
    carAge: undefined as any,
    livingArea: undefined as any,
    latestStatus: undefined as any,
    defeatReasons: undefined as any,
    remark: undefined as any
  })

  const searchItems = computed(() => [
    {
      label: '留档日期',
      key: 'visitDate',
      type: 'date',
      props: { type: 'date', valueFormat: 'YYYY-MM-DD', placeholder: '请选择留档日期' }
    },
    { label: '销售顾问', key: 'salesConsultant', type: 'input' },
    { label: '客户名称', key: 'customerName', type: 'input' },
    { label: '电话', key: 'customerPhone', type: 'input' },
    { label: '商机编码', key: 'opportunityCode', type: 'input' },
    {
      label: '一级渠道',
      key: 'channelLevel1',
      type: 'select',
      props: { options: channelLevel1Options }
    },
    {
      label: '关注车型',
      key: 'focusModelName',
      type: 'select',
      props: { options: nameOptions.value }
    },
    {
      label: '商机级别',
      key: 'opportunityLevel',
      type: 'select',
      props: { options: opportunityLevelOptions }
    },
    {
      label: '试驾',
      key: 'testDrive',
      type: 'select',
      props: {
        options: [
          { label: '否', value: false },
          { label: '是', value: true }
        ]
      }
    },
    {
      label: '议价',
      key: 'bargaining',
      type: 'select',
      props: {
        options: [
          { label: '否', value: false },
          { label: '是', value: true }
        ]
      }
    },
    {
      label: '购车经历',
      key: 'buyExperience',
      type: 'select',
      props: { options: buyExperienceOptions }
    },
    { label: '现用车型', key: 'currentModel', type: 'input' },
    { label: '车龄(年)', key: 'carAge', type: 'input', props: { type: 'number', min: 0 } },
    {
      label: '居住区域',
      key: 'livingArea',
      type: 'cascader',
      props: {
        options: cityCascaderOptionsRef.value,
        placeholder: '请选择省/市/区',
        clearable: true,
        props: { value: 'label', label: 'label', children: 'children' }
      }
    },
    {
      label: '最新状态',
      key: 'latestStatus',
      type: 'select',
      props: {
        options: [
          { label: '跟进中', value: '跟进中' },
          { label: '已战败', value: '已战败' },
          { label: '已成交', value: '已成交' }
        ]
      }
    },
    {
      label: '战败/未成交分析',
      key: 'defeatReasons',
      type: 'select',
      props: { multiple: true, collapseTags: true, options: defeatReasonOptions }
    },
    { label: '备注', key: 'remark', type: 'input' }
  ])

  // 本地数据源
  const generateMockData = (): OpportunityItem[] => {
    const models = (nameOptions.value || []).map((o) => o.label)
    return Array.from({ length: 40 }, (_, i) => ({
      id: String(i + 1),
      visitDate: `2024-09-${String((i % 28) + 1).padStart(2, '0')}`,
      salesConsultant: ['张一', '李二', '王三'][i % 3],
      customerName: ['赵四', '钱五', '孙六', '周七'][i % 4],
      customerPhone: `138${String(10000000 + i).slice(0, 8)}`,
      opportunityCode: `OP-${String(i + 1).padStart(4, '0')}`,
      channelLevel1: channelLevel1Options[i % channelLevel1Options.length].value,
      focusModelName: models[i % (models.length || 1)] || 'A4L',
      opportunityLevel: (['H', 'A', 'B', 'C'] as const)[i % 4],
      testDrive: i % 2 === 0,
      bargaining: i % 3 === 0,
      buyExperience: (['首购', '换购', '增购'] as const)[i % 3],
      currentModel: ['A4L', 'Q5', '3系', 'C级'][i % 4],
      carAge: i % 7,
      livingArea: ['北京市/朝阳区', '上海市/浦东新区', '广东省/广州市/天河区'][i % 3].split('/'),
      customerDesc: '客户关注车型配置，后续跟进试驾安排。',
      latestStatus: (['跟进中', '已战败', '已成交'] as const)[i % 3],
      defeatReasons: i % 3 === 2 ? [] : ['预算不足'],
      remark: '备注示例'
    }))
  }
  const mockData = ref<OpportunityItem[]>(generateMockData())

  // 跟进记录本地数据源
  const formatDateTime = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  }
  const formatDate = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  }
  const isSameDay = (a: string, b: string) => {
    if (!a || !b) return false
    const da = a.split(' ')[0]
    const db = b.split(' ')[0]
    return da === db
  }
  const todayStr = () => formatDate(new Date())

  const generateMockFollows = (): FollowUpRecord[] => {
    const arr: FollowUpRecord[] = []
    const ids = mockData.value.slice(0, 12).map((o) => o.id)
    ids.forEach((id, i) => {
      const created = new Date()
      created.setDate(created.getDate() - (i % 5))
      const next = new Date(created)
      next.setDate(next.getDate() + (i % 3))
      const code = mockData.value.find((o) => o.id === id)?.opportunityCode || ''
      arr.push({
        id: `F${Date.now()}${i}`,
        opportunityId: id,
        opportunityName: code,
        content: '电话沟通客户需求，记录重点关注配置',
        nextContactTime: formatDateTime(next),
        status: ['新客', '跟进中', '已战败'][i % 3],
        method: ['电话', '微信', '到店'][i % 3],
        createdAt: formatDateTime(created)
      })
    })
    return arr
  }
  const followRecords = ref<FollowUpRecord[]>(generateMockFollows())
  // 全局跟进记录 store（用于二级菜单“跟进记录”页展示）
  const followStore = useOpportunityFollowStore()
  // 首次挂载：如全局为空，则用当前本地示例数据进行一次性初始化
  onMounted(() => {
    if (!followStore.records.length && followRecords.value.length) {
      followStore.addBatch(followRecords.value)
    }
  })
  const todayOpportunityIds = computed(() => {
    const today = todayStr()
    const ids = new Set<string>()
    followRecords.value.forEach((r) => {
      // 仅按“下次联系时间”的日期是否为今天来判断
      if (isSameDay(r.nextContactTime, `${today} 00:00:00`)) {
        ids.add(r.opportunityId)
      }
    })
    return ids
  })

  // 本地分页与筛选
  const mockApi = async (params: any): Promise<Api.Common.PaginatedResponse<OpportunityItem>> => {
    let filtered = mockData.value
    // 顶部筛选：我的/下属/今日跟进
    if (params.listMode === 'mine') {
      filtered = filtered.filter((r) => r.salesConsultant === currentUser)
    } else if (params.listMode === 'sub') {
      filtered = filtered.filter((r) => subordinates.includes(r.salesConsultant))
    } else if (params.listMode === 'today') {
      filtered = filtered.filter((r) => todayOpportunityIds.value.has(r.id))
    }
    if (params.visitDate) filtered = filtered.filter((r) => r.visitDate === params.visitDate)
    if (params.salesConsultant)
      filtered = filtered.filter((r) => (r.salesConsultant || '').includes(params.salesConsultant))
    if (params.customerName)
      filtered = filtered.filter((r) => (r.customerName || '').includes(params.customerName))
    if (params.customerPhone)
      filtered = filtered.filter((r) => (r.customerPhone || '').includes(params.customerPhone))
    if (params.opportunityCode)
      filtered = filtered.filter((r) => (r.opportunityCode || '').includes(params.opportunityCode))
    if (params.channelLevel1)
      filtered = filtered.filter((r) => r.channelLevel1 === params.channelLevel1)
    if (params.focusModelName)
      filtered = filtered.filter((r) => r.focusModelName === params.focusModelName)
    if (params.opportunityLevel)
      filtered = filtered.filter((r) => r.opportunityLevel === params.opportunityLevel)
    if (params.testDrive !== undefined && params.testDrive !== null && params.testDrive !== '')
      filtered = filtered.filter(
        (r) => r.testDrive === (params.testDrive === true || params.testDrive === 'true')
      )
    if (params.bargaining !== undefined && params.bargaining !== null && params.bargaining !== '')
      filtered = filtered.filter(
        (r) => r.bargaining === (params.bargaining === true || params.bargaining === 'true')
      )
    if (params.buyExperience)
      filtered = filtered.filter((r) => r.buyExperience === params.buyExperience)
    if (params.currentModel)
      filtered = filtered.filter((r) => (r.currentModel || '').includes(params.currentModel))
    if (params.carAge !== undefined && params.carAge !== null && params.carAge !== '')
      filtered = filtered.filter((r) => r.carAge === Number(params.carAge))
    if (Array.isArray(params.livingArea) && params.livingArea.length) {
      const target = params.livingArea.join('/')
      filtered = filtered.filter((r) =>
        (Array.isArray(r.livingArea) ? r.livingArea.join('/') : '').startsWith(target)
      )
    }
    if (params.latestStatus)
      filtered = filtered.filter((r) => r.latestStatus === params.latestStatus)
    if (Array.isArray(params.defeatReasons) && params.defeatReasons.length)
      filtered = filtered.filter((r) =>
        params.defeatReasons.every((v: string) => r.defeatReasons.includes(v))
      )
    if (params.remark) filtered = filtered.filter((r) => (r.remark || '').includes(params.remark))

    const total = filtered.length
    const start = (params.current - 1) * params.size
    const end = start + params.size
    return {
      records: filtered.slice(start, end),
      total,
      current: params.current,
      size: params.size
    }
  }

  const {
    data,
    columns,
    columnChecks,
    loading,
    pagination,
    handleSizeChange,
    handleCurrentChange,
    refreshData,
    getData
  } = useTable({
    core: {
      apiFn: async ({
        current,
        size
      }: Api.Common.CommonSearchParams): Promise<Api.Common.PaginatedResponse<OpportunityItem>> => {
        const params = { current, size, ...searchForm.value, listMode: listMode.value }
        const res = await mockApi(params)
        return { records: res.records, total: res.total, current, size }
      },
      apiParams: { current: 1, size: 10 },
      columnsFactory: (): ColumnOption<OpportunityItem>[] => [
        { type: 'globalIndex', label: '序号', width: 80 },
        { prop: 'visitDate', label: '留档日期', width: 120 },
        { prop: 'salesConsultant', label: '销售顾问', minWidth: 120 },
        { prop: 'customerName', label: '客户名称', minWidth: 120 },
        { prop: 'customerPhone', label: '电话', minWidth: 130 },
        { prop: 'opportunityCode', label: '商机编码', minWidth: 140 },
        { prop: 'channelLevel1', label: '一级渠道', minWidth: 120 },
        { prop: 'focusModelName', label: '关注车型', minWidth: 140 },
        { prop: 'opportunityLevel', label: '商机级别', width: 100 },
        {
          prop: 'testDrive',
          label: '试驾',
          width: 90,
          formatter: (row: OpportunityItem) => (row.testDrive ? '是' : '否')
        },
        {
          prop: 'bargaining',
          label: '议价',
          width: 90,
          formatter: (row: OpportunityItem) => (row.bargaining ? '是' : '否')
        },
        { prop: 'buyExperience', label: '购车经历', width: 100 },
        { prop: 'currentModel', label: '现用车型', minWidth: 120 },
        { prop: 'carAge', label: '车龄(年)', width: 100 },
        {
          prop: 'livingArea',
          label: '居住区域',
          minWidth: 180,
          formatter: (row: OpportunityItem) => (Array.isArray(row.livingArea) ? row.livingArea.join('/') : row.livingArea)
        },
        { prop: 'customerDesc', label: '客户描述', minWidth: 180 },
        { prop: 'latestStatus', label: '最新状态', width: 110 },
        {
          prop: 'defeatReasons',
          label: '战败/未成交分析',
          minWidth: 200,
          formatter: (row: OpportunityItem) => (Array.isArray(row.defeatReasons) ? row.defeatReasons.join('、') : row.defeatReasons)
        },
        { prop: 'remark', label: '备注', minWidth: 160 },
        {
          prop: 'operation',
          label: '操作',
          width: 200,
          align: 'center',
          fixed: 'right',
          useSlot: true
        }
      ]
    }
  })

  const handleSearch = () => {
    getData()
  }
  const handleReset = () => {
    searchForm.value = {
      visitDate: undefined,
      salesConsultant: undefined,
      customerName: undefined,
      customerPhone: undefined,
      opportunityCode: undefined,
      channelLevel1: undefined,
      focusModelName: undefined,
      opportunityLevel: undefined,
      testDrive: undefined,
      bargaining: undefined,
      buyExperience: undefined,
      currentModel: undefined,
      carAge: undefined,
      livingArea: undefined,
      latestStatus: undefined,
      defeatReasons: undefined,
      remark: undefined
    }
    getData()
  }

  // 表单：新增/编辑
  const dialogVisible = ref(false)
  const formRef = ref()
  const editingId = ref<string | null>(null)
  const initForm = (): OpportunityItem => ({
    id: '',
    visitDate: '',
    salesConsultant: '',
    customerName: '',
    customerPhone: '',
    opportunityCode: '',
    channelLevel1: '',
    focusModelName: '',
    opportunityLevel: 'A',
    testDrive: false,
    bargaining: false,
    buyExperience: '首购',
    currentModel: '',
    carAge: 0,
    livingArea: [],
    customerDesc: '',
    latestStatus: '跟进中',
    defeatReasons: [],
    remark: ''
  })
  const formModel = ref<OpportunityItem>(initForm())
  const formRules = computed(() => ({
    visitDate: [{ required: true, message: '请选择留档日期', trigger: 'change' }],
    salesConsultant: [{ required: true, message: '请输入销售顾问', trigger: 'blur' }],
    customerName: [{ required: true, message: '请输入客户名称', trigger: 'blur' }],
    customerPhone: [
      { required: true, message: '请输入客户电话', trigger: 'blur' },
      { pattern: /^\d{11}$/, message: '请输入11位手机号', trigger: 'blur' }
    ],
    channelLevel1: [{ required: true, message: '请选择一级渠道', trigger: 'change' }],
    opportunityLevel: [{ required: true, message: '请选择商机级别', trigger: 'change' }],
    latestStatus: [{ required: true, message: '请选择最新状态', trigger: 'change' }],
    defeatReasons: [
      {
        validator: (_: any, value: any, cb: any) => {
          if (
            formModel.value.latestStatus !== '已成交' &&
            (!value || (Array.isArray(value) && value.length === 0))
          ) {
            cb(new Error('请填写战败/未成交分析'))
          } else cb()
        },
        trigger: 'change'
      }
    ]
  }))

  const openAddDialog = () => {
    editingId.value = null
    formModel.value = initForm()
    dialogVisible.value = true
  }
  const editRow = (row: OpportunityItem) => {
    editingId.value = row.id
    formModel.value = { ...row }
    dialogVisible.value = true
  }
  const deleteRow = (row: OpportunityItem) => {
    const idx = mockData.value.findIndex((r) => r.id === row.id)
    if (idx >= 0) {
      mockData.value.splice(idx, 1)
      ElMessage.success('删除成功')
      refreshData()
    } else {
      ElMessage.error('删除失败，未找到该记录')
    }
  }
  const generateOpportunityCode = (): string => {
    const nums = mockData.value
      .map((r) => String(r.opportunityCode || ''))
      .map((code) => {
        const m = code.match(/^OP-(\d+)$/)
        return m ? Number(m[1]) : NaN
      })
      .filter((n) => !Number.isNaN(n))
    const next = nums.length ? Math.max(...nums) + 1 : 1
    return `OP-${String(next).padStart(4, '0')}`
  }
  const submitForm = async () => {
    await formRef.value?.validate?.()
    const payload: OpportunityItem = {
      ...formModel.value,
      id: editingId.value ? editingId.value : String(Date.now()),
      carAge: Number(formModel.value.carAge || 0),
      livingArea: Array.isArray(formModel.value.livingArea)
        ? formModel.value.livingArea
        : String(formModel.value.livingArea || '')
            .split('/')
            .filter(Boolean),
      defeatReasons:
        formModel.value.latestStatus === '已成交'
          ? []
          : Array.isArray(formModel.value.defeatReasons)
            ? formModel.value.defeatReasons
            : []
    }
    if (!editingId.value) {
      payload.opportunityCode = generateOpportunityCode()
    }
    if (editingId.value) {
      const idx = mockData.value.findIndex((r) => r.id === editingId.value)
      if (idx >= 0) {
        mockData.value.splice(idx, 1, payload)
        ElMessage.success('更新成功')
      } else {
        ElMessage.error('更新失败，未找到记录')
      }
    } else {
      mockData.value = [payload, ...mockData.value]
      ElMessage.success('新增成功')
    }
    dialogVisible.value = false
    refreshData()
  }

  // 跟进抽屉与记录
  const followDrawerVisible = ref(false)
  const currentFollowOpportunityId = ref<string>('')
  const currentFollowOpportunityName = ref<string>('')
  const followFormRef = ref()
  const followForm = ref<{
    content: string
    nextContactTime: string
    status: string
    method: string
  }>({
    content: '',
    nextContactTime: '',
    status: '跟进中',
    method: '电话'
  })
  const followStatusOptions = [
    { label: '新客', value: '新客' },
    { label: '跟进中', value: '跟进中' },
    { label: '已战败', value: '已战败' },
    { label: '已成交', value: '已成交' }
  ]
  const followMethodOptions = [
    { label: '电话', value: '电话' },
    { label: '微信', value: '微信' },
    { label: '到店', value: '到店' },
    { label: '短信', value: '短信' },
    { label: '其它', value: '其它' }
  ]
  const followRules = computed(() => ({
    content: [{ required: true, message: '请填写跟进内容', trigger: 'blur' }],
    nextContactTime: [{ required: true, message: '请选择下次联系时间', trigger: 'change' }],
    status: [{ required: true, message: '请选择跟进状态', trigger: 'change' }],
    method: [{ required: true, message: '请选择跟进方式', trigger: 'change' }]
  }))

  const openFollowDrawer = (row: OpportunityItem) => {
    currentFollowOpportunityId.value = row.id
    // 使用商机编码作为跟进列表的“商机名称”展示
    currentFollowOpportunityName.value = row.opportunityCode
    followDrawerVisible.value = true
    refreshFollowData()
  }

  const saveFollow = async () => {
    await followFormRef.value?.validate?.()
    const now = new Date()
    const newRecord: FollowUpRecord = {
      id: `F${Date.now()}`,
      opportunityId: currentFollowOpportunityId.value,
      content: followForm.value.content,
      nextContactTime: followForm.value.nextContactTime,
      status: followForm.value.status,
      method: followForm.value.method,
      createdAt: formatDateTime(now)
    }
    followRecords.value = [newRecord, ...followRecords.value]
    // 同步写入全局 store，供二级菜单“跟进记录”页面展示
    followStore.addRecord({ ...newRecord, opportunityName: currentFollowOpportunityName.value })
    ElMessage.success('跟进保存成功')
    followForm.value = { content: '', nextContactTime: '', status: '跟进中', method: '电话' }
    refreshFollowData()
    // 同步刷新主列表，使“今日跟进商机”立即生效
    refreshData()
    // 若为今天，顶部“今日跟进商机”将自动包含
  }

  const deleteFollowRow = (row: FollowUpRecord) => {
    const idx = followRecords.value.findIndex((r) => r.id === row.id)
    if (idx >= 0) {
      followRecords.value.splice(idx, 1)
      // 同步删除全局 store 中的记录
      followStore.deleteRecord(row.id)
      ElMessage.success('删除成功')
      refreshFollowData()
    } else {
      ElMessage.error('删除失败，未找到该记录')
    }
  }

  // 跟进记录表
  const {
    data: followTableData,
    columns: followColumns,
    loading: followLoading,
    pagination: followPagination,
    handleSizeChange: handleFollowSizeChange,
    handleCurrentChange: handleFollowCurrentChange,
    refreshData: refreshFollowData
  } = useTable({
    core: {
      apiFn: async ({
        current,
        size
      }: Api.Common.CommonSearchParams): Promise<Api.Common.PaginatedResponse<FollowUpRecord>> => {
        const all = followRecords.value.filter(
          (r) => r.opportunityId === currentFollowOpportunityId.value
        )
        const total = all.length
        const start = (current - 1) * size
        const end = start + size
        return { records: all.slice(start, end), total, current, size }
      },
      apiParams: { current: 1, size: 10 },
      columnsFactory: (): ColumnOption<FollowUpRecord>[] => [
        { type: 'globalIndex', label: '序号', width: 80 },
        { prop: 'content', label: '跟进内容', minWidth: 180 },
        { prop: 'status', label: '跟进状态', width: 110 },
        { prop: 'method', label: '跟进方式', width: 110 },
        { prop: 'nextContactTime', label: '下次联系时间', minWidth: 160 },
        { prop: 'createdAt', label: '创建时间', minWidth: 160 },
        {
          prop: 'operation',
          label: '操作',
          width: 140,
          align: 'center',
          fixed: 'right',
          useSlot: true
        }
      ]
    }
  })
</script>

<style scoped>
  .opportunity-list-page {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .art-table-card {
    display: flex;
    flex: 1;
    flex-direction: column;
  }

  .list-filter :deep(.el-link) {
    margin-right: 18px;
    font-size: 15px;
  }

  .follow-panel {
    display: grid;
    grid-template-columns: 360px 1fr;
    gap: 16px;
  }

  .follow-form h4 {
    margin: 0 0 8px;
  }
</style>
