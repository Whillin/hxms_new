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
              新增
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
        size="default"
        :border="false"
        :stripe="false"
        :pagination-options="{ size: 'small' }"
        rowKey="id"
        :treeProps="{ children: 'children' }"
        @pagination:size-change="handleSizeChange"
        @pagination:current-change="handleCurrentChange"
      >
        <template #enabled="{ row }">
          <ElTag size="small" :type="row.enabled ? 'success' : 'danger'">
            {{ row.enabled ? '启用' : '禁用' }}
          </ElTag>
        </template>
        <template #operation="{ row }">
          <ElSpace>
            <ElButton type="primary" @click="showDialog('edit', row)">
              <ElIcon><Edit /></ElIcon>
              编辑
            </ElButton>
            <ElPopconfirm title="确认删除该部门？" @confirm="handleDelete(row)">
              <template #reference>
                <ElButton type="danger">
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
        :dept-tree="data as any"
        @submit="handleDialogSubmit"
      />
    </ElCard>
  </div>
</template>

<script setup lang="ts">
  import { useTable } from '@/composables/useTable'
  import { fetchGetDepartmentList, fetchDeleteDepartment } from '@/api/system-manage'
  import DepartmentSearch from './modules/department-search.vue'
  import DepartmentDialog from './modules/department-dialog.vue'
  
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

  // 显示用的部门编号（基于 id）
  const buildDeptCode = (id: number) => String(id).padStart(4, '0')

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
        { prop: 'name', label: '名称', minWidth: 280, showOverflowTooltip: true },
        { prop: 'code', label: '编号', minWidth: 120 },
        { prop: 'enabled', label: '状态', minWidth: 120, useSlot: true },
        { prop: 'operation', label: '操作', width: 280, align: 'center', fixed: 'right', useSlot: true }
      ]
    },
    // 为数据添加显示编号
    transform: {
      dataTransformer: (records: any[]) => {
        if (!Array.isArray(records)) return []
        const enhance = (nodes: any[]): any[] =>
          nodes.map((item) => {
            const enhanced: any = {
              ...item,
              code: buildDeptCode(item.id)
            }
            if (Array.isArray(enhanced.children) && enhanced.children.length) {
              enhanced.children = enhance(enhanced.children)
            }
            return enhanced
          })
        return enhance(records)
      }
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

  // 行内新增已移除，统一使用顶部“新增”按钮

  const handleDelete = async (row: DepartmentItem) => {
    try {
      await fetchDeleteDepartment(Number(row.id))
      ElMessage.success('删除成功')
      refreshData()
    } catch (err: any) {
      const msg = err?.message || '删除失败'
      ElMessage.error(msg)
    }
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
    :deep(.el-table) {
      --el-table-row-height: 44px;
    }
    :deep(.el-table__body td:first-child .cell) {
      white-space: nowrap;
    }
    :deep(.el-table .cell) {
      padding-left: 8px;
      padding-right: 8px;
    }
  }
</style>