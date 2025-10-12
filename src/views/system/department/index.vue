<template>
  <div class="department-page art-full-height">
    <DepartmentSearch
      v-show="showSearchBar"
      v-model="searchForm"
      @search="handleSearch"
      @reset="resetSearchParams"
    />

    <ElCard
      class="art-table-card"
      shadow="never"
      :style="{ 'margin-top': showSearchBar ? '12px' : '0' }"
    >
      <ArtTableHeader
        id="art-table-header"
        v-model:columns="columnChecks"
        v-model:showSearchBar="showSearchBar"
        :loading="loading"
        layout="search,refresh,fullscreen,columns"
        fullClass="art-table-card"
        @refresh="refreshData"
      >
        <template #left>
          <ElSpace wrap>
            <ElButton type="primary" @click="showDialog('add')" v-ripple>
              <ElIcon><Plus /></ElIcon>
              新增部门
            </ElButton>
            <ElButton @click="toggleExpand" v-ripple>
              <ElIcon>
                <Fold v-if="isExpanded" />
                <Expand v-else />
              </ElIcon>
              {{ isExpanded ? '收起' : '展开' }}
            </ElButton>
          </ElSpace>
        </template>
      </ArtTableHeader>

      <ArtTable
        ref="tableRef"
        :loading="loading"
        :data="data"
        :columns="columns"
        :pagination="pagination"
        size="small"
        :border="true"
        :stripe="true"
        :pagination-options="{ size: 'small' }"
        rowKey="id"
        :treeProps="{ children: 'children' }"
        @pagination:size-change="handleSizeChange"
        @pagination:current-change="handleCurrentChange"
      >
        <template #operation="{ row }">
          <ElSpace>
            <ElButton size="small" type="primary" link @click="showChildAdd(row)">
              <ElIcon><Plus /></ElIcon>
              新增子部门
            </ElButton>
            <ElButton size="small" type="primary" link @click="showDialog('edit', row)">
              <ElIcon><Edit /></ElIcon>
              编辑
            </ElButton>
            <ElPopconfirm title="确认删除该部门？" @confirm="handleDelete(row)">
              <template #reference>
                <ElButton size="small" type="danger" link>
                  <ElIcon><Delete /></ElIcon>
                  删除
                </ElButton>
              </template>
            </ElPopconfirm>
          </ElSpace>
        </template>
      </ArtTable>

      <DepartmentDialog
        v-model:visible="dialogVisible"
        :type="dialogType"
        :dept-data="currentDeptData"
        @submit="handleDialogSubmit"
      />
    </ElCard>
  </div>
</template>

<script setup lang="ts">
  import { useTable } from '@/composables/useTable'
  import { fetchGetDepartmentList } from '@/api/system-manage'
  import DepartmentSearch from './modules/department-search.vue'
  import DepartmentDialog from './modules/department-dialog.vue'
  import { h } from 'vue'
  import { Plus, Edit, Delete, Fold, Expand } from '@element-plus/icons-vue'
  import { ElMessage } from 'element-plus'

  defineOptions({ name: 'Department' })

  type DepartmentItem = Api.SystemManage.DepartmentItem

  const dialogType = ref<Form.DialogType>('add')
  const dialogVisible = ref(false)
  const currentDeptData = ref<Partial<DepartmentItem>>({})
  const showSearchBar = ref(true)
  const tableRef = ref<any>(null)
  const isExpanded = ref(false)

  const searchForm = ref<Api.SystemManage.DepartmentSearchParams>({
    name: undefined,
    type: undefined,
    brand: undefined,
    region: undefined,
    store: undefined,
    enabled: undefined,
    current: 1,
    size: 20
  })

  const {
    columns,
    columnChecks,
    data,
    loading,
    pagination,
    getData,
    searchParams,
    resetSearchParams,
    handleSizeChange,
    handleCurrentChange,
    refreshData
  } = useTable<DepartmentItem>({
    core: {
      apiFn: fetchGetDepartmentList,
      apiParams: { ...searchForm.value },
      excludeParams: [],
      columnsFactory: () => [
        { type: 'index', width: 60, label: '序号' },
        { prop: 'name', label: '名称' },
        { prop: 'type', label: '类型' },
        { prop: 'brand', label: '品牌' },
        { prop: 'region', label: '区域' },
        { prop: 'store', label: '门店' },
        { prop: 'enabled', label: '启用', formatter: (row) => (row.enabled ? '是' : '否') },
        { prop: 'createTime', label: '创建时间' },
        { prop: 'operation', label: '操作', width: 220, align: 'right' }
      ]
    }
  })

  const handleSearch = (params: Record<string, any>) => {
    Object.assign(searchParams, params)
    getData()
  }

  const showDialog = (type: Form.DialogType, row?: DepartmentItem) => {
    dialogType.value = type
    currentDeptData.value = row || {}
    nextTick(() => (dialogVisible.value = true))
  }

  const showChildAdd = (row: DepartmentItem) => {
    dialogType.value = 'add'
    currentDeptData.value = { parentId: row.id }
    nextTick(() => (dialogVisible.value = true))
  }

  const handleDelete = (row: DepartmentItem) => {
    ElMessage.info('删除功能开发中，暂不支持')
  }

  const toggleExpand = () => {
    isExpanded.value = !isExpanded.value
    nextTick(() => {
      const elTable = tableRef.value?.elTableRef
      if (!elTable || !data.value) return
      const processRows = (rows: DepartmentItem[]) => {
        rows.forEach((row) => {
          if (row.children?.length) {
            elTable.toggleRowExpansion(row, isExpanded.value)
            processRows(row.children as DepartmentItem[])
          }
        })
      }
      processRows(data.value as unknown as DepartmentItem[])
    })
  }

  const handleDialogSubmit = () => {
    dialogVisible.value = false
    currentDeptData.value = {}
    refreshData()
  }
</script>

<style lang="scss" scoped>
  .department-page {
  }
</style>

<style lang="scss" scoped>
  .department-page {
    h3 {
      margin: 0 0 12px;
      font-weight: 600;
      color: var(--art-text-gray-800);
    }
    :deep(.art-table-card) {
      border-radius: 10px;
      overflow: hidden;
    }
    :deep(.el-card__body) {
      padding: 12px 12px 8px;
    }
  }
</style>