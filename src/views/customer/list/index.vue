<template>
  <div class="customer-list-page art-full-height">
    <ArtSearchBar
      ref="searchRef"
      v-model="searchForm"
      :items="searchItems"
      :is-expand="false"
      :show-expand="true"
      :label-width="100"
      @search="handleSearch"
      @reset="handleReset"
    />

    <ElCard class="art-table-card" shadow="never">
      <ArtTableHeader v-model:columns="columnChecks" :loading="loading" @refresh="refreshData">
        <template #left>
          <ElSpace wrap>
            <ElButton type="primary" @click="refreshData">刷新</ElButton>
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
            <ArtButtonTable type="edit" @click="handleRowEdit(row)" v-auth="'edit'" />
            <ElPopconfirm title="确认删除该客户？" @confirm="handleRowDelete(row)">
              <template #reference>
                <ArtButtonTable type="delete" v-auth="'delete'" />
              </template>
            </ElPopconfirm>
          </div>
        </template>
      </ArtTable>
  </ElCard>
  <!-- 编辑弹窗 -->
  <ElDialog v-model="dialogVisible" title="编辑客户" width="600px" destroy-on-close>
    <ElForm :model="editForm" label-width="100px">
      <ElFormItem label="客户姓名">
        <ElInput v-model="editForm.userName" placeholder="请输入客户姓名" />
      </ElFormItem>
      <ElFormItem label="客户电话">
        <ElInput v-model="editForm.userPhone" placeholder="请输入客户电话" />
      </ElFormItem>
      <ElFormItem label="使用者性别">
        <ElSelect v-model="editForm.userGender" placeholder="请选择性别">
          <ElOption label="男" value="男" />
          <ElOption label="女" value="女" />
          <ElOption label="未知" value="未知" />
        </ElSelect>
      </ElFormItem>
      <ElFormItem label="使用者年龄">
        <ElInputNumber v-model="editForm.userAge" :min="0" />
      </ElFormItem>
      <ElFormItem label="购车经历">
        <ElSelect v-model="editForm.buyExperience" placeholder="请选择购车经历">
          <ElOption label="首购" value="首购" />
          <ElOption label="换购" value="换购" />
          <ElOption label="增购" value="增购" />
        </ElSelect>
      </ElFormItem>
      <ElFormItem label="使用手机">
        <ElSelect v-model="editForm.userPhoneModel" placeholder="请选择手机品牌">
          <ElOption v-for="opt in phoneBrandOptions" :key="opt.value" v-bind="opt" />
        </ElSelect>
      </ElFormItem>
      <ElFormItem label="现用品牌">
        <ElSelect v-model="editForm.currentBrand" placeholder="请选择品牌">
          <ElOption v-for="opt in currentBrandOptions" :key="opt.value" v-bind="opt" />
        </ElSelect>
      </ElFormItem>
      <ElFormItem label="现用车型">
        <ElInput v-model="editForm.currentModel" placeholder="请输入车型" />
      </ElFormItem>
      <ElFormItem label="车龄(年)">
        <ElInputNumber v-model="editForm.carAge" :min="0" />
      </ElFormItem>
      <ElFormItem label="里程(万公里)">
        <ElInputNumber v-model="editForm.mileage" :min="0" :step="0.1" />
      </ElFormItem>
      <ElFormItem label="居住区域">
        <ElCascader v-model="editForm.livingArea" :options="cityCascaderOptionsRef" :props="{ checkStrictly: true }" placeholder="请选择省/市/区" />
      </ElFormItem>
    </ElForm>
    <template #footer>
      <ElButton @click="dialogVisible = false">取消</ElButton>
      <ElButton type="primary" @click="submitEdit">保存</ElButton>
    </template>
  </ElDialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import ArtButtonTable from '@/components/core/forms/art-button-table/index.vue'
import { regionData } from 'element-china-area-data'
import { useTable } from '@/composables/useTable'
import type { ColumnOption } from '@/types/component'

defineOptions({ name: 'CustomerList' })

