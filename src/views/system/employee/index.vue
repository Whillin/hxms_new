<template>
  <div class="employee-page art-full-height">
    <!-- 搜索栏 -->
    <EmployeeSearch
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
        v-model:columns="columnChecks"
        v-model:showSearchBar="showSearchBar"
        :loading="loading"
        layout="refresh,columns"
        :showHeaderBackground="false"
        fullClass="art-table-card"
        @refresh="refreshData"
      >
        <template #left>
          <ElSpace wrap>
            <ElButton type="primary" @click="showDialog('add')" v-ripple> 新增员工 </ElButton>
          </ElSpace>
        </template>
      </ArtTableHeader>

      <!-- 表格 -->
      <ArtTable
        :loading="loading"
        :data="data"
        :columns="columns"
        :pagination="pagination"
        :pagination-options="{ size: 'small' }"
        @pagination:size-change="handleSizeChange"
        @pagination:current-change="handleCurrentChange"
      >
        <template #status="{ row }">
          <ElTag size="small" :type="row.status === '1' ? 'success' : 'danger'">
            {{ row.status === '1' ? '在职' : '离职' }}
          </ElTag>
        </template>
        <template #departmentName="{ row }">
          {{ getDeptFullPath(row) }}
        </template>
        <template #operation="{ row }">
          <div style="text-align: right">
            <ArtButtonTable type="edit" @click="showDialog('edit', row)" />
            <ElPopconfirm title="确认删除该员工？" @confirm="handleDelete(row)">
              <template #reference>
                <ArtButtonTable type="delete" />
              </template>
            </ElPopconfirm>
          </div>
        </template>
      </ArtTable>

      <!-- 新增/编辑弹窗 -->
      <EmployeeDialog
        v-model:visible="dialogVisible"
        :type="dialogType"
        :employee-data="currentEmployeeData"
        @submit="handleDialogSubmit"
      />
    </ElCard>
  </div>
</template>

<script setup lang="ts">
  import { useTable } from '@/composables/useTable'
  import {
    fetchGetEmployeeList,
    fetchDeleteEmployee,
    fetchGetDepartmentList,
    fetchSaveEmployee
  } from '@/api/system-manage'
  import EmployeeSearch from './modules/employee-search.vue'
  import EmployeeDialog from './modules/employee-dialog.vue'
  import { ElTag, ElMessage } from 'element-plus'
  import ArtButtonTable from '@/components/core/forms/art-button-table/index.vue'
  import { onMounted } from 'vue'
  import { EMPLOYEE_ROLE_LABELS } from '@/utils/employee'
  import { fetchGetUserInfo } from '@/api/auth'
  import { useUserStore } from '@/store/modules/user'
  import { resetRouterState } from '@/router/guards/beforeEach'
  import { router } from '@/router'

  defineOptions({ name: 'Employee' })

  type EmployeeItem = Api.SystemManage.EmployeeItem

  // 弹窗相关
  const dialogType = ref<Form.DialogType>('add')
  const dialogVisible = ref(false)
  const currentEmployeeData = ref<Partial<EmployeeItem>>({})

  // 搜索相关
  const showSearchBar = ref(true)
  const searchForm = ref<Api.SystemManage.EmployeeSearchParams>({})

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
  } = useTable({
    core: {
      apiFn: fetchGetEmployeeList,
      apiParams: {
        current: 1,
        size: 20
      },
      excludeParams: [],
      columnsFactory: () => [
        { type: 'index', width: 60, label: '序号' },
        { prop: 'name', label: '姓名', minWidth: 140 },
        { prop: 'phone', label: '手机号', minWidth: 140 },

        {
          prop: 'gender',
          label: '性别',
          width: 100,
          formatter: (row) => {
            const textMap: Record<string, string> = { male: '男', female: '女', other: '其他' }
            return textMap[row.gender as keyof typeof textMap] || '未知'
          }
        },
        {
          prop: 'status',
          label: '状态',
          width: 100,
          useSlot: true
        },
        {
          prop: 'role',
          label: '岗位',
          minWidth: 160,
          formatter: (row) => {
            return EMPLOYEE_ROLE_LABELS[row.role as string] || row.role
          }
        },
        { prop: 'departmentName', label: '所属部门', minWidth: 220, useSlot: true },
        { prop: 'hireDate', label: '入职时间', width: 160 },
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

  /**
   * 显示新增/编辑弹窗
   */
  const showDialog = (type: Form.DialogType, row?: EmployeeItem) => {
    dialogType.value = type
    currentEmployeeData.value = row || {}
    dialogVisible.value = true
  }

  /**
   * 处理搜索提交
   */
  const handleSearch = (params: Record<string, any>) => {
    Object.assign(searchParams, params)
    getData()
  }

  /**
   * 处理弹窗提交
   */
  const handleDialogSubmit = async (payload: Partial<EmployeeItem>) => {
    try {
      // 如果是编辑，确保携带 id
      if (dialogType.value === 'edit' && currentEmployeeData.value?.id && !payload.id) {
        payload.id = currentEmployeeData.value.id
      }
      await fetchSaveEmployee(payload)
      ElMessage.success(dialogType.value === 'add' ? '新增成功' : '更新成功')
      dialogVisible.value = false
      currentEmployeeData.value = {}
      try {
        const info = await fetchGetUserInfo()
        useUserStore().setUserInfo(info)
      } catch {}
      resetRouterState()
      router.replace(router.currentRoute.value.fullPath)
      refreshData()
    } catch (err: any) {
      const msg = err?.message || '保存失败'
      ElMessage.error(msg)
    }
  }

  // 删除员工
  const handleDelete = async (row: EmployeeItem) => {
    try {
      await fetchDeleteEmployee(Number(row.id))
      ElMessage.success('删除成功')
      refreshData()
    } catch (err: any) {
      const msg = err?.message || '删除失败'
      ElMessage.error(msg)
    }
  }

  // 部门树用于名称映射
  const deptTree = ref<any[]>([])
  const loadDeptTree = async () => {
    try {
      const res = await fetchGetDepartmentList({})
      // 适配后的返回直接为数组树
      deptTree.value = Array.isArray(res as any) ? (res as any as any[]) : []
    } catch {
      deptTree.value = []
    }
  }
  onMounted(loadDeptTree)

  const findNode = (id: number | undefined, nodes: any[]): any | undefined => {
    if (!id) return undefined
    for (const n of nodes) {
      if (n.id === id) return n
      if (Array.isArray(n.children)) {
        const f = findNode(id, n.children)
        if (f) return f
      }
    }
    return undefined
  }

  const getDeptFullPath = (row: EmployeeItem): string => {
    const segs: string[] = []
    const brand = findNode(row.brandId as any, deptTree.value)
    if (brand) {
      segs.push(brand.name)
      const dept = brand.children?.find((c: any) => c.type === 'department')
      if (dept) segs.push(dept.name)
    }
    const region = findNode(row.regionId as any, deptTree.value)
    if (region) segs.push(region.name)
    const store = findNode(row.storeId as any, deptTree.value)
    if (store) segs.push(store.name)
    return segs.length ? segs.join(' / ') : '集团'
  }
</script>

<style lang="scss" scoped>
  .employee-page {
    :deep(.el-tag) {
      &.el-tag--success {
        background-color: var(--el-color-success-light-9);
        border-color: var(--el-color-success-light-7);
      }

      &.el-tag--danger {
        background-color: var(--el-color-danger-light-9);
        border-color: var(--el-color-danger-light-7);
      }
    }
  }
</style>
