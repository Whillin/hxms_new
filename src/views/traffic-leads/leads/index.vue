<template>
  <div class="clue-leads art-full-height">
    <!-- 搜索栏 -->
    <ArtSearchBar
      ref="searchRef"
      v-model="searchForm"
      :items="searchItems"
      :rules="searchRules"
      :is-expand="false"
      :show-expand="true"
      :show-reset="true"
      :show-search="true"
      :label-width="100"
      @search="handleSearch"
      @reset="handleReset"
    />

    <ElCard class="art-table-card" shadow="never" style="margin-top: 0">
      <template #header>
        <div class="table-header-wrapper">
          <h4>{{ $t('menus.clue.leads') }}</h4>
          <div class="table-tools">
            <ElButton size="small" type="primary" @click="openAddDialog" v-if="hasAuth('add')">
              <ElIcon><Plus /></ElIcon>
              新建线索
            </ElButton>
            <ArtExcelImport
              size="small"
              @import-success="handleImportSuccess"
              @import-error="handleImportError"
              v-auth="'import'"
            >
              <template #default>导入线索</template>
            </ArtExcelImport>
            <ArtExcelExport
              size="small"
              :data="excelData"
              filename="线索数据"
              sheetName="到点客流登记表"
              type="success"
              :headers="exportHeaders"
              auto-index
              :columns="exportColumns"
              v-auth="'export'"
            >
              导出线索
            </ArtExcelExport>
            <ArtTableHeader
              v-model:columns="columnChecks"
              :loading="loading"
              @refresh="refreshData"
              layout="refresh,columns"
              :showHeaderBackground="false"
              fullClass="art-table-card"
            />
          </div>
        </div>
      </template>

      <!-- 表格 -->
      <ArtTable
        ref="tableRef"
        rowKey="id"
        :loading="loading"
        :data="filteredData"
        :columns="columns"
        :pagination="pagination"
        size="small"
        :border="true"
        :stripe="true"
        :pagination-options="{ size: 'small' }"
        @pagination:size-change="handleSizeChange"
        @pagination:current-change="handleCurrentChange"
      >
        <template #operation="{ row }">
          <ElSpace>
            <ElButton size="small" @click="viewDetail(row)" v-auth="'view'">查看</ElButton>
            <ElButton size="small" type="primary" plain @click="editRow(row)" v-auth="'edit'"
              >编辑</ElButton
            >
            <ElPopconfirm title="确认删除该线索？" @confirm="deleteRow(row)">
              <template #reference>
                <ElButton size="small" type="danger" plain v-auth="'delete'">删除</ElButton>
              </template>
            </ElPopconfirm>
          </ElSpace>
        </template>
      </ArtTable>
    </ElCard>

    <!-- 新建线索对话框 -->
    <ElDialog
      v-model="addDialogVisible"
      title="新建线索"
      width="900px"
      destroy-on-close
      @close="resetAddForm"
    >
      <ArtForm
        ref="addFormRef"
        v-model="addForm"
        :items="addFormItems"
        :rules="addFormRules"
        :span="8"
        :gutter="16"
        :label-width="120"
        :show-reset="false"
        :show-submit="false"
      />
      <template #footer>
        <ElButton @click="addDialogVisible = false">取消</ElButton>
        <ElButton type="primary" @click="submitAdd">提交</ElButton>
      </template>
    </ElDialog>

    <!-- 线索详情抽屉 -->
    <ElDrawer v-model="detailVisible" title="线索详情" size="40%">
      <div class="detail-content">
        <ElDescriptions :column="1" border>
          <ElDescriptionsItem label="到店日期">{{ currentDetail?.visitDate }}</ElDescriptionsItem>
          <ElDescriptionsItem label="进店时间">{{ currentDetail?.enterTime }}</ElDescriptionsItem>
          <ElDescriptionsItem label="离店时间">{{ currentDetail?.leaveTime }}</ElDescriptionsItem>
          <ElDescriptionsItem label="接待时长(分钟)">
            {{ currentDetail?.receptionDuration }}
          </ElDescriptionsItem>
          <ElDescriptionsItem label="到店人数">{{
            currentDetail?.visitorCount
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="接待情况">{{
            formatReceptionStatus(currentDetail?.receptionStatus)
          }}</ElDescriptionsItem>
          <!-- 新增：归属门店显示 -->
          <ElDescriptionsItem label="归属门店">{{
            (() => {
              const id = Number(currentDetail?.storeId)
              const name = storeNameById.value[id]
              return name || (Number.isFinite(id) ? String(id) : '-')
            })()
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="销售顾问">{{
            currentDetail?.salesConsultant
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="客户姓名">{{
            resolvedDetail?.customerName
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="到店事宜">{{
            currentDetail?.visitPurpose
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="是否加微">{{
            (currentDetail as any)?.isAddWeChat ? '是' : '否'
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="到店分类">{{
            currentDetail?.visitCategory
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="客户电话">{{
            resolvedDetail?.customerPhone
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="关注车型">{{
            resolvedDetail?.focusModelName || findCategoryName(resolvedDetail?.focusModelId)
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="是否试驾">{{
            currentDetail?.testDrive ? '是' : '否'
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="是否议价">{{
            currentDetail?.bargaining ? '是' : '否'
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="是否成交">{{
            currentDetail?.dealDone ? '是' : '否'
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="成交车型">{{
            resolvedDetail?.dealModelName || findCategoryName(resolvedDetail?.dealModelId)
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="商机来源">{{
            resolvedDetail?.businessSource
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="渠道分类">{{
            resolvedDetail?.channelCategory
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="一级渠道">{{
            resolvedDetail?.channelLevel1
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="二级渠道">{{
            resolvedDetail?.channelLevel2
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="转化/保客车型">{{
            currentDetail?.convertOrRetentionModel
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="推荐人">{{ currentDetail?.referrer }}</ElDescriptionsItem>
          <ElDescriptionsItem label="接触次数">{{
            currentDetail?.contactTimes
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="商机级别">{{
            currentDetail?.opportunityLevel
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="使用者性别">{{
            resolvedDetail?.userGender
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="使用者年龄">{{ resolvedDetail?.userAge }}</ElDescriptionsItem>
          <ElDescriptionsItem label="购车经历">{{
            resolvedDetail?.buyExperience
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="使用手机">{{
            resolvedDetail?.userPhoneModel
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="现用品牌">{{
            resolvedDetail?.currentBrand
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="现用车型">{{
            resolvedDetail?.currentModel
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="车龄(年)">{{ resolvedDetail?.carAge }}</ElDescriptionsItem>
          <ElDescriptionsItem label="里程(万公里)">{{
            resolvedDetail?.mileage
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="居住区域">{{
            Array.isArray(resolvedDetail?.livingArea)
              ? resolvedDetail?.livingArea.join('/')
              : resolvedDetail?.livingArea
          }}</ElDescriptionsItem>
        </ElDescriptions>
      </div>
    </ElDrawer>
  </div>
</template>

<script setup lang="ts">
  import { Plus } from '@element-plus/icons-vue'
  import { ElMessage } from 'element-plus'
  import { useTable } from '@/composables/useTable'
  import type { ColumnOption } from '@/types/component'
  import { ref, computed, watch, onMounted } from 'vue'
  import { regionData } from 'element-china-area-data'
  import { useProductCategoryStore } from '@/store/modules/productCategory'
  import { useProductStore } from '@/store/modules/product'
  import { fetchGetModelsByStore } from '@/api/product'
  import { storeToRefs } from 'pinia'
  import { useUserStore } from '@/store/modules/user'
  import { useAuth } from '@/composables/useAuth'
  import {
    fetchGetClueList,
    fetchSaveClue,
    fetchDeleteClue,
    fetchGetClueInviterOptions
  } from '@/api/clue'
  import { fetchChannelOptions } from '@/api/channel'
  import { fetchGetDepartmentList, fetchGetEmployeeList } from '@/api/system-manage'
  import { EMPLOYEE_ROLE_LABELS } from '@/utils/employee'

  defineOptions({ name: 'ClueLeads' })

  const userStore = useUserStore()
  const { info } = storeToRefs(userStore)
  const categoryStore = useProductCategoryStore()

  const channelLevel1Options = ref<{ label: string; value: string }[]>([])
  const channelLevel2MapRef = ref<Record<string, { label: string; value: string }[]>>({})
  const channelMetaByL1Ref = ref<Record<string, { category: string; businessSource: string }>>({})

  onMounted(async () => {
    try {
      const resp = await fetchChannelOptions()
      channelLevel1Options.value = (resp.level1 || []).map((v: string) => ({ label: v, value: v }))
      channelLevel2MapRef.value = resp.level2Map || {}
      channelMetaByL1Ref.value = resp.metaByLevel1 || {}
    } catch (e: any) {
      console.error('[fetchChannelOptions] failed:', e)
    }
    try {
      const sid = Number((info.value as any)?.storeId)
      if (Number.isFinite(sid) && sid > 0) {
        await productStore.loadProductsByStoreId(sid)
        await rebuildModelOptionsByStore(sid)
      } else {
        const brand = (info.value as any)?.brandName || (info.value as any)?.brand || undefined
        let categoryId: number | undefined
        if (brand) {
          try {
            await categoryStore.loadFromApi()
          } catch (err) {
            void err
          }
          const tree: any[] = (categoryStore as any).tree || []
          const node: any = tree.find((n: any) => n?.level === 1 && String(n?.name) === brand)
          if (node && typeof node.id === 'number') categoryId = node.id
        }
        if (typeof categoryId === 'number') {
          await productStore.loadProductsByCategoryId(categoryId, true)
        } else {
          await productStore.loadProducts(brand)
        }
        modelOptionsRef.value = nameOptions.value
      }
    } catch (e: any) {
      void e
    }
  })

  // 监听品牌变化（中文brandName或英文brand），实时刷新关注/成交车型选项（按分类ID）
  watch(
    [
      () => (info.value as any)?.storeId,
      () => (info.value as any)?.brandName,
      () => (info.value as any)?.brand
    ],
    async ([sid, brandName, brand]) => {
      try {
        const sidNum = Number(sid)
        if (Number.isFinite(sidNum) && sidNum > 0) {
          await productStore.loadProductsByStoreId(sidNum)
          return
        }
        const b = brandName || brand || undefined
        let categoryId: number | undefined
        if (b) {
          try {
            await categoryStore.loadFromApi()
          } catch (err) {
            void err
          }
          const tree: any[] = (categoryStore as any).tree || []
          const node: any = tree.find((n: any) => n?.level === 1 && String(n?.name) === b)
          if (node && typeof node.id === 'number') categoryId = node.id
        }
        if (typeof categoryId === 'number') {
          await productStore.loadProductsByCategoryId(categoryId, true)
        } else {
          await productStore.loadProducts(b)
        }
      } catch (e: any) {
        void e
      }
    }
  )

  const { hasAuth } = useAuth()

  // 搜索表单
  const searchRef = ref()
  const searchForm = ref({
    customerName: '',
    customerPhone: '',
    opportunityLevel: '',
    dealDone: '',
    daterange: undefined as any
  })

  const searchItems = computed(() => [
    {
      label: '客户姓名',
      key: 'customerName',
      type: 'input',
      props: { placeholder: '请输入客户姓名', clearable: true }
    },
    {
      label: '客户电话',
      key: 'customerPhone',
      type: 'input',
      props: { placeholder: '请输入客户电话', clearable: true }
    },
    {
      label: '商机级别',
      key: 'opportunityLevel',
      type: 'select',
      props: {
        placeholder: '请选择商机级别',
        clearable: true,
        options: [
          { label: 'H', value: 'H' },
          { label: 'A', value: 'A' },
          { label: 'B', value: 'B' },
          { label: 'C', value: 'C' }
        ]
      }
    },
    {
      label: '是否成交',
      key: 'dealDone',
      type: 'select',
      props: {
        placeholder: '是否成交',
        clearable: true,
        options: [
          { label: '全部', value: '' },
          { label: '是', value: 'true' },
          { label: '否', value: 'false' }
        ]
      }
    },
    {
      label: '到店日期范围',
      key: 'daterange',
      type: 'datetime',
      span: 12,
      props: {
        type: 'daterange',
        valueFormat: 'YYYY-MM-DD',
        rangeSeparator: '至',
        startPlaceholder: '开始日期',
        endPlaceholder: '结束日期',
        style: { width: '100%' }
      }
    }
  ])

  const searchRules = {
    customerPhone: [{ pattern: /^\d{0,11}$/, message: '手机号格式错误', trigger: 'blur' }]
  }

  const handleSearch = () => {
    // 触发搜索并回到第一页
    // 避免与防抖请求重复触发
    try {
      ;(getDataDebounced as any)?.cancel?.()
    } catch {
      void 0
    }
    getData()
  }
  const handleReset = () => {
    searchForm.value = {
      customerName: '',
      customerPhone: '',
      opportunityLevel: '',
      dealDone: '',
      daterange: undefined
    }
    // 避免与防抖请求重复触发
    try {
      ;(getDataDebounced as any)?.cancel?.()
    } catch {
      void 0
    }
    getData()
  }

  // 表格与数据
  interface ClueItem {
    id?: string | number
    visitDate?: string
    enterTime?: string
    leaveTime?: string
    receptionDuration?: number
    visitorCount?: number
    receptionStatus?: 'sales' | 'none' | 'noNeed'
    salesConsultant?: string
    inviter?: string
    customerName?: string
    visitPurpose?: '看车' | '维保' | '提车' | '续保' | '咨询' | '拜访'
    isAddWeChat?: boolean
    visitCategory?: '首次' | '再次'
    customerPhone?: string
    focusModelId?: number
    /** 关注车型名称（导出/展示时可能使用） */
    focusModelName?: string
    testDrive?: boolean
    bargaining?: boolean
    dealDone?: boolean
    dealModelId?: number
    /** 成交车型名称（导出/展示时可能使用） */
    dealModelName?: string
    businessSource?: string
    channelCategory?: string
    channelLevel1?: string
    channelLevel2?: string
    convertOrRetentionModel?: string
    referrer?: string
    contactTimes?: number
    opportunityLevel?: 'H' | 'A' | 'B' | 'C'
    // 新增：归属门店
    storeId?: number
    // 新增：快照字段（只读）
    customerSnapshot?: {
      id?: number
      name?: string
      phone?: string
      gender?: '男' | '女' | '未知'
      age?: number
      buyExperience?: '首购' | '换购' | '增购'
      phoneModel?: string
      currentBrand?: string
      currentModel?: string
      carAge?: number
      mileage?: number
      livingArea?: string
      storeId?: number
    }
    channelSnapshot?: {
      id?: number
      category?: string
      businessSource?: string
      level1?: string
      level2?: string
      compoundKey?: string
    }
    productSnapshot?: {
      focus?: { id?: number; name?: string }
      deal?: { id?: number; name?: string }
    }
  }

  // 本地新增缓存，避免重置/刷新后丢失
  const localCreates = ref<ClueItem[]>([])
  const LS_KEY_LOCAL_CREATES = 'leads_local_creates'
  const loadLocalCreates = () => {
    try {
      const raw = localStorage.getItem(LS_KEY_LOCAL_CREATES)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) localCreates.value = parsed
      }
    } catch (e) {
      console.warn('读取本地新增线索失败', e)
    }
  }

  // 初始化加载本地数据
  loadLocalCreates()

  // 使用项目内的标准分页响应结构，方便 useTable 自动推断泛型

  // 商品分类选项（用于关注/成交车型选择）
  // 注意：已在上方创建 categoryStore，这里不再重复声明
  const { flatList } = storeToRefs(categoryStore)

  const formatReceptionStatus = (v?: ClueItem['receptionStatus']) => {
    const map: Record<string, string> = { sales: '销售接待', none: '无人接待', noNeed: '不需接待' }
    return v ? map[v] : ''
  }

  const findCategoryName = (id?: number) => {
    const item = (flatList.value || []).find((c: any) => c.id === id)
    return item ? item.name : ''
  }

  // 统一解析：优先采用快照，再回退到冗余/原字段
  const resolveClue = (row: ClueItem): ClueItem => {
    const cs = (row as any).customerSnapshot || {}
    const chs = (row as any).channelSnapshot || {}
    const ps = (row as any).productSnapshot || {}
    const living = (() => {
      if (Array.isArray(row.livingArea)) return row.livingArea
      const lv = (row as any).livingArea ?? cs.livingArea
      if (Array.isArray(lv)) return lv
      if (typeof lv === 'string' && lv) return lv.split('/')
      return []
    })()
    return {
      ...row,
      customerName: cs.name ?? row.customerName,
      customerPhone: cs.phone ?? row.customerPhone,
      userGender: cs.gender ?? row.userGender,
      userAge: typeof cs.age === 'number' ? cs.age : row.userAge,
      buyExperience: cs.buyExperience ?? row.buyExperience,
      userPhoneModel: cs.phoneModel ?? row.userPhoneModel,
      currentBrand: cs.currentBrand ?? row.currentBrand,
      currentModel: cs.currentModel ?? row.currentModel,
      carAge: typeof cs.carAge === 'number' ? cs.carAge : row.carAge,
      mileage: typeof cs.mileage === 'number' ? cs.mileage : row.mileage,
      livingArea: living,
      businessSource: chs.businessSource ?? row.businessSource,
      channelCategory: chs.category ?? row.channelCategory,
      channelLevel1: chs.level1 ?? row.channelLevel1,
      channelLevel2: chs.level2 ?? row.channelLevel2,
      focusModelId: typeof ps?.focus?.id === 'number' ? (ps.focus.id as number) : row.focusModelId,
      focusModelName: ps?.focus?.name ?? row.focusModelName,
      dealModelId: typeof ps?.deal?.id === 'number' ? (ps.deal.id as number) : row.dealModelId,
      dealModelName: ps?.deal?.name ?? row.dealModelName
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
    getData,
    getDataDebounced
  } = useTable({
    core: {
      apiFn: async ({
        current,
        size
      }: Api.Common.CommonSearchParams): Promise<Api.Common.PaginatedResponse<ClueItem>> => {
        const params = { current, size, ...searchForm.value }
        const res = await fetchGetClueList(params)
        // 返回标准分页响应结构，便于泛型正确推断记录类型
        return { records: res.records, total: res.total, current, size }
      },
      apiParams: { current: 1, size: 10 },
      columnsFactory: (): ColumnOption<ClueItem>[] => [
        { type: 'globalIndex', label: '序号', width: 80 },
        {
          prop: 'storeId',
          label: '归属门店',
          width: 140,
          formatter: (row: ClueItem) => storeNameById.value[row.storeId || -1] || ''
        },
        { prop: 'visitDate', label: '到店日期', width: 120 },
        { prop: 'enterTime', label: '进店时间', width: 160 },
        { prop: 'leaveTime', label: '离店时间', width: 160 },
        { prop: 'receptionDuration', label: '接待时长(分钟)', width: 130 },
        { prop: 'visitorCount', label: '到店人数', width: 100 },
        {
          prop: 'receptionStatus',
          label: '接待情况',
          width: 120,
          formatter: (row: ClueItem) => formatReceptionStatus(row.receptionStatus)
        },
        { prop: 'salesConsultant', label: '销售顾问', width: 120 },
        { prop: 'inviter', label: '邀约专员', width: 120 },
        // 新增：归属门店列
        {
          prop: 'storeId',
          label: '归属门店',
          width: 140,
          formatter: (row: any) => {
            const id = Number(row.storeId)
            const name = storeNameById.value[id]
            return name || (Number.isFinite(id) ? String(id) : '-')
          }
        },
        {
          prop: 'customerName',
          label: '客户姓名',
          width: 120,
          formatter: (row: ClueItem) => resolveClue(row).customerName || ''
        },
        { prop: 'visitPurpose', label: '到店事宜', width: 120 },
        {
          prop: 'isAddWeChat',
          label: '是否加微',
          width: 100,
          formatter: (row: any) => ((row as any).isAddWeChat ? '是' : '否')
        },
        { prop: 'visitCategory', label: '到店分类', width: 100 },
        {
          prop: 'customerPhone',
          label: '客户电话',
          width: 140,
          formatter: (row: ClueItem) => resolveClue(row).customerPhone || ''
        },
        {
          prop: 'focusModelId',
          label: '关注车型',
          width: 160,
          formatter: (row: any) => {
            const r = resolveClue(row)
            return r.focusModelName || findCategoryName(r.focusModelId)
          }
        },
        {
          prop: 'testDrive',
          label: '是否试驾',
          width: 100,
          formatter: (row: ClueItem) => (row.testDrive ? '是' : '否')
        },
        {
          prop: 'bargaining',
          label: '是否议价',
          width: 100,
          formatter: (row: ClueItem) => (row.bargaining ? '是' : '否')
        },
        {
          prop: 'dealDone',
          label: '是否成交',
          width: 100,
          formatter: (row: ClueItem) => (row.dealDone ? '是' : '否')
        },
        {
          prop: 'dealModelId',
          label: '成交车型',
          width: 160,
          formatter: (row: any) => {
            const r = resolveClue(row)
            return r.dealModelName || findCategoryName(r.dealModelId)
          }
        },
        {
          prop: 'businessSource',
          label: '商机来源',
          width: 120,
          formatter: (row: ClueItem) => resolveClue(row).businessSource || ''
        },
        {
          prop: 'channelCategory',
          label: '渠道分类',
          width: 120,
          formatter: (row: ClueItem) => resolveClue(row).channelCategory || ''
        },
        {
          prop: 'channelLevel1',
          label: '一级渠道',
          width: 120,
          formatter: (row: ClueItem) => resolveClue(row).channelLevel1 || ''
        },
        {
          prop: 'channelLevel2',
          label: '二级渠道',
          width: 120,
          formatter: (row: ClueItem) => resolveClue(row).channelLevel2 || ''
        },
        { prop: 'convertOrRetentionModel', label: '转化/保客车型', width: 140 },
        { prop: 'referrer', label: '推荐人', width: 120 },
        { prop: 'contactTimes', label: '接触次数', width: 100 },
        { prop: 'opportunityLevel', label: '商机级别', width: 100 },
        {
          prop: 'userGender',
          label: '使用者性别',
          width: 100,
          formatter: (row: ClueItem) => resolveClue(row).userGender || ''
        },
        {
          prop: 'userAge',
          label: '使用者年龄',
          width: 110,
          formatter: (row: ClueItem) => resolveClue(row).userAge ?? ''
        },
        {
          prop: 'buyExperience',
          label: '购车经历',
          width: 110,
          formatter: (row: ClueItem) => resolveClue(row).buyExperience || ''
        },
        {
          prop: 'userPhoneModel',
          label: '使用手机',
          width: 120,
          formatter: (row: ClueItem) => resolveClue(row).userPhoneModel || ''
        },
        {
          prop: 'currentBrand',
          label: '现用品牌',
          width: 120,
          formatter: (row: ClueItem) => resolveClue(row).currentBrand || ''
        },
        {
          prop: 'currentModel',
          label: '现用车型',
          width: 120,
          formatter: (row: ClueItem) => resolveClue(row).currentModel || ''
        },
        {
          prop: 'carAge',
          label: '车龄(年)',
          width: 100,
          formatter: (row: ClueItem) => resolveClue(row).carAge ?? ''
        },
        {
          prop: 'mileage',
          label: '里程(万公里)',
          width: 110,
          formatter: (row: ClueItem) => resolveClue(row).mileage ?? ''
        },
        {
          prop: 'livingArea',
          label: '居住区域',
          width: 140,
          formatter: (row: ClueItem) => {
            const v = resolveClue(row).livingArea
            return Array.isArray(v) ? v.join('/') : v
          }
        },
        { prop: 'operation', label: '操作', width: 220, useSlot: true }
      ]
    },
    performance: {
      // 轻微延迟，提升输入体验与减少请求量
      debounceTime: 400
    }
  })

  const filteredData = computed(() => data.value)

  // 构造导出数据：将数组字段转换为字符串以满足 ExportData 类型
  const excelData = computed(() =>
    (filteredData.value || []).map((row: any) => {
      const r = resolveClue(row)
      const obj: Record<string, any> = { ...r }
      const la = obj.livingArea
      obj.livingArea = Array.isArray(la) ? la.join('/') : la
      return obj
    })
  )

  // 导入导出配置
  const exportHeaders = {
    id: '序号',
    visitDate: '到店日期',
    enterTime: '进店时间',
    leaveTime: '离店时间',
    receptionDuration: '接待时长(分钟)',
    visitorCount: '到店人数',
    receptionStatus: '接待情况',
    salesConsultant: '销售顾问',
    inviter: '邀约专员',
    customerName: '客户姓名',
    visitPurpose: '到店事宜',
    isAddWeChat: '是否加微',
    visitCategory: '到店分类',
    customerPhone: '客户电话',
    storeId: '归属门店',
    focusModelId: '关注车型',
    testDrive: '是否试驾',
    bargaining: '是否议价',
    dealDone: '是否成交',
    dealModelId: '成交车型',
    businessSource: '商机来源',
    channelCategory: '渠道分类',
    channelLevel1: '一级渠道',
    channelLevel2: '二级渠道',
    convertOrRetentionModel: '转化/保客车型',
    referrer: '推荐人',
    contactTimes: '接触次数',
    opportunityLevel: '商机级别',
    userGender: '使用者性别',
    userAge: '使用者年龄',
    buyExperience: '购车经历',
    userPhoneModel: '使用手机',
    currentBrand: '现用品牌',
    currentModel: '现用车型',
    carAge: '车龄(年)',
    mileage: '里程(万公里)',
    livingArea: '居住区域'
  }
  const exportColumns = {
    id: { title: '序号', width: 8 },
    visitDate: { title: '到店日期', width: 14 },
    enterTime: { title: '进店时间', width: 18 },
    leaveTime: { title: '离店时间', width: 18 },
    receptionDuration: { title: '接待时长(分钟)', width: 16 },
    visitorCount: { title: '到店人数', width: 12 },
    receptionStatus: {
      title: '接待情况',
      width: 14,
      formatter: (v: any) => formatReceptionStatus(v)
    },
    salesConsultant: { title: '销售顾问', width: 14 },
    inviter: { title: '邀约专员', width: 14 },
    customerName: { title: '客户姓名', width: 14 },
    visitPurpose: { title: '到店事宜', width: 14 },
    isAddWeChat: { title: '是否加微', width: 12, formatter: (v: any) => (v ? '是' : '否') },
    visitCategory: { title: '到店分类', width: 12 },
    customerPhone: { title: '客户电话', width: 16 },
    focusModelId: {
      title: '关注车型',
      width: 20,
      formatter: (_: any, __: any, row: any) =>
        row.focusModelName || findCategoryName(row?.focusModelId)
    },
    testDrive: { title: '是否试驾', width: 12, formatter: (v: any) => (v ? '是' : '否') },
    bargaining: { title: '是否议价', width: 12, formatter: (v: any) => (v ? '是' : '否') },
    dealDone: { title: '是否成交', width: 12, formatter: (v: any) => (v ? '是' : '否') },
    dealModelId: {
      title: '成交车型',
      width: 20,
      formatter: (_: any, __: any, row: any) =>
        row.dealModelName || findCategoryName(row?.dealModelId)
    },
    businessSource: { title: '商机来源', width: 14 },
    channelCategory: { title: '渠道分类', width: 14 },
    channelLevel1: { title: '一级渠道', width: 14 },
    channelLevel2: { title: '二级渠道', width: 14 },
    convertOrRetentionModel: { title: '转化/保客车型', width: 18 },
    referrer: { title: '推荐人', width: 14 },
    contactTimes: { title: '接触次数', width: 12 },
    opportunityLevel: { title: '商机级别', width: 12 },
    userGender: { title: '使用者性别', width: 12 },
    userAge: { title: '使用者年龄', width: 12 },
    buyExperience: { title: '购车经历', width: 12 },
    userPhoneModel: { title: '使用手机', width: 14 },
    currentBrand: { title: '现用品牌', width: 14 },
    currentModel: { title: '现用车型', width: 14 },
    carAge: { title: '车龄(年)', width: 12 },
    mileage: { title: '里程(万公里)', width: 14 },
    livingArea: {
      title: '居住区域',
      width: 18,
      formatter: (_: any, __: any, v: any) => (Array.isArray(v) ? v.join('/') : v)
    }
  }

  // 新建线索
  const addDialogVisible = ref(false)
  const addFormRef = ref<any>(null)
  const initAddForm = (): Partial<ClueItem> => ({
    visitDate: '',
    enterTime: '',
    leaveTime: '',
    receptionDuration: 0,
    visitorCount: 1,
    receptionStatus: 'sales',
    salesConsultant: '',
    inviter: '',
    customerName: '',
    visitPurpose: '看车',
    isAddWeChat: false,
    visitCategory: '首次',
    customerPhone: '',
    focusModelName: '',
    testDrive: false,
    bargaining: false,
    dealDone: false,
    dealModelName: '',
    businessSource: '',
    channelCategory: '',
    channelLevel1: '',
    channelLevel2: '',
    convertOrRetentionModel: '',
    referrer: '',
    contactTimes: 1,
    opportunityLevel: 'A',
    userGender: '' as any,
    userAge: 0,
    buyExperience: '首购',
    userPhoneModel: '',
    currentBrand: '',
    currentModel: '',
    carAge: 0,
    mileage: 0,
    livingArea: []
  })
  const addForm = ref<Partial<ClueItem>>(initAddForm())
  const editingId = ref<string | null>(null)
  const productStore = useProductStore()
  const { nameOptions } = storeToRefs(productStore)
  const modelOptionsRef = ref<Array<{ label: string; value: string | number }>>([
    { label: '请选择', value: '' }
  ])
  const rebuildModelOptionsByStore = async (sid?: number) => {
    const idNum = Number(sid)
    if (!Number.isFinite(idNum) || idNum <= 0) {
      modelOptionsRef.value = nameOptions.value
      return
    }
    try {
      const list = await fetchGetModelsByStore(idNum)
      const arr = Array.isArray(list) ? list : []
      const opts: Array<{ label: string; value: number | '' }> = [{ label: '全部车型', value: '' }]
      arr.forEach((m: any) => {
        const id = Number(m.id)
        const label = String(m.name || id)
        if (Number.isFinite(id)) opts.push({ label, value: id })
      })
      modelOptionsRef.value = opts as any
    } catch {
      modelOptionsRef.value = [{ label: '全部车型', value: '' }] as any
    }
  }
  const ALLOWED_PRIMARY_REFERRER = ['转化开发', '保客开发']
  const ALLOWED_REFERRER = ['转化开发', '保客开发', '转介绍开发']

  // 销售顾问下拉选项（按门店加载，仅显示销售顾问/销售经理）
  const salesConsultantOptions = ref<{ label: string; value: string }[]>([])
  const loadingSales = ref(false)
  const loadSalesConsultants = async () => {
    const storeId =
      typeof addForm.value.storeId === 'number'
        ? addForm.value.storeId
        : typeof info.value?.storeId === 'number'
          ? (info.value!.storeId as number)
          : undefined
    const storeIdNum = Number(storeId)
    if (!Number.isFinite(storeIdNum) || storeIdNum <= 0) {
      salesConsultantOptions.value = []
      return
    }
    loadingSales.value = true
    try {
      const resp: any = await fetchGetEmployeeList({ storeId: storeIdNum, current: 1, size: 200 })
      const list: Api.SystemManage.EmployeeItem[] =
        (resp?.data?.records as any) || (resp?.records as any) || []
      const filtered = (Array.isArray(list) ? list : []).filter(
        (e) => e.role === 'R_SALES' || e.role === 'R_SALES_MANAGER'
      )
      salesConsultantOptions.value = filtered.map((e) => ({
        label: `${e.name}（${EMPLOYEE_ROLE_LABELS[e.role] ?? e.role}）`,
        value: e.name
      }))
    } catch {
      salesConsultantOptions.value = []
    } finally {
      loadingSales.value = false
    }
  }
  // 邀约专员下拉选项（按门店加载，仅显示邀约专员角色）
  const inviterOptions = ref<{ label: string; value: string }[]>([])
  const loadingInviter = ref(false)
  const loadInviters = async () => {
    const storeId =
      typeof addForm.value.storeId === 'number'
        ? addForm.value.storeId
        : typeof info.value?.storeId === 'number'
          ? (info.value!.storeId as number)
          : undefined
    const storeIdNum = Number(storeId)
    if (!Number.isFinite(storeIdNum) || storeIdNum <= 0) {
      inviterOptions.value = []
      return
    }
    loadingInviter.value = true
    try {
      // 优先调用线索专用接口，保证销售顾问账号也能看到本门店邀约专员
      const resp: any = await fetchGetClueInviterOptions({ storeId: storeIdNum })
      const raw: Array<{ label: string; value: string } | string> =
        (resp as any)?.data || resp || []
      inviterOptions.value = Array.isArray(raw)
        ? raw.map((o: any) => (typeof o === 'string' ? { label: o, value: o } : o))
        : []
      console.debug('[inviter-options]', {
        storeId: storeIdNum,
        count: inviterOptions.value.length,
        via: 'clue.inviter-options'
      })

      // 后备方案：若专用接口未返回数据，则从员工列表中按角色筛选邀约专员
      if (!inviterOptions.value.length) {
        const empResp: any = await fetchGetEmployeeList({
          storeId: storeIdNum,
          role: 'R_APPOINTMENT',
          status: '1',
          current: 1,
          size: 50
        })
        const list: Api.SystemManage.EmployeeItem[] =
          (empResp?.data?.records as any) || (empResp?.records as any) || []
        inviterOptions.value = (Array.isArray(list) ? list : []).map((e) => ({
          label: `${e.name}（邀约专员）`,
          value: e.name
        }))
        console.debug('[inviter-options-fallback]', {
          storeId: storeIdNum,
          count: inviterOptions.value.length,
          via: 'employee.list'
        })
      }
    } catch {
      try {
        const empResp: any = await fetchGetEmployeeList({
          storeId: storeIdNum,
          role: 'R_APPOINTMENT',
          status: '1',
          current: 1,
          size: 50
        })
        const list: Api.SystemManage.EmployeeItem[] =
          (empResp?.data?.records as any) || (empResp?.records as any) || []
        inviterOptions.value = (Array.isArray(list) ? list : []).map((e) => ({
          label: `${e.name}（邀约专员）`,
          value: e.name
        }))
        console.debug('[inviter-options-fallback]', {
          storeId: storeIdNum,
          count: inviterOptions.value.length,
          via: 'employee.list'
        })
      } catch {
        inviterOptions.value = []
        console.debug('[inviter-options] error, set empty', { storeId: storeIdNum })
      }
    } finally {
      loadingInviter.value = false
    }
  }
  const cityCascaderOptionsRef = ref<any[]>(regionData as any)
  // 使用手机品牌选项
  const phoneBrandOptions = [
    { label: '苹果', value: '苹果' },
    { label: '华为', value: '华为' },
    { label: '小米', value: '小米' },
    { label: '三星', value: '三星' },
    { label: 'OPPO', value: 'OPPO' },
    { label: 'Vivo', value: 'Vivo' },
    { label: '荣耀', value: '荣耀' },
    { label: '其他', value: '其他' }
  ]

  // 现用品牌选项（按你的要求完整列出）
  const currentBrandOptions = [
    { label: '大众', value: '大众' },
    { label: '奥迪', value: '奥迪' },
    { label: '奔驰', value: '奔驰' },
    { label: '宝马', value: '宝马' },
    { label: '保时捷', value: '保时捷' },
    { label: '沃尔沃', value: '沃尔沃' },
    { label: '凯迪拉克', value: '凯迪拉克' },
    { label: '雷克萨斯', value: '雷克萨斯' },
    { label: '林肯', value: '林肯' },
    { label: '路虎', value: '路虎' },
    { label: '捷豹', value: '捷豹' },
    { label: '玛莎拉蒂', value: '玛莎拉蒂' },
    { label: '其他豪华', value: '其他豪华' },
    { label: '特斯拉', value: '特斯拉' },
    { label: '蔚来', value: '蔚来' },
    { label: '理想', value: '理想' },
    { label: '小鹏', value: '小鹏' },
    { label: '小米', value: '小米' },
    { label: '极氪', value: '极氪' },
    { label: '阿维塔', value: '阿维塔' },
    { label: '问界', value: '问界' },
    { label: '智界', value: '智界' },
    { label: '享界', value: '享界' },
    { label: '尊界', value: '尊界' },
    { label: '尚界', value: '尚界' },
    { label: '智己', value: '智己' },
    { label: '乐道', value: '乐道' },
    { label: '比亚迪', value: '比亚迪' },
    { label: '腾势', value: '腾势' },
    { label: '仰望', value: '仰望' },
    { label: '方程豹', value: '方程豹' },
    { label: '其他新势力', value: '其他新势力' },
    { label: '长安', value: '长安' },
    { label: '奇瑞', value: '奇瑞' },
    { label: '长城', value: '长城' },
    { label: '红旗', value: '红旗' },
    { label: '其他国产', value: '其他国产' },
    { label: '丰田', value: '丰田' },
    { label: '本田', value: '本田' },
    { label: '日产', value: '日产' },
    { label: '铃木', value: '铃木' },
    { label: '现代', value: '现代' },
    { label: '起亚', value: '起亚' },
    { label: '福特', value: '福特' },
    { label: '别克', value: '别克' },
    { label: 'JEEP', value: 'JEEP' }
  ]

  // 二级渠道选项生成函数，供表单项与校验共用
  const getChannelLevel2Options = (l1: string) => {
    const m: Record<string, { label: string; value: string }[]> = {
      'DCC/ADC到店': [
        { label: 'DCC/ADC(懂车帝）', value: 'DCC/ADC(懂车帝）' },
        { label: 'DCC/ADC(汽车之家）', value: 'DCC/ADC(汽车之家）' },
        { label: 'DCC/ADC（品牌推荐）', value: 'DCC/ADC（品牌推荐）' },
        { label: 'DCC/ADC(易车）', value: 'DCC/ADC(易车）' },
        { label: 'DCC/ADC(其他垂媒）', value: 'DCC/ADC(其他垂媒）' }
      ],
      新媒体开发: [
        { label: '新媒体（公司抖音）', value: '新媒体（公司抖音）' },
        { label: '新媒体（公司小红书/其他）', value: '新媒体（公司小红书/其他）' },
        { label: '新媒体（个人小红书）', value: '新媒体（个人小红书）' },
        { label: '新媒体（个人抖音/其他）', value: '新媒体（个人抖音/其他）' }
      ],
      保客开发: [
        { label: '保客（小鹏)', value: '保客（小鹏)' },
        { label: '保客（奥迪)', value: '保客（奥迪)' }
      ],
      转介绍开发: [
        { label: '转介绍（客户）', value: '转介绍（客户）' },
        { label: '转介绍（内部）', value: '转介绍（内部）' },
        { label: '转介绍（圈层）', value: '转介绍（圈层）' }
      ],
      大用户开发: [{ label: '大用户（外拓）', value: '大用户（外拓）' }]
    }
    return m[l1] || []
  }
  const addFormItems = computed(() => [
    { label: '基本情况', key: 'grp_base', type: 'divider', span: 24 },
    {
      label: '到店日期',
      key: 'visitDate',
      type: 'datetime',
      props: {
        type: 'date',
        valueFormat: 'YYYY-MM-DD',
        placeholder: '请选择到店日期',
        disabledDate: (date: Date) => date.getTime() > Date.now()
      }
    },
    // 单字段时间选择器：进店时间/离店时间（小时分钟）
    {
      label: '进店时间',
      key: 'enterTime',
      type: 'timepicker',
      props: {
        format: 'HH:mm',
        valueFormat: 'HH:mm',
        placeholder: '请选择进店时间',
        clearable: true
      }
    },
    {
      label: '离店时间',
      key: 'leaveTime',
      type: 'timepicker',
      props: {
        format: 'HH:mm',
        valueFormat: 'HH:mm',
        placeholder: '请选择离店时间',
        clearable: true
      }
    },
    {
      label: '接待时长(分钟)',
      key: 'receptionDuration',
      type: 'input',
      props: { placeholder: '自动计算', disabled: true }
    },
    { label: '到店人数', key: 'visitorCount', type: 'input', props: { type: 'number', min: 1 } },
    {
      label: '接待情况',
      key: 'receptionStatus',
      type: 'select',
      props: {
        options: [
          { label: '销售接待', value: 'sales' },
          { label: '无人接待', value: 'none' },
          { label: '不需接待', value: 'noNeed' }
        ]
      }
    },
    {
      label: '销售顾问',
      key: 'salesConsultant',
      type: 'select',
      props: {
        placeholder: '请选择销售顾问',
        options: salesConsultantOptions.value,
        disabled: addForm.value.receptionStatus !== 'sales'
      }
    },
    {
      label: '邀约专员',
      key: 'inviter',
      type: 'select',
      hidden: !isInviterRequiredRef.value,
      props: {
        placeholder: '请选择邀约专员',
        options: inviterOptions.value,
        loading: loadingInviter.value
      }
    },
    {
      label: '客户姓名',
      key: 'customerName',
      type: 'input',
      props: { placeholder: '请输入客户姓名' }
    },
    {
      label: '到店事宜',
      key: 'visitPurpose',
      type: 'select',
      props: {
        options: [
          { label: '看车', value: '看车' },
          { label: '维保', value: '维保' },
          { label: '提车', value: '提车' },
          { label: '续保', value: '续保' },
          { label: '咨询', value: '咨询' },
          { label: '拜访', value: '拜访' }
        ]
      }
    },
    {
      label: '是否加微',
      key: 'isAddWeChat',
      type: 'select',
      props: {
        options: [
          { label: '否', value: false },
          { label: '是', value: true }
        ]
      }
    },
    {
      label: '到店分类',
      key: 'visitCategory',
      type: 'select',
      props: {
        options: [
          { label: '首次', value: '首次' },
          { label: '再次', value: '再次' }
        ]
      }
    },
    {
      label: '客户电话',
      key: 'customerPhone',
      type: 'input',
      props: { placeholder: '请输入客户电话' }
    },
    { label: '销售漏斗分析', key: 'grp_funnel', type: 'divider', span: 24 },
    // 关注车型：使用商品管理的车型名称
    {
      label: '关注车型',
      key: 'focusModelName',
      type: 'select',
      props: { options: modelOptionsRef }
    },
    {
      label: '是否试驾',
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
      label: '是否议价',
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
      label: '是否成交',
      key: 'dealDone',
      type: 'select',
      props: {
        options: [
          { label: '否', value: false },
          { label: '是', value: true }
        ]
      }
    },
    // 成交车型：使用商品管理的车型名称
    {
      label: '成交车型',
      key: 'dealModelName',
      type: 'select',
      props: { options: modelOptionsRef }
    },
    { label: '渠道分析', key: 'grp_channel', type: 'divider', span: 24 },
    {
      label: '归属门店',
      key: 'storeId',
      type: 'select',
      props: {
        options: storeOptions.value,
        placeholder: '请选择归属门店',
        // 管理类角色可自由选择门店；非管理类角色且绑定了门店则禁用
        disabled: !isAdminLike.value && typeof info.value?.storeId === 'number'
      }
    },
    {
      label: '一级渠道',
      key: 'channelLevel1',
      type: 'select',
      props: {
        options: channelLevel1Options.value
      }
    },
    {
      label: '二级渠道',
      key: 'channelLevel2',
      type: 'select',
      props: { options: channelLevel2MapRef.value[String(addForm.value.channelLevel1)] || [] }
    },
    { label: '接触次数', key: 'contactTimes', type: 'input', props: { type: 'number', min: 1 } },
    {
      label: '商机级别',
      key: 'opportunityLevel',
      type: 'select',
      props: {
        options: [
          { label: 'H', value: 'H' },
          { label: 'A', value: 'A' },
          { label: 'B', value: 'B' },
          { label: 'C', value: 'C' },
          { label: 'O', value: 'O' }
        ],
        disabled: addForm.value.dealDone === true
      }
    },
    {
      label: '商机来源',
      key: 'businessSource',
      type: 'select',
      props: {
        disabled: true,
        options: [
          { label: '自然到店', value: '自然到店' },
          { label: '主动开发', value: '主动开发' }
        ]
      }
    },
    {
      label: '渠道分类',
      key: 'channelCategory',
      type: 'select',
      props: {
        disabled: true,
        options: [
          { label: '线上', value: '线上' },
          { label: '线下', value: '线下' }
        ]
      }
    },
    {
      label: '转化/保客车型',
      key: 'convertOrRetentionModel',
      type: 'select',
      props: {
        options: nameOptions.value,
        disabled: !ALLOWED_PRIMARY_REFERRER.includes(String(addForm.value.channelLevel1))
      }
    },
    {
      label: '推荐人',
      key: 'referrer',
      type: 'input',
      props: { disabled: !ALLOWED_REFERRER.includes(String(addForm.value.channelLevel1)) }
    },
    { label: '客户信息', key: 'grp_customer', type: 'divider', span: 24 },
    {
      label: '使用者性别',
      key: 'userGender',
      type: 'select',
      props: {
        options: [
          { label: '男', value: '男' },
          { label: '女', value: '女' }
        ]
      }
    },
    { label: '使用者年龄', key: 'userAge', type: 'input', props: { type: 'number', min: 0 } },
    {
      label: '购车经历',
      key: 'buyExperience',
      type: 'select',
      props: {
        options: [
          { label: '首购', value: '首购' },
          { label: '换购', value: '换购' },
          { label: '增购', value: '增购' }
        ]
      }
    },
    {
      label: '使用手机',
      key: 'userPhoneModel',
      type: 'select',
      props: { options: phoneBrandOptions }
    },
    {
      label: '现用品牌',
      key: 'currentBrand',
      type: 'select',
      props: { options: currentBrandOptions, disabled: addForm.value.buyExperience === '首购' }
    },
    {
      label: '现用车型',
      key: 'currentModel',
      type: 'input',
      props: { disabled: addForm.value.buyExperience === '首购' }
    },
    {
      label: '车龄(年)',
      key: 'carAge',
      type: 'input',
      props: { type: 'number', min: 0, disabled: addForm.value.buyExperience === '首购' }
    },
    {
      label: '里程(万公里)',
      key: 'mileage',
      type: 'input',
      props: { type: 'number', min: 0, disabled: addForm.value.buyExperience === '首购' }
    },
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
    }
  ])
  const addFormRules = computed(() => {
    const rules: Record<string, any[]> = {}

    // 字段通用必填策略：凡可填写（未禁用）且有值类型的，都必须填写
    const items = addFormItems.value
    const optionalKeys = new Set<string>([
      'focusModelName',
      'currentModel',
      'carAge',
      'mileage',
      'livingArea'
    ])
    for (const item of items) {
      if (!item || (item as any).type === 'divider') continue
      const key = (item as any).key as string
      if (!key) continue
      if (optionalKeys.has(key)) continue
      const disabled = Boolean((item as any).props?.disabled)

      // 特殊：二级渠道仅在有可选项时必填
      if (key === 'channelLevel2') {
        const opts = getChannelLevel2Options(String(addForm.value.channelLevel1))
        if (opts.length === 0) continue
      }

      // 特殊：成交车型在成交为“是”时必填
      if (key === 'dealModelName' && addForm.value.dealDone !== true) continue

      if (!disabled) {
        const isPicker = ['date', 'datetime', 'timepicker', 'select', 'cascader'].includes(
          String((item as any).type)
        )
        const msgPrefix = isPicker ? '请选择' : '请输入'
        const trigger = isPicker ? 'change' : 'blur'
        rules[key] = rules[key] || []
        rules[key].push({ required: true, message: `${msgPrefix}${(item as any).label}`, trigger })
      }
    }

    // 手机号：必须填写 + 格式校验
    rules.customerPhone = [
      { required: true, message: '请输入客户电话', trigger: 'blur' },
      { pattern: /^\d{11}$/, message: '请输入11位手机号', trigger: 'blur' }
    ]

    // 基本时间：必填
    rules.visitDate = [
      { required: true, message: '请选择到店日期', trigger: 'change' },
      { required: true, message: '请选择到店日期', trigger: 'blur' }
    ]
    rules.enterTime = [
      { required: true, message: '请选择进店时间', trigger: 'change' },
      { required: true, message: '请选择进店时间', trigger: 'blur' }
    ]
    rules.leaveTime = [
      { required: true, message: '请选择离店时间', trigger: 'change' },
      { required: true, message: '请选择离店时间', trigger: 'blur' }
    ]

    // 客户姓名：必填
    rules.customerName = [{ required: true, message: '请输入客户姓名', trigger: 'blur' }]

    // 销售顾问：仅在“销售接待”时必填
    rules.salesConsultant = [
      {
        validator: (_rule: any, value: any, callback: any) => {
          if (addForm.value.receptionStatus === 'sales' && !value)
            callback(new Error('请选择销售顾问'))
          else callback()
        },
        trigger: 'change'
      }
    ]

    // 邀约专员：仅在满足品牌与一级渠道条件时必填
    rules.inviter = [
      {
        validator: (_rule: any, value: any, callback: any) => {
          if (isInviterRequiredRef.value && !value) callback(new Error('请选择邀约专员'))
          else callback()
        },
        trigger: 'change'
      }
    ]

    // 年龄：必须 ≥ 18 岁
    rules.userAge = [
      { required: true, message: '请输入使用者年龄', trigger: 'blur' },
      {
        validator: (_rule: any, value: any, callback: any) => {
          const ageNum = Number(value)
          if (!Number.isFinite(ageNum)) return callback(new Error('请输入数字年龄'))
          if (ageNum < 18) return callback(new Error('年龄必须不小于18岁'))
          callback()
        },
        trigger: 'blur'
      }
    ]

    // 时间顺序：离店时间必须不早于进店时间
    const timeOrderValidator = (_rule: any, value: any, callback: any) => {
      const date = String(addForm.value.visitDate || '')
      const et = String(addForm.value.enterTime || '')
      const lt = String(addForm.value.leaveTime || '')
      // 若当前是 leaveTime 的校验，value 为最新值；兼容 enterTime 校验时使用已有 lt
      const curLt = typeof value === 'string' && _rule?.field === 'leaveTime' ? value : lt
      if (!date || !et || !curLt) return callback()
      const toISO = (d: string, t: string) => `${d} ${t}`.replace(' ', 'T')
      const s = new Date(toISO(date, et)).getTime()
      const e = new Date(toISO(date, curLt)).getTime()
      if (Number.isNaN(s) || Number.isNaN(e)) return callback()
      if (e < s) return callback(new Error('离店时间不能早于进店时间'))
      callback()
    }
    // 在两个字段上都挂载校验，确保任一时间变化都触发
    rules.leaveTime.push({ validator: timeOrderValidator, trigger: 'change' })
    rules.leaveTime.push({ validator: timeOrderValidator, trigger: 'blur' })
    rules.enterTime.push({ validator: timeOrderValidator, trigger: 'change' })
    rules.enterTime.push({ validator: timeOrderValidator, trigger: 'blur' })

    return rules
  })
  const resetAddForm = () => {
    // 重置 ArtForm 内部校验与字段
    try {
      addFormRef.value?.reset?.()
    } catch (e) {
      console.warn('重置表单失败', e)
    }
    // 恢复默认初始值
    addForm.value = initAddForm()
    editingId.value = null
  }
  const openAddDialog = () => {
    resetAddForm()
    // 若仅有一个可选门店，自动填充为默认
    const opts = storeOptions.value
    if (Array.isArray(opts) && opts.length === 1) {
      addForm.value.storeId = opts[0].value
    }
    try {
      const sid = Number(addForm.value.storeId || info.value?.storeId || 0)
      if (Number.isFinite(sid) && sid > 0) {
        // 初次打开新增弹窗时，按门店重建车型下拉，避免“未手动切换门店”导致下拉未刷新
        void productStore.loadProductsByStoreId(sid)
        void rebuildModelOptionsByStore(sid)
      }
    } catch (err) {
      void err
    }
    addDialogVisible.value = true
  }
  const fillEditForm = (row: ClueItem) => {
    // 从完整时间中拆出日期与时分
    const toHM = (t: string | undefined) => (t && t.includes(' ') ? t.split(' ')[1] : t || '')
    const toCascader = (v: any) =>
      Array.isArray(v) ? v : typeof v === 'string' && v ? v.split('/') : []
    const r = resolveClue(row)
    addForm.value = {
      ...initAddForm(),
      ...r,
      visitDate: r.visitDate,
      enterTime: toHM(r.enterTime),
      leaveTime: toHM(r.leaveTime),
      // 居住区域为级联选择器，编辑时需要将字符串拆分为数组
      livingArea: toCascader((r as any).livingArea)
    }
  }
  const submitAdd = async () => {
    await addFormRef.value?.validate?.()
    // 保留已有的 id，避免被 undefined 覆盖导致后端走“新增”路径
    const payload = {
      ...(addForm.value as any),
      ...(editingId.value ? { id: Number(editingId.value) } : {})
    } as any
    await fetchSaveClue(payload)
    ElMessage.success(editingId.value ? '更新线索成功' : '新增线索成功')
    await getData()
    addDialogVisible.value = false
    resetAddForm()
  }

  // 编辑与删除（本地模拟）
  const editRow = (row: ClueItem) => {
    editingId.value = row.id ? String(row.id) : null
    fillEditForm(row)
    addDialogVisible.value = true
  }
  const deleteRow = async (row: ClueItem) => {
    if (!row.id) {
      ElMessage.error('无有效ID，无法删除')
      return
    }
    await fetchDeleteClue(row.id as any)
    ElMessage.success('删除成功')
    await getData()
  }

  // 查看详情
  const detailVisible = ref(false)
  const currentDetail = ref<ClueItem | null>(null)
  const resolvedDetail = computed(() =>
    currentDetail.value ? resolveClue(currentDetail.value) : null
  )
  const viewDetail = (row: ClueItem) => {
    currentDetail.value = row
    detailVisible.value = true
  }

  // 导入处理
  const handleImportSuccess = (rows: any[]) => {
    // 字段映射（中文列名 -> 数据键）
    const mapped = rows.map((r, i) => ({
      id: String(i + 1),
      visitDate: r['到店日期'] || r['visitDate'],
      enterTime: r['进店时间'] || r['enterTime'],
      leaveTime: r['离店时间'] || r['leaveTime'],
      receptionDuration: r['接待时长(分钟)'] || r['receptionDuration'],
      visitorCount: Number(r['到店人数'] ?? r['visitorCount'] ?? 0),
      receptionStatus: parseReceptionStatus(r['接待情况'] || r['receptionStatus']),
      salesConsultant: r['销售顾问'] || r['salesConsultant'],
      customerName: r['客户姓名'] || r['customerName'],
      visitPurpose: r['到店事宜'] || r['visitPurpose'],
      isAddWeChat: parseYesNo(
        r['是否加微'] ?? r['是否留资'] ?? r['isAddWeChat'] ?? r['isReserved']
      ),
      visitCategory: r['到店分类'] || r['visitCategory'],
      customerPhone: r['客户电话'] || r['customerPhone'],
      focusModelId: parseInt(r['关注车型Id'] || r['关注车型'] || r['focusModelId']) || undefined,
      testDrive: parseYesNo(r['是否试驾'] ?? r['testDrive']),
      bargaining: parseYesNo(r['是否议价'] ?? r['bargaining']),
      dealDone: parseYesNo(r['是否成交'] ?? r['dealDone']),
      dealModelId: parseInt(r['成交车型Id'] || r['成交车型'] || r['dealModelId']) || undefined,
      businessSource: r['商机来源'] || r['businessSource'],
      channelCategory: r['渠道分类'] || r['channelCategory'],
      channelLevel1: r['一级渠道'] || r['channelLevel1'],
      channelLevel2: r['二级渠道'] || r['channelLevel2'],
      convertOrRetentionModel: r['转化/保客车型'] || r['convertOrRetentionModel'],
      referrer: r['推荐人'] || r['referrer'],
      contactTimes: Number(r['接触次数'] ?? r['contactTimes'] ?? 0),
      opportunityLevel: r['商机级别'] || r['opportunityLevel'],
      userGender: r['使用者性别'] || r['userGender'],
      userAge: Number(r['使用者年龄'] ?? r['userAge'] ?? 0),
      buyExperience: r['购车经历'] || r['buyExperience'],
      userPhoneModel: r['使用手机'] || r['userPhoneModel'],
      currentBrand: r['现用品牌'] || r['currentBrand'],
      currentModel: r['现用车型'] || r['currentModel'],
      carAge: Number(r['车龄(年)'] ?? r['carAge'] ?? 0),
      mileage: Number(r['里程(万公里)'] ?? r['里程(公里)'] ?? r['mileage'] ?? 0),
      livingArea: parseLivingArea(r['居住区域'] ?? r['livingArea'])
    }))
    data.value = mapped as any
    ElMessage.success('导入成功')
  }
  const handleImportError = (error: Error) => {
    ElMessage.error(`导入失败：${error.message}`)
  }

  // 自动计算接待时长
  const normalizeDate = (val: string) => {
    // 将 'YYYY-MM-DD HH:mm' 规范为 ISO 格式 'YYYY-MM-DDTHH:mm'
    if (!val) return ''
    return val.includes('T') ? val : val.replace(' ', 'T')
  }
  const calcDuration = (start: string, end: string) => {
    if (!start || !end) return 0
    const s = new Date(normalizeDate(start)).getTime()
    const e = new Date(normalizeDate(end)).getTime()
    if (isNaN(s) || isNaN(e) || e <= s) return 0
    return Math.round((e - s) / 60000) // 分钟
  }
  watch(
    () => [addForm.value.visitDate, addForm.value.enterTime, addForm.value.leaveTime],
    ([date, et, lt]) => {
      const start = date && et ? `${date} ${et}` : ''
      const end = date && lt ? `${date} ${lt}` : ''
      addForm.value.receptionDuration = calcDuration(start, end)
    }
  )

  // 一级渠道联动：自动填写 渠道分类 与 商机来源
  watch(
    () => addForm.value.channelLevel1,
    (l1) => {
      const meta = channelMetaByL1Ref.value[String(l1)]
      if (meta) {
        addForm.value.channelCategory = meta.category
        addForm.value.businessSource = meta.businessSource
      } else {
        // 后端未返回时的兜底规则
        const onlineL1 = ['DCC/ADC到店', '新媒体开发']
        addForm.value.channelCategory = onlineL1.includes(String(l1)) ? '线上' : '线下'
        const naturalL1 = ['展厅到店', 'ADC到店', '车展外展', 'DCC/ADC到店']
        addForm.value.businessSource = naturalL1.includes(String(l1)) ? '自然到店' : '主动开发'
      }

      // 限制并清空：转化/保客车型 / 一级推荐人 / 推荐人
      const l1str = String(l1)
      if (!ALLOWED_PRIMARY_REFERRER.includes(l1str)) {
        addForm.value.convertOrRetentionModel = ''
      }
      if (!ALLOWED_REFERRER.includes(l1str)) {
        addForm.value.referrer = ''
      }
    },
    { immediate: true }
  )

  // 购车经历为首购时禁用并清空品牌/车型/车龄/里程
  watch(
    () => addForm.value.buyExperience,
    (v) => {
      if (String(v) === '首购') {
        addForm.value.currentBrand = ''
        addForm.value.currentModel = ''
        addForm.value.carAge = 0
        addForm.value.mileage = 0
      }
    },
    { immediate: true }
  )

  // 接待情况联动：仅“销售接待”时需要填写销售顾问；否则禁用并清空
  watch(
    () => addForm.value.receptionStatus,
    (v) => {
      if (String(v) !== 'sales') {
        addForm.value.salesConsultant = ''
      }
    },
    { immediate: true }
  )

  // 门店树与邀约必填逻辑（前置初始化，避免后续 watch 访问未初始化变量）
  // 加载门店树（用于选择归属门店）
  const loadDeptTree = async () => {
    try {
      const res = await fetchGetDepartmentList({})
      const tree = Array.isArray(res as any) ? (res as any as any[]) : (res as any)?.data || []
      deptTree.value = Array.isArray(tree) ? tree : []
    } catch {
      deptTree.value = []
    }
  }
  onMounted(loadDeptTree)
  const deptTree = ref<any[]>([])
  // Admin/Super/Info 视为不受门店绑定限制的管理类角色
  const isAdminLike = computed(() => {
    const roles: string[] = Array.isArray((info.value as any)?.roles)
      ? ((info.value as any).roles as string[])
      : []
    return roles.some((r) => ['R_ADMIN', 'R_SUPER', 'R_INFO'].includes(String(r)))
  })
  const storeOptions = computed(() => {
    const res: { label: string; value: number }[] = []
    const walk = (n: any) => {
      if (n.type === 'store') res.push({ label: n.name, value: n.id })
      if (Array.isArray(n.children)) n.children.forEach(walk)
    }
    deptTree.value.forEach(walk)
    // 统一为数字判断，避免后端返回字符串导致未过滤
    const myStoreIdNum = Number(info.value?.storeId as any)
    // 非管理类角色，若绑定了门店，则只显示该门店；管理类角色不做过滤
    if (!isAdminLike.value && Number.isFinite(myStoreIdNum) && myStoreIdNum > 0) {
      return res.filter((o) => Number(o.value) === myStoreIdNum)
    }
    return res
  })
  const storeNameById = computed(() => {
    const map: Record<number, string> = {}
    for (const o of storeOptions.value) map[o.value] = o.label
    return map
  })
  // 根据门店在部门树中的祖先品牌，判定是否需要邀约专员
  const findBrandNameOfStoreTop = (roots: any[], sid: number): string | undefined => {
    const dfs = (node: any, brandName?: string): string | undefined => {
      const curBrand = node?.type === 'brand' ? String(node?.name || '') : brandName
      if (node?.type === 'store' && Number(node?.id) === sid) return curBrand
      const children = Array.isArray(node?.children) ? node.children : []
      for (const c of children) {
        const r = dfs(c, curBrand)
        if (r) return r
      }
      return undefined
    }
    for (const root of roots) {
      const got = dfs(root, undefined)
      if (got) return got
    }
    return undefined
  }
  const AUDI_BRANDS = ['上汽奥迪', '一汽奥迪']
  const INVITER_CHANNELS = ['垂媒', '新媒体开发']
  const isInviterRequiredRef = computed(() => {
    const sid = Number(
      typeof addForm.value.storeId === 'number'
        ? addForm.value.storeId
        : typeof info.value?.storeId === 'number'
          ? (info.value!.storeId as number)
          : 0
    )
    const brandName = findBrandNameOfStoreTop(deptTree.value, sid) || ''
    const l1 = String(addForm.value.channelLevel1 || '')
    return AUDI_BRANDS.includes(brandName) && INVITER_CHANNELS.includes(l1)
  })

  // 邀约专员联动：不满足条件时清空
  watch(
    () => [addForm.value.storeId, addForm.value.channelLevel1],
    () => {
      if (!isInviterRequiredRef.value) addForm.value.inviter = ''
    },
    { immediate: true, deep: true }
  )

  // 邀约专员必填触发时，主动加载邀约专员选项（避免出现“无数据”）
  watch(
    () => isInviterRequiredRef.value,
    (required) => {
      if (required && inviterOptions.value.length === 0) {
        loadInviters()
      }
    },
    { immediate: true }
  )

  // 是否成交联动：选择“是”则自动将商机级别设为 O，并禁用商机级别；选择“否”恢复可编辑
  watch(
    () => addForm.value.dealDone,
    (v) => {
      if (v === true) {
        addForm.value.opportunityLevel = 'O' as any
      }
    },
    { immediate: true }
  )

  // 门店变化时刷新员工选项
  watch(
    () => addForm.value.storeId,
    async (newId, oldId) => {
      const sidNum = Number(newId as any)
      if (Number.isFinite(sidNum) && sidNum > 0) {
        try {
          await productStore.loadProductsByStoreId(sidNum)
          await rebuildModelOptionsByStore(sidNum)
        } catch (err) {
          void err
        }
      }
      // 记录当前所选销售顾问，便于在编辑时保留
      const prevConsultant = addForm.value.salesConsultant
      await loadSalesConsultants()
      // 同步加载邀约专员
      const prevInviter = addForm.value.inviter
      await loadInviters()
      // 仅当门店发生变化且非编辑初始化时清空；编辑时尽量保留已选值
      const changed = Number(newId as any) !== Number(oldId as any)
      const isEditing = Boolean(editingId.value)
      if (changed) {
        if (isEditing && prevConsultant) {
          let exists = salesConsultantOptions.value.some(
            (o) => String(o.value) === String(prevConsultant)
          )
          // 编辑时若历史值不在当前选项中，动态补充该选项以保证显示
          if (!exists) {
            salesConsultantOptions.value.unshift({
              label: String(prevConsultant),
              value: String(prevConsultant)
            })
            exists = true
          }
          addForm.value.salesConsultant = exists ? prevConsultant : ''
        } else {
          // 非编辑或无已选值，切换门店后清空，避免跨店误选
          addForm.value.salesConsultant = ''
        }
        // 邀约专员同样按门店切换处理
        if (isEditing && prevInviter) {
          let exists2 = inviterOptions.value.some((o) => String(o.value) === String(prevInviter))
          if (!exists2) {
            inviterOptions.value.unshift({ label: String(prevInviter), value: String(prevInviter) })
            exists2 = true
          }
          addForm.value.inviter = exists2 ? prevInviter : ''
        } else {
          addForm.value.inviter = ''
        }
      } else if (isEditing && prevConsultant) {
        // 门店未变更但选项刚刷新时，若当前值未在可选项，则补充后保留
        let exists = salesConsultantOptions.value.some(
          (o) => String(o.value) === String(prevConsultant)
        )
        if (!exists) {
          salesConsultantOptions.value.unshift({
            label: String(prevConsultant),
            value: String(prevConsultant)
          })
          exists = true
        }
        addForm.value.salesConsultant = exists ? prevConsultant : ''
      }
      // 邀约专员：门店未变更但刷新选项时，保留旧值
      if (isEditing && prevInviter) {
        let exists2 = inviterOptions.value.some((o) => String(o.value) === String(prevInviter))
        if (!exists2) {
          inviterOptions.value.unshift({ label: String(prevInviter), value: String(prevInviter) })
          exists2 = true
        }
        addForm.value.inviter = exists2 ? prevInviter : ''
      }

      // 依据门店所属品牌，限定“转化/保客车型”的数据源
      const storeIdNum = Number(
        typeof addForm.value.storeId === 'number'
          ? addForm.value.storeId
          : typeof info.value?.storeId === 'number'
            ? (info.value!.storeId as number)
            : 0
      )
      if (!Number.isFinite(storeIdNum) || storeIdNum <= 0) return

      // 在部门树中定位该门店的所属品牌名称
      const findBrandNameOfStore = (roots: any[], sid: number): string | undefined => {
        const dfs = (node: any, brandName?: string): string | undefined => {
          const curBrand = node?.type === 'brand' ? String(node?.name || '') : brandName
          if (node?.type === 'store' && Number(node?.id) === sid) return curBrand
          const children = Array.isArray(node?.children) ? node.children : []
          for (const c of children) {
            const r = dfs(c, curBrand)
            if (r) return r
          }
          return undefined
        }
        for (const root of roots) {
          const got = dfs(root, undefined)
          if (got) return got
        }
        return undefined
      }

      // 若按门店已成功加载车型，则不再回退到“按品牌/分类”，避免跨品牌混入；
      // 仅当门店接口返回空列表时，才尝试按品牌/分类回退
      const brandName = findBrandNameOfStore(deptTree.value, storeIdNum)
      try {
        if ((productStore as any).products?.length === 0) {
          let categoryId: number | undefined
          if (brandName) {
            try {
              await categoryStore.loadFromApi()
            } catch (err) {
              console.warn('[categoryStore.loadFromApi] failed (dept store brand):', err)
            }
            const tree: any[] = (categoryStore as any).tree || []
            const node: any = tree.find((n: any) => n?.level === 1 && String(n?.name) === brandName)
            if (node && typeof node.id === 'number') categoryId = node.id
          }
          if (typeof categoryId === 'number') {
            await productStore.loadProductsByCategoryId(categoryId, true)
          } else if (brandName) {
            await productStore.loadProducts(brandName)
          }
          modelOptionsRef.value = nameOptions.value
        }
      } catch (e: any) {
        console.error('[convertOrRetentionModel] load by store brand failed:', e)
      }
    }
  )

  const parseYesNo = (v: any): boolean => {
    if (typeof v === 'boolean') return v
    if (v === '是' || v === 'yes' || v === 'true' || v === 'Y' || v === '1') return true
    return false
  }
  const parseReceptionStatus = (v: any): ClueItem['receptionStatus'] => {
    const map: Record<string, ClueItem['receptionStatus']> = {
      销售接待: 'sales',
      无人接待: 'none',
      不需接待: 'noNeed'
    }
    return map[v] || (['sales', 'none', 'noNeed'].includes(v) ? (v as any) : 'sales')
  }

  const parseLivingArea = (v: any): any => {
    if (!v) return []
    if (Array.isArray(v)) return v
    if (typeof v === 'string') return v.includes('/') ? v.split('/') : [v]
    return v
  }

  // 表格引用
  const tableRef = ref()

  // 搜索参数变化时，触发防抖的服务端分页搜索（保持页码重置为第1页）
  watch(
    () => searchForm.value,
    () => {
      try {
        ;(getDataDebounced as any)?.()
      } catch {
        // 兜底直接请求
        getData()
      }
    },
    { deep: true }
  )
  // 当用户仅有一个门店或已限制门店时，自动填充
  watch(
    () => storeOptions.value,
    (opts) => {
      const myStoreId = info.value?.storeId
      if (typeof myStoreId === 'number') {
        const hit = opts.find((o) => o.value === myStoreId)
        if (hit) addForm.value.storeId = Number(myStoreId)
      } else if (Array.isArray(opts) && opts.length === 1) {
        addForm.value.storeId = opts[0].value
      }
      // 门店选项初始化后也尝试加载员工列表
      loadSalesConsultants()
      loadInviters()
    },
    { immediate: true, deep: true }
  )
</script>

<style scoped>
  .clue-leads {
    padding: 20px;
  }

  .table-header-wrapper {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  /* 防止表单项标签换行，配合 :label-width="120" 使用 */
  .el-form-item__label {
    white-space: nowrap;
  }

  .table-tools > * {
    margin-right: 8px;
  }

  .table-tools .el-button {
    height: 28px;
  }
</style>
