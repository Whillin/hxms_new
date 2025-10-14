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
          <div style="text-align: right">
            <ArtButtonTable type="edit" @click="showDialog('edit', row)" />
            <ElPopconfirm title="确认删除该部门？" @confirm="handleDelete(row)">
              <template #reference>
                <ArtButtonTable type="delete" />
              </template>
            </ElPopconfirm>
          </div>
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
  import ArtButtonTable from '@/components/core/forms/art-button-table/index.vue'

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

  // 显示用的部门层级编码：父短子长，纯数字分段
  // 规则（不含英文前缀）：
  // - 品牌：<bb>
  // - 销售部门：<bb>
  // - 区域：<bb><rr>
  // - 门店：<bb><rr><ss>
  // 其中 <bb>/<rr>/<ss> 为两位序号（01起），在同一父级内按出现顺序生成
  const pad2 = (n: number) => String(n).padStart(2, '0')

  function buildHierCodes(records: any[]): any[] {
    if (!Array.isArray(records)) return []

    // 顶层一般为集团
    const enhanceGroup = (nodes: any[]) =>
      nodes.map((groupNode) => {
        const gEnhanced = { ...groupNode }
        const brandChildren = Array.isArray(gEnhanced.children)
          ? gEnhanced.children.filter((c: any) => c.type === 'brand')
          : []
        // 为品牌生成序号（两位）
        brandChildren.forEach((brand: any, bIdx: number) => {
          const bb = pad2(bIdx + 1)
          const bEnhanced: any = { ...brand, code: `${bb}` }

          // 品牌下销售部门（唯一），编码 DEP-<bb>
          const deptNode = Array.isArray(bEnhanced.children)
            ? bEnhanced.children.find((c: any) => c.type === 'department')
            : null
          if (deptNode) {
            const dEnhanced: any = { ...deptNode, code: `${bb}` }
            // 销售部门下区域：REG-<bb><rr>
            const regionChildren = Array.isArray(dEnhanced.children)
              ? dEnhanced.children.filter((c: any) => c.type === 'region')
              : []
            regionChildren.forEach((region: any, rIdx: number) => {
              const rr = pad2(rIdx + 1)
              const rEnhanced: any = { ...region, code: `${bb}${rr}` }
              // 区域下门店：STR-<bb><rr><ss>
              const storeChildren = Array.isArray(rEnhanced.children)
                ? rEnhanced.children.filter((c: any) => c.type === 'store')
                : []
              storeChildren.forEach((store: any, sIdx: number) => {
                const ss = pad2(sIdx + 1)
                const sEnhanced: any = { ...store, code: `${bb}${rr}${ss}` }
                // 保留门店原有子节点（理应为空），并替换为增强后的
                if (Array.isArray(store.children) && store.children.length) {
                  sEnhanced.children = store.children.map((x: any) => ({ ...x }))
                }
                // 替换 store
                const sPos = rEnhanced.children.findIndex((c: any) => c === store)
                if (sPos >= 0) rEnhanced.children.splice(sPos, 1, sEnhanced)
              })

              // 替换 region
              const rPos = dEnhanced.children.findIndex((c: any) => c === region)
              if (rPos >= 0) dEnhanced.children.splice(rPos, 1, rEnhanced)
            })

            // 替换 department
            const dPos = bEnhanced.children.findIndex((c: any) => c === deptNode)
            if (dPos >= 0) bEnhanced.children.splice(dPos, 1, dEnhanced)
          }

          // 替换 brand 回到 group
          const bPos = gEnhanced.children.findIndex((c: any) => c === brand)
          if (bPos >= 0) gEnhanced.children.splice(bPos, 1, bEnhanced)
        })

        return gEnhanced
      })

    return enhanceGroup(records)
  }

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
        {
          prop: 'operation',
          label: '操作',
          width: 280,
          align: 'center',
          fixed: 'right',
          useSlot: true
        }
      ]
    },
    // 为数据添加显示编号
    transform: {
      dataTransformer: (records: any[]) => buildHierCodes(records)
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
