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
          <div style="display: flex; gap: 6px; align-items: center; justify-content: center">
            <!-- 新增：眼睛图标查看详情 -->
            <ArtButtonTable type="view" @click="openDetailDrawer(row)" />
            <!-- 跟进记录与操作：更换为“更多”图标 -->
            <ArtButtonTable type="more" @click="openFollowDrawer(row)" />
            <!-- 编辑：已战败/已成交不可编辑 -->
            <ArtButtonTable
              type="edit"
              @click="editRow(row)"
              :style="{
                visibility: canEdit(row) ? 'visible' : 'hidden',
                pointerEvents: canEdit(row) ? 'auto' : 'none'
              }"
            />
            <ElPopconfirm title="确认删除该商机？" @confirm="deleteRow(row)">
              <template #reference>
                <ArtButtonTable type="delete" v-roles="['R_SUPER', 'R_ADMIN']" />
              </template>
            </ElPopconfirm>
          </div>
        </template>
      </ArtTable>
    </ElCard>

    <!-- 新增/编辑弹窗 -->
    <ElDialog v-model="dialogVisible" title="编辑商机" width="800px" destroy-on-close>
      <ElForm ref="formRef" :model="formModel" :rules="formRules" label-width="110px">
        <ElRow :gutter="12">
          <ElCol :span="12">
            <ElFormItem label="留档日期" prop="visitDate">
              <ElDatePicker
                v-model="formModel.visitDate"
                type="date"
                value-format="YYYY-MM-DD"
                placeholder="请选择留档日期"
                disabled
              />
            </ElFormItem>
          </ElCol>
          <ElCol :span="12">
            <ElFormItem label="销售顾问" prop="salesConsultant">
              <ElInput v-model="formModel.salesConsultant" placeholder="请输入销售顾问" disabled />
            </ElFormItem>
          </ElCol>
          <ElCol :span="12">
            <ElFormItem label="客户名称" prop="customerName">
              <ElInput v-model="formModel.customerName" placeholder="请输入客户名称" disabled />
            </ElFormItem>
          </ElCol>
          <ElCol :span="12">
            <ElFormItem label="电话" prop="customerPhone">
              <ElInput v-model="formModel.customerPhone" placeholder="请输入客户电话" disabled />
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
              <ElSelect v-model="formModel.channelLevel1" placeholder="请选择" disabled>
                <ElOption v-for="opt in channelLevel1Options" :key="opt.value" v-bind="opt" />
              </ElSelect>
            </ElFormItem>
          </ElCol>
          <ElCol :span="12">
            <ElFormItem label="购车经历" prop="buyExperience">
              <ElSelect v-model="formModel.buyExperience" placeholder="请选择" disabled>
                <ElOption v-for="opt in buyExperienceOptions" :key="opt.value" v-bind="opt" />
              </ElSelect>
            </ElFormItem>
          </ElCol>
          <ElCol :span="12">
            <ElFormItem label="现用车型" prop="currentModel">
              <ElInput v-model="formModel.currentModel" placeholder="请输入现用车型" disabled />
            </ElFormItem>
          </ElCol>
          <ElCol :span="12">
            <ElFormItem label="车龄(年)" prop="carAge">
              <ElInputNumber v-model="formModel.carAge" :min="0" disabled />
            </ElFormItem>
          </ElCol>
          <ElCol :span="12">
            <ElFormItem label="居住区域" prop="livingArea">
              <ElCascader
                v-model="formModel.livingArea"
                :options="cityCascaderOptionsRef"
                :props="{ value: 'label', label: 'label', children: 'children' }"
                placeholder="请选择省/市/区"
                disabled
              />
            </ElFormItem>
          </ElCol>
          <!-- 商机字段（关注车型/级别/试驾/议价）置于图二之后 -->
          <ElCol :span="12">
            <ElFormItem label="关注车型" prop="focusModelName">
              <ElSelect v-model="formModel.focusModelName" placeholder="请选择">
                <ElOption v-for="opt in modelOptionsRef" :key="opt.value" v-bind="opt" />
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
            <ElFormItem label="最新状态" prop="latestStatus">
              <ElSelect v-model="formModel.latestStatus" placeholder="请选择最新状态">
                <ElOption label="跟进中" value="跟进中" />
                <ElOption label="已战败" value="已战败" />
                <ElOption label="已成交" value="已成交" />
              </ElSelect>
            </ElFormItem>
          </ElCol>
          <ElCol :span="24">
            <ElFormItem
              label="战败原因"
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
                :rows="2"
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
    <ElDrawer v-model="followDrawerVisible" title="跟进记录与操作" size="80%" destroy-on-close>
      <div class="follow-panel">
        <div class="follow-form">
          <h4>跟进操作</h4>
          <ElForm ref="followFormRef" :model="followForm" :rules="followRules" label-width="110px">
            <ElFormItem label="跟进内容" prop="content">
              <ElInput
                v-model="followForm.content"
                type="textarea"
                :rows="3"
                placeholder="请输入跟进内容"
              />
            </ElFormItem>
            <ElFormItem label="跟进结果" prop="followResult">
              <ElInput
                v-model="followForm.followResult"
                type="textarea"
                :rows="2"
                placeholder="请输入本次跟进结果"
              />
            </ElFormItem>
            <ElFormItem label="下次联系时间" prop="nextContactTime">
              <ElDatePicker
                v-model="followForm.nextContactTime"
                type="datetime"
                value-format="YYYY-MM-DD HH:mm:ss"
                placeholder="选择下次联系时间"
                :disabled-date="(time) => time.getTime() < Date.now() - 8.64e7"
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
                <ArtButtonTable
                  v-if="!row.followResult"
                  type="edit"
                  @click="openEditFollowResult(row)"
                />
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
    <ElDialog
      v-model="followResultDialogVisible"
      title="编辑跟进结果"
      width="500px"
      destroy-on-close
    >
      <ElForm label-width="90px">
        <ElFormItem label="跟进结果">
          <ElInput
            v-model="editingFollowResult"
            type="textarea"
            :rows="3"
            placeholder="请填写本次跟进结果"
          />
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="followResultDialogVisible = false">取消</ElButton>
        <ElButton type="primary" @click="saveFollowResultOnly">保存</ElButton>
      </template>
    </ElDialog>
    <!-- 商机详情抽屉 -->
    <ElDrawer v-model="detailDrawerVisible" title="商机详情" size="50%" destroy-on-close>
      <ElDescriptions :column="2" border>
        <ElDescriptionsItem label="商机编码">{{ detailRow?.opportunityCode }}</ElDescriptionsItem>
        <ElDescriptionsItem label="商机状态">{{ detailRow?.latestStatus }}</ElDescriptionsItem>
        <ElDescriptionsItem label="商机级别">{{ detailRow?.opportunityLevel }}</ElDescriptionsItem>
        <ElDescriptionsItem label="客户姓名">{{ detailRow?.customerName }}</ElDescriptionsItem>
        <ElDescriptionsItem label="客户电话">{{ detailRow?.customerPhone }}</ElDescriptionsItem>
        <ElDescriptionsItem label="关注车型">{{ detailRow?.focusModelName }}</ElDescriptionsItem>
        <ElDescriptionsItem label="是否试驾">{{
          detailRow?.testDrive ? '是' : '否'
        }}</ElDescriptionsItem>
        <ElDescriptionsItem label="是否议价">{{
          detailRow?.bargaining ? '是' : '否'
        }}</ElDescriptionsItem>
        <ElDescriptionsItem label="一级渠道">{{ detailRow?.channelLevel1 }}</ElDescriptionsItem>
        <ElDescriptionsItem label="备注">{{ detailRow?.remark }}</ElDescriptionsItem>
        <ElDescriptionsItem label="留档日期">{{ detailRow?.visitDate }}</ElDescriptionsItem>
      </ElDescriptions>
    </ElDrawer>
    <!-- 客户选择弹窗：当存在多条匹配时提示选择 -->
    <ElDialog v-model="customerSelectVisible" title="选择客户" width="600px" destroy-on-close>
      <ElTable :data="customerCandidates" style="width: 100%">
        <ElTableColumn prop="userName" label="客户名称" min-width="120" />
        <ElTableColumn prop="userPhone" label="电话" min-width="130" />
        <ElTableColumn prop="storeId" label="门店ID" min-width="100" />
        <ElTableColumn label="操作" min-width="100">
          <template #default="{ row }">
            <ElButton type="primary" size="small" @click="chooseCustomer(row)">选择</ElButton>
          </template>
        </ElTableColumn>
      </ElTable>
    </ElDialog>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed, onMounted, watch } from 'vue'
  import { ElMessage } from 'element-plus'
  import ArtButtonTable from '@/components/core/forms/art-button-table/index.vue'
  import { regionData } from 'element-china-area-data'
  import { useTable } from '@/composables/useTable'
  import type { ColumnOption } from '@/types/component'
  import { useProductStore } from '@/store/modules/product'
  import { useProductCategoryStore } from '@/store/modules/productCategory'
  import { storeToRefs } from 'pinia'
  import { fetchChannelOptions } from '@/api/channel'
  import { useUserStore } from '@/store/modules/user'
  import {
    fetchGetOpportunityList,
    fetchSaveOpportunity,
    fetchDeleteOpportunity,
    fetchGetOpportunityFollowList,
    fetchSaveOpportunityFollow,
    fetchDeleteOpportunityFollow,
    fetchUpdateOpportunityFollowResult
  } from '@/api/opportunity'
  import { fetchGetCustomerList } from '@/api/customer'
  import { fetchGetModelsByStore } from '@/api/product'

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
    opportunityLevel: 'H' | 'A' | 'B' | 'C' | 'O'
    testDrive: boolean
    bargaining: boolean
    buyExperience: '首购' | '换购' | '增购'
    currentModel: string
    carAge: number
    livingArea: string[]
    latestStatus: '跟进中' | '已战败' | '已成交'
    defeatReasons: string[]
    remark: string
  }

  interface FollowUpRecord {
    id: string
    opportunityId: string
    opportunityName?: string
    content: string
    followResult: string
    nextContactTime: string
    status: string
    method: string
    createdAt: string
  }

  const searchRef = ref()
  const cityCascaderOptionsRef = ref<any[]>(regionData as any)

  const productStore = useProductStore()
  const { nameOptions } = storeToRefs(productStore)
  const modelOptionsRef = ref<Array<{ label: string; value: string | number }>>([
    { label: '全部车型', value: '' }
  ])
  const rebuildModelOptionsByStore = async (sidOverride?: number) => {
    const sid = Number(typeof sidOverride === 'number' ? sidOverride : (info.value as any)?.storeId)
    if (!Number.isFinite(sid) || sid <= 0) {
      modelOptionsRef.value = nameOptions.value
      return
    }
    try {
      const list = await fetchGetModelsByStore(sid)
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
  const categoryStore = useProductCategoryStore()
  const userStore = useUserStore()
  const { info } = storeToRefs(userStore)

  // 客户选择对话框（当同门店存在多条姓名+手机号匹配时处理）
  const customerSelectVisible = ref(false)
  const customerCandidates = ref<any[]>([])

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
          await rebuildModelOptionsByStore(sidNum)
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
        modelOptionsRef.value = nameOptions.value
      } catch (e: any) {
        void e
      }
    }
  )
  const dialogVisible = ref(false)
  watch(
    () => dialogVisible.value,
    (v) => {
      if (v) {
        const sid = Number((info.value as any)?.storeId)
        if (Number.isFinite(sid) && sid > 0) void rebuildModelOptionsByStore(sid)
      }
    }
  )
  const opportunityLevelOptions = [
    { label: 'H', value: 'H' },
    { label: 'A', value: 'A' },
    { label: 'B', value: 'B' },
    { label: 'C', value: 'C' },
    { label: 'O', value: 'O' }
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
      props: { options: modelOptionsRef }
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

  // 后端数据源切换：不再生成本地数据（移除 mockData）

  // 跟进记录本地数据源
  const formatDate = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  }
  const todayStr = () => formatDate(new Date())

  const followRecords = ref<FollowUpRecord[]>([])

  // 构建后端查询参数（仅映射支持的字段）
  const buildListQuery = (current: number, size: number): Api.Opportunity.SearchParams => {
    const q: Api.Opportunity.SearchParams = { current, size }
    const s = searchForm.value as any
    if (s.customerName) q.customerName = s.customerName
    if (s.customerPhone) q.customerPhone = s.customerPhone
    if (s.opportunityLevel) q.opportunityLevel = s.opportunityLevel
    if (s.latestStatus) q.status = s.latestStatus
    if (listMode.value === 'today') {
      const today = todayStr()
      q.daterange = [today, today]
    }
    return q
  }

  // 适配后端记录到现有UI模型
  const adaptOpportunity = (item: Api.Opportunity.Item): OpportunityItem => {
    const dateLike = String(item.openDate || item.latestVisitDate || item.createdAt || '')
    const visitDate = dateLike ? dateLike.slice(0, 10) : ''
    return {
      id: String(item.id),
      visitDate,
      salesConsultant: item.ownerName || '',
      customerName: item.customerName,
      customerPhone: item.customerPhone,
      opportunityCode: item.opportunityCode || '',
      channelLevel1: item.channelLevel1 || '',
      focusModelName: item.focusModelName || '',
      opportunityLevel: item.opportunityLevel as any,
      testDrive: !!item.testDrive,
      bargaining: !!item.bargaining,
      buyExperience: '' as any,
      currentModel: '',
      carAge: 0,
      livingArea: [],
      latestStatus: item.status as any,
      defeatReasons: [],
      remark: ''
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
        const q = buildListQuery(current, size)
        const page = await fetchGetOpportunityList(q)
        let list = (page.records || []).map(adaptOpportunity)
        const myName = info.value.userName || ''
        if (listMode.value === 'mine' && myName) {
          list = list.filter((r) => r.salesConsultant === myName)
        } else if (listMode.value === 'sub' && myName) {
          list = list.filter((r) => r.salesConsultant && r.salesConsultant !== myName)
        }
        return {
          records: list,
          total: page.total ?? list.length,
          current: page.current ?? current,
          size: page.size ?? size
        }
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
          formatter: (row: OpportunityItem) =>
            Array.isArray(row.livingArea) ? row.livingArea.join('/') : row.livingArea
        },
        { prop: 'latestStatus', label: '最新状态', width: 110 },
        {
          prop: 'defeatReasons',
          label: '战败原因',
          minWidth: 240,
          formatter: (row: OpportunityItem) =>
            Array.isArray(row.defeatReasons) ? row.defeatReasons.join('、') : row.defeatReasons
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
            cb(new Error('请填写战败原因'))
          } else cb()
        },
        trigger: 'change'
      }
    ]
  }))
  const editRow = async (row: OpportunityItem) => {
    editingId.value = row.id
    formModel.value = { ...row }
    dialogVisible.value = true
    // 根据手机号从客户信息表拉取个人信息并填充（禁用字段显示）
    try {
      const roles: string[] = Array.isArray((info.value as any)?.roles)
        ? ((info.value as any).roles as string[])
        : Array.isArray(userStore.getUserInfo.roles)
          ? (userStore.getUserInfo.roles as string[])
          : []
      const blockedRoles = ['R_SALES', 'R_SALES_MANAGER', 'R_APPOINTMENT', 'R_FRONT_DESK']
      const isBlocked = roles.some((r) => blockedRoles.includes(String(r)))
      if (isBlocked) {
        // 角色无权访问客户列表时不发起请求，直接使用商机内信息
        return
      }
      const q: any = {
        current: 1,
        size: 10,
        userName: row.customerName,
        userPhone: row.customerPhone
      }
      // 仅当用户有有效的门店ID时才传入 storeId，避免 0 导致查询为空
      const sid = Number((info.value as any)?.storeId)
      if (!Number.isNaN(sid) && sid > 0) {
        q.storeId = sid
      }
      const resp = await fetchGetCustomerList(q, { showErrorMessage: false })
      const list = Array.isArray(resp.records) ? resp.records : []
      if (list.length === 1) {
        const customer = list[0]
        applyCustomerToForm(customer)
      } else if (list.length > 1) {
        customerCandidates.value = list
        customerSelectVisible.value = true
      } else {
        // 未找到匹配客户，保持商机内信息
        ElMessage.info('未找到匹配客户，保留商机中的客户信息')
      }
    } catch (e) {
      console.error('[fetchGetCustomerList] failed:', e)
    }
  }
  const applyCustomerToForm = (customer: any) => {
    formModel.value.customerName = customer.userName
    formModel.value.customerPhone = customer.userPhone
    formModel.value.buyExperience = customer.buyExperience as any
    formModel.value.currentModel = customer.currentModel || ''
    formModel.value.carAge = Number(customer.carAge || 0)
    const area = customer.livingArea
    formModel.value.livingArea = Array.isArray(area)
      ? (area as string[])
      : String(area || '')
          .split('/')
          .filter(Boolean)
  }
  const chooseCustomer = (row: any) => {
    applyCustomerToForm(row)
    customerSelectVisible.value = false
  }
  const deleteRow = async (row: OpportunityItem) => {
    try {
      await fetchDeleteOpportunity(Number(row.id))
      ElMessage.success('删除成功')
      refreshData()
    } catch (e) {
      console.error('[fetchDeleteOpportunity] failed:', e)
      ElMessage.error('删除失败')
    }
  }
  // generateOpportunityCode 已不再使用，移除以避免未使用的变量报错
  const submitForm = async () => {
    if (!editingId.value) {
      ElMessage.error('不支持新增商机，请通过线索转商机或在列表中选择编辑')
      return
    }
    await formRef.value?.validate?.()
    // 统一解析关注车型：兼容选择的是“车型ID”或“车型名称”
    const rawFocus = formModel.value.focusModelName as any
    let focusModelIdResolved: number | undefined
    let focusModelNameResolved: string | undefined
    if (rawFocus !== undefined && rawFocus !== null && rawFocus !== '') {
      const num = Number(rawFocus)
      if (Number.isFinite(num)) {
        focusModelIdResolved = num
        const hit = modelOptionsRef.value.find((o) => Number(o.value) === num)
        focusModelNameResolved = hit ? String(hit.label) : undefined
      } else {
        focusModelNameResolved = String(rawFocus)
      }
    }

    const dataForSave: any = {
      id: Number(editingId.value),
      storeId: Number(info.value.storeId || 0),
      visitDate: formModel.value.visitDate,
      salesConsultant: formModel.value.salesConsultant,
      customerName: formModel.value.customerName,
      customerPhone: formModel.value.customerPhone,
      opportunityLevel: formModel.value.opportunityLevel,
      focusModelId: focusModelIdResolved,
      focusModelName: focusModelNameResolved,
      testDrive: !!formModel.value.testDrive,
      bargaining: !!formModel.value.bargaining,
      latestStatus: formModel.value.latestStatus,
      channelLevel1: formModel.value.channelLevel1
    }
    try {
      await fetchSaveOpportunity(dataForSave)
      dialogVisible.value = false
      refreshData()
    } catch (e) {
      console.error('[fetchSaveOpportunity] failed:', e)
    }
  }

  // 跟进抽屉与记录
  const followDrawerVisible = ref(false)
  const currentFollowOpportunityId = ref<string>('')
  const currentFollowOpportunityName = ref<string>('')
  const followFormRef = ref()
  const followForm = ref<{
    content: string
    followResult: string
    nextContactTime: string
    status: string
    method: string
  }>({
    content: '',
    followResult: '',
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
    followResult: [
      {
        validator: (_: any, value: any, cb: any) => {
          if (followForm.value.status !== '跟进中' && !value) {
            cb(new Error('请填写跟进结果'))
          } else cb()
        },
        trigger: 'blur'
      }
    ],
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
    if (followRecords.value.length > 0) {
      const last = followRecords.value[followRecords.value.length - 1]
      if (!String(last.followResult || '').trim()) {
        ElMessage.error('上一条跟进记录未填写跟进结果，请先在列表中通过“编辑结果”补充后再新增')
        return
      }
    }
    await followFormRef.value?.validate?.()
    const payload = {
      opportunityId: Number(currentFollowOpportunityId.value),
      content: followForm.value.content,
      followResult: followForm.value.followResult,
      nextContactTime: followForm.value.nextContactTime,
      status: followForm.value.status,
      method: followForm.value.method
    }
    const saved = await fetchSaveOpportunityFollow(payload)
    const newRecord: FollowUpRecord = {
      id: String(saved.id),
      opportunityId: String(saved.opportunityId),
      opportunityName: saved.opportunityName,
      content: saved.content,
      followResult: saved.followResult || '',
      nextContactTime: saved.nextContactTime,
      status: saved.status,
      method: saved.method,
      createdAt: saved.createdAt
    }
    followRecords.value = [...followRecords.value, newRecord]
    ElMessage.success('跟进保存成功')
    followForm.value = {
      content: '',
      followResult: '',
      nextContactTime: '',
      status: '跟进中',
      method: '电话'
    }
    refreshFollowData()
    // 同步刷新主列表，使“今日跟进商机”立即生效
    refreshData()
    // 若为今天，顶部“今日跟进商机”将自动包含
  }

  const deleteFollowRow = (row: FollowUpRecord) => {
    fetchDeleteOpportunityFollow(Number(row.id))
      .then((ok) => {
        if (ok) {
          const idx = followRecords.value.findIndex((r) => r.id === row.id)
          if (idx >= 0) followRecords.value.splice(idx, 1)
          ElMessage.success('删除成功')
          refreshFollowData()
        } else {
          ElMessage.error('删除失败')
        }
      })
      .catch(() => {
        ElMessage.error('删除失败')
      })
  }

  const editingFollowResult = ref('')
  const editingFollowId = ref<string | null>(null)
  const followResultDialogVisible = ref(false)
  const openEditFollowResult = (row: FollowUpRecord) => {
    if (String(row.followResult || '').trim()) {
      ElMessage.error('该跟进记录已填写结果，不能再次编辑')
      return
    }
    editingFollowId.value = row.id
    editingFollowResult.value = row.followResult || ''
    followResultDialogVisible.value = true
  }
  const saveFollowResultOnly = async () => {
    const idNum = Number(editingFollowId.value)
    if (!idNum || Number.isNaN(idNum)) {
      followResultDialogVisible.value = false
      return
    }
    const saved = await fetchUpdateOpportunityFollowResult({
      id: idNum,
      followResult: editingFollowResult.value
    })
    const idx = followRecords.value.findIndex((r) => r.id === String(saved.id))
    if (idx >= 0) {
      followRecords.value[idx] = {
        ...followRecords.value[idx],
        followResult: saved.followResult || ''
      }
    }
    ElMessage.success('跟进结果已更新')
    followResultDialogVisible.value = false
    refreshFollowData()
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
        const page = await fetchGetOpportunityFollowList({
          current,
          size,
          opportunityId: Number(currentFollowOpportunityId.value)
        })
        const mapped = page.records.map((r) => ({
          id: String(r.id),
          opportunityId: String(r.opportunityId),
          opportunityName: r.opportunityName,
          content: r.content,
          followResult: r.followResult || '',
          nextContactTime: r.nextContactTime,
          status: r.status,
          method: r.method,
          createdAt: r.createdAt
        }))
        followRecords.value = mapped
          .slice()
          .sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''))
        return {
          records: followRecords.value,
          total: page.total ?? followRecords.value.length,
          current: page.current ?? current,
          size: page.size ?? size
        }
      },
      apiParams: { current: 1, size: 10 },
      columnsFactory: (): ColumnOption<FollowUpRecord>[] => [
        { type: 'globalIndex', label: '序号', width: 80 },
        { prop: 'content', label: '跟进内容', minWidth: 180 },
        { prop: 'followResult', label: '跟进结果', minWidth: 180 },
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
  // 操作列编辑禁用逻辑
  const canEdit = (row: OpportunityItem) => {
    const s = String(row.latestStatus || '')
    return s !== '已战败' && s !== '已成交'
  }
  // 详情抽屉状态与方法
  const detailDrawerVisible = ref(false)
  const detailRow = ref<OpportunityItem | null>(null)
  const openDetailDrawer = (row: OpportunityItem) => {
    detailRow.value = row
    detailDrawerVisible.value = true
  }
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
    grid-template-columns: 360px minmax(0, 1fr);
    gap: 16px;
  }

  .follow-form h4 {
    margin: 0 0 8px;
  }

  .follow-table {
    overflow: auto;
  }
</style>