interface CustomerItem {
  id: string
  userName: string
  userPhone: string
  userGender: '男' | '女' | '未知'
  userAge: number
  buyExperience: '首购' | '换购' | '增购'
  userPhoneModel: string
  currentBrand: string
  currentModel: string
  carAge: number
  mileage: number
  livingArea: string[] | string
}

const searchRef = ref()
const dialogVisible = ref(false)
const editForm = ref<Partial<CustomerItem>>({})
const searchForm = ref({
  userName: undefined as any,
  userPhone: undefined as any,
  userGender: undefined as any,
  userAge: undefined as any,
  buyExperience: undefined as any,
  currentBrand: undefined as any,
  currentModel: undefined as any,
  livingArea: undefined as any
})

// 手机品牌选项（复用线索页风格）
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

// 现用品牌选项（复用线索页风格）
const currentBrandOptions = [
  { label: '奥迪', value: '奥迪' },
  { label: '宝马', value: '宝马' },
  { label: '奔驰', value: '奔驰' },
  { label: '比亚迪', value: '比亚迪' },
  { label: '理想', value: '理想' },
  { label: '特斯拉', value: '特斯拉' },
  { label: '大众', value: '大众' },
  { label: '丰田', value: '丰田' },
  { label: '本田', value: '本田' },
  { label: '现代', value: '现代' }
]

const cityCascaderOptionsRef = ref<any[]>(regionData as any)

const searchItems = computed(() => [
  { label: '客户姓名', key: 'userName', type: 'input' },
  { label: '客户电话', key: 'userPhone', type: 'input' },
  {
    label: '使用者性别',
    key: 'userGender',
    type: 'select',
    props: {
      options: [
        { label: '男', value: '男' },
        { label: '女', value: '女' },
        { label: '未知', value: '未知' }
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
  { label: '现用品牌', key: 'currentBrand', type: 'select', props: { options: currentBrandOptions } },
  { label: '现用车型', key: 'currentModel', type: 'input' },
  {
    label: '居住区域',
    key: 'livingArea',
    type: 'cascader',
    props: {
      options: cityCascaderOptionsRef.value,
      placeholder: '请选择省/市/区',
      clearable: true,
      collapseTags: true,
      maxCollapseTags: 1
    }
  }
])

// 本地客户数据源（支持编辑/删除持久化到当前会话）
const generateMockData = (): CustomerItem[] =>
  Array.from({ length: 60 }, (_, i) => ({
    id: String(i + 1),
    userName: ['张三', '李四', '王五', '赵六'][i % 4],
    userPhone: `138${String(10000000 + i).slice(0, 8)}`,
    userGender: (['男', '女', '未知'] as const)[i % 3],
    userAge: 20 + (i % 30),
    buyExperience: (['首购', '换购', '增购'] as const)[i % 3],
    userPhoneModel: ['苹果', '华为', '小米', '三星'][i % 4],
    currentBrand: ['奥迪', '宝马', '奔驰', '比亚迪', '理想'][i % 5],
    currentModel: ['A4L', 'Q5', '3系', 'C级'][i % 4],
    carAge: i % 8,
    mileage: (i % 20) * 1.5,
    livingArea: ['北京市/朝阳区', '上海市/浦东新区', '广东省/广州市/天河区'][i % 3].split('/')
  }))

const mockData = ref<CustomerItem[]>(generateMockData())

// 本地模拟分页接口（基于 mockData）
const mockApi = async (
  params: any
): Promise<Api.Common.PaginatedResponse<CustomerItem>> => {
  let filtered = mockData.value
  if (params.userName) filtered = filtered.filter((r) => (r.userName || '').includes(params.userName))
  if (params.userPhone) filtered = filtered.filter((r) => (r.userPhone || '').includes(params.userPhone))
  if (params.userGender) filtered = filtered.filter((r) => r.userGender === params.userGender)
  if (params.userAge !== undefined && params.userAge !== null && params.userAge !== '')
    filtered = filtered.filter((r) => r.userAge === Number(params.userAge))
  if (params.buyExperience)
    filtered = filtered.filter((r) => r.buyExperience === params.buyExperience)
  if (params.currentBrand)
    filtered = filtered.filter((r) => r.currentBrand === params.currentBrand)
  if (params.currentModel)
    filtered = filtered.filter((r) => (r.currentModel || '').includes(params.currentModel))
  if (Array.isArray(params.livingArea) && params.livingArea.length) {
    const target = params.livingArea.join('/')
    filtered = filtered.filter((r) => {
      const val = Array.isArray(r.livingArea) ? r.livingArea.join('/') : r.livingArea
      return String(val).startsWith(target)
    })
  }

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
    }: Api.Common.CommonSearchParams): Promise<Api.Common.PaginatedResponse<CustomerItem>> => {
        const params = { current, size, ...searchForm.value }
      const res = await mockApi(params)
      return { records: res.records, total: res.total, current, size }
    },
    apiParams: { current: 1, size: 10 },
    columnsFactory: (): ColumnOption<CustomerItem>[] => [
      { type: 'globalIndex', label: '序号', width: 80 },
      { prop: 'userName', label: '客户姓名', minWidth: 140 },
      { prop: 'userPhone', label: '客户电话', minWidth: 140 },
      { prop: 'userGender', label: '使用者性别', width: 100 },
      { prop: 'userAge', label: '使用者年龄', width: 110 },
      { prop: 'buyExperience', label: '购车经历', width: 100 },
      { prop: 'userPhoneModel', label: '使用手机', minWidth: 120 },
      { prop: 'currentBrand', label: '现用品牌', minWidth: 120 },
      { prop: 'currentModel', label: '现用车型', minWidth: 120 },
      { prop: 'carAge', label: '车龄(年)', width: 100 },
      { prop: 'mileage', label: '里程(万公里)', width: 120 },
      {
        prop: 'livingArea',
        label: '居住区域',
        minWidth: 180,
        formatter: (row: CustomerItem, _c: any, v: any) => (Array.isArray(v) ? v.join('/') : v)
      },
      { prop: 'operation', label: '操作', width: 220, align: 'center', fixed: 'right', useSlot: true }
    ]
  }
})

