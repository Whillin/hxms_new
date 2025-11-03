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
      <ArtTableHeader
        v-model:columns="columnChecks"
        :loading="loading"
        layout="refresh,columns"
        :showHeaderBackground="false"
        @refresh="refreshData"
      >
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
          <ElCascader
            v-model="editForm.livingArea"
            :options="cityCascaderOptionsRef"
            :props="{ checkStrictly: true }"
            placeholder="请选择省/市/区"
          />
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
  import {
    fetchGetCustomerList,
    fetchSaveCustomer,
    fetchDeleteCustomer,
    fetchGetCustomerStoreOptions
  } from '@/api/customer'

  defineOptions({ name: 'CustomerList' })

  interface CustomerItem {
    id: number
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
    livingArea: undefined as any,
    storeId: undefined as any
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

  // 门店选项：仅加载后端允许的门店
  const storeOptionsRef = ref<{ label: string; value: number }[]>([])
  const loadStoreOptions = async () => {
    try {
      const res = await fetchGetCustomerStoreOptions()
      const list = Array.isArray(res) ? res : (res as any)?.data || []
      storeOptionsRef.value = list.map((s: any) => ({ label: s.name, value: s.id }))
    } catch {
      storeOptionsRef.value = []
    }
  }
  loadStoreOptions()
  const storeOptions = computed(() => storeOptionsRef.value)
  const storeNameById = computed(() => {
    const map: Record<number, string> = {}
    for (const o of storeOptionsRef.value) map[o.value] = o.label
    return map
  })

  const searchItems = computed(() => [
    { label: '客户姓名', key: 'userName', type: 'input' },
    { label: '客户电话', key: 'userPhone', type: 'input' },
    {
      label: '归属门店',
      key: 'storeId',
      type: 'select',
      props: { options: storeOptions.value, clearable: true, placeholder: '请选择门店' }
    },
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
    {
      label: '现用品牌',
      key: 'currentBrand',
      type: 'select',
      props: { options: currentBrandOptions }
    },
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

  // 已切换到后端分页接口 /api/customer/list

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
        const res = await fetchGetCustomerList(params as any)
        return { records: res.records as any, total: res.total, current, size }
      },
      apiParams: { current: 1, size: 10 },
      columnsFactory: (): ColumnOption<CustomerItem>[] => [
        { type: 'globalIndex', label: '序号', width: 80 },
        { prop: 'userName', label: '客户姓名', minWidth: 140 },
        { prop: 'userPhone', label: '客户电话', minWidth: 140 },
        {
          prop: 'storeId',
          label: '归属门店',
          width: 140,
          formatter: (row: any) => {
            const id = Number((row as any).storeId)
            const name = storeNameById.value[id]
            return name || (Number.isFinite(id) ? String(id) : '-')
          }
        },
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
          formatter: (row: CustomerItem) =>
            Array.isArray(row.livingArea) ? row.livingArea.join('/') : row.livingArea
        },
        {
          prop: 'operation',
          label: '操作',
          width: 220,
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
      userName: undefined,
      userPhone: undefined,
      userGender: undefined,
      userAge: undefined,
      buyExperience: undefined,
      currentBrand: undefined,
      currentModel: undefined,
      livingArea: undefined,
      storeId: undefined
    }
    getData()
  }

  // 行内操作
  const handleRowEdit = (row: CustomerItem) => {
    // 显式确保 id 为数字类型，避免后续校验与后端查询失败
    editForm.value = { ...row, id: Number((row as any).id) }
    dialogVisible.value = true
  }
  const handleRowDelete = async (row: CustomerItem) => {
    try {
      await fetchDeleteCustomer(Number(row.id), { showSuccessMessage: true })
      refreshData()
    } catch {
      ElMessage.error('删除失败')
    }
  }

  const submitEdit = async () => {
    if (!editForm.value?.id) {
      ElMessage.error('保存失败，未找到该记录')
      return
    }
    const payload = {
      id: Number(editForm.value.id),
      userName: String(editForm.value.userName || ''),
      userPhone: String(editForm.value.userPhone || ''),
      userGender: String(editForm.value.userGender || '未知') as any,
      userAge: Number(editForm.value.userAge || 0),
      buyExperience: String(editForm.value.buyExperience || '首购') as any,
      userPhoneModel: editForm.value.userPhoneModel || '',
      currentBrand: editForm.value.currentBrand || '',
      currentModel: editForm.value.currentModel || '',
      carAge: Number(editForm.value.carAge || 0),
      mileage: Number(editForm.value.mileage || 0),
      livingArea: Array.isArray(editForm.value.livingArea)
        ? (editForm.value.livingArea as string[]).join('/')
        : String(editForm.value.livingArea || '')
    }
    try {
      await fetchSaveCustomer(payload, { showSuccessMessage: true })
      dialogVisible.value = false
      refreshData()
    } catch {
      ElMessage.error('保存失败')
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
    display: flex;
    flex: 1;
    flex-direction: column;
  }
</style>