const handleSearch = () => {
  getData()
}
const handleReset = () => {
  searchForm.value = {
    userName: undefined,
    userPhone: undefined,
    userGender: undefined,
    userAge: undefined,
    buyExperience: undefined,
    currentBrand: undefined,
    currentModel: undefined,
    livingArea: undefined
  }
  getData()
}

// 行内操作
const handleRowEdit = (row: CustomerItem) => {
  editForm.value = { ...row }
  dialogVisible.value = true
}
const handleRowDelete = (row: CustomerItem) => {
  const idx = mockData.value.findIndex((r) => r.id === row.id)
  if (idx > -1) {
    mockData.value.splice(idx, 1)
    ElMessage.success('删除成功')
    refreshData()
  } else {
    ElMessage.error('删除失败，未找到该记录')
  }
}

const submitEdit = () => {
  const idx = mockData.value.findIndex((r) => r.id === editForm.value?.id)
  if (idx > -1) {
    // 规范化数值与区域字段，保持数据类型一致
    const payload = {
      ...mockData.value[idx],
      ...(editForm.value as CustomerItem),
      userAge: Number((editForm.value as CustomerItem).userAge ?? mockData.value[idx].userAge),
      carAge: Number((editForm.value as CustomerItem).carAge ?? mockData.value[idx].carAge),
      mileage: Number((editForm.value as CustomerItem).mileage ?? mockData.value[idx].mileage),
      livingArea: Array.isArray((editForm.value as CustomerItem).livingArea)
        ? ((editForm.value as CustomerItem).livingArea as string[])
        : String((editForm.value as CustomerItem).livingArea || '').split('/').filter(Boolean)
    } as CustomerItem
    mockData.value[idx] = payload
    ElMessage.success('保存成功')
    dialogVisible.value = false
    refreshData()
  } else {
    ElMessage.error('保存失败，未找到该记录')
  }
}
</script>

<style scoped>
.customer-list-page {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.art-table-card {
  flex: 1;
  display: flex;
  flex-direction: column;
}
</style>
