<template>
  <div class="role-page art-full-height">
    <RoleSearch
      v-show="showSearchBar"
      v-model="searchForm"
      @search="handleSearch"
      @reset="resetSearchParams"
    ></RoleSearch>

    <ElCard
      class="art-table-card"
      shadow="never"
      :style="{ 'margin-top': showSearchBar ? '12px' : '0' }"
    >
      <ArtTableHeader
        v-model:columns="columnChecks"
        v-model:showSearchBar="showSearchBar"
        :loading="loading"
        @refresh="refreshData"
      >
        <template #left>
          <ElSpace wrap>
            <ElButton @click="showDialog('add')" v-ripple>新增角色</ElButton>
            <ElButton type="primary" @click="initAllRolePermissions" v-ripple>初始化权限</ElButton>
          </ElSpace>
        </template>
      </ArtTableHeader>

      <!-- 表格 -->
      <ArtTable
        :loading="loading"
        :data="data"
        :columns="columns"
        :pagination="pagination"
        @pagination:size-change="handleSizeChange"
        @pagination:current-change="handleCurrentChange"
      >
      </ArtTable>
    </ElCard>

    <!-- 角色编辑弹窗 -->
    <RoleEditDialog
      v-model="dialogVisible"
      :dialog-type="dialogType"
      :role-data="currentRoleData"
      @success="refreshData"
    />

    <!-- 菜单权限弹窗 -->
    <RolePermissionDialog
      v-model="permissionDialog"
      :role-data="currentRoleData"
      @success="refreshData"
    />
  </div>
</template>

<script setup lang="ts">
  import { ButtonMoreItem } from '@/components/core/forms/art-button-more/index.vue'
  import { Setting, Edit, Delete } from '@element-plus/icons-vue'
  import { useTable } from '@/composables/useTable'
  import { fetchGetRoleList, fetchDeleteRole } from '@/api/system-manage'
  import { fetchSaveRolePermissions } from '@/api/system-manage'
  import ArtButtonMore from '@/components/core/forms/art-button-more/index.vue'
  import RoleSearch from './modules/role-search.vue'
  import RoleEditDialog from './modules/role-edit-dialog.vue'
  import RolePermissionDialog from './modules/role-permission-dialog.vue'
  import { ElTag, ElMessageBox, ElMessage } from 'element-plus'
  import { h } from 'vue'
  import { asyncRoutes } from '@/router/routes/asyncRoutes'

  defineOptions({ name: 'Role' })

  type RoleListItem = Api.SystemManage.RoleListItem

  // 搜索表单
  const searchForm = ref({
    roleName: undefined,
    roleCode: undefined,
    description: undefined,
    enabled: undefined,
    daterange: undefined
  })

  const showSearchBar = ref(false)

  const dialogVisible = ref(false)
  const permissionDialog = ref(false)
  const currentRoleData = ref<RoleListItem | undefined>(undefined)

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
    // 核心配置
    core: {
      apiFn: fetchGetRoleList,
      apiParams: {
        current: 1,
        size: 20
      },
      // 排除 apiParams 中的属性
      excludeParams: ['daterange'],
      columnsFactory: () => [
        {
          prop: 'roleId',
          label: '角色ID',
          width: 100
        },
        {
          prop: 'roleName',
          label: '角色名称',
          minWidth: 120
        },
        {
          prop: 'roleCode',
          label: '角色编码',
          minWidth: 120
        },
        {
          prop: 'description',
          label: '角色描述',
          minWidth: 150,
          showOverflowTooltip: true
        },
        {
          prop: 'enabled',
          label: '角色状态',
          width: 100,
          formatter: (row) => {
            const statusConfig = row.enabled
              ? { type: 'success', text: '启用' }
              : { type: 'warning', text: '禁用' }
            return h(
              ElTag,
              { type: statusConfig.type as 'success' | 'warning' },
              () => statusConfig.text
            )
          }
        },
        {
          prop: 'createTime',
          label: '创建日期',
          width: 180,
          sortable: true
        },
        {
          prop: 'operation',
          label: '操作',
          width: 80,
          fixed: 'right',
          formatter: (row) =>
            h('div', [
              h(ArtButtonMore, {
                list: [
                  {
                    key: 'permission',
                    label: '菜单权限',
                    icon: Setting
                  },
                  {
                    key: 'edit',
                    label: '编辑角色',
                    icon: Edit
                  },
                  {
                    key: 'delete',
                    label: '删除角色',
                    icon: Delete,
                    color: '#f56c6c'
                  }
                ],
                onClick: (item: ButtonMoreItem) => buttonMoreClick(item, row)
              })
            ])
        }
      ]
    }
  })

  const dialogType = ref<'add' | 'edit'>('add')

  const showDialog = (type: 'add' | 'edit', row?: RoleListItem) => {
    dialogVisible.value = true
    dialogType.value = type
    currentRoleData.value = row
  }

  /**
   * 搜索处理
   * @param params 搜索参数
   */
  const handleSearch = (params: Record<string, any>) => {
    // 处理日期区间参数，把 daterange 转换为 startTime 和 endTime
    const { daterange, ...filtersParams } = params
    const [startTime, endTime] = Array.isArray(daterange) ? daterange : [null, null]

    // 搜索参数赋值
    Object.assign(searchParams, { ...filtersParams, startTime, endTime })
    getData()
  }

  const buttonMoreClick = (item: ButtonMoreItem, row: RoleListItem) => {
    switch (item.key) {
      case 'permission':
        showPermissionDialog(row)
        break
      case 'edit':
        showDialog('edit', row)
        break
      case 'delete':
        deleteRole(row)
        break
    }
  }

  const showPermissionDialog = (row?: RoleListItem) => {
    permissionDialog.value = true
    currentRoleData.value = row
  }

  const deleteRole = (row: RoleListItem) => {
    ElMessageBox.confirm(`确定删除角色"${row.roleName}"吗？此操作不可恢复！`, '删除确认', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
      .then(async () => {
        const ok = await fetchDeleteRole(row.roleId)
        if ((ok as any)?.data === true || ok === true) {
          ElMessage.success('删除成功')
          refreshData()
        }
      })
      .catch(() => {
        ElMessage.info('已取消删除')
      })
  }

  // removed legacy menu store usage and old node processors; using asyncRoutes-based processors below
  // 将 asyncRoutes 展开为包含 authList 的节点树
  const processRouteNode = (node: any) => {
    const processed: any = { ...node }
    if (node.meta && Array.isArray(node.meta.authList) && node.meta.authList.length) {
      const authNodes = node.meta.authList.map((auth: any) => ({
        id: `${node.name}_${auth.authMark}`,
        name: `${node.name}_${auth.authMark}`,
        label: auth.title,
        authMark: auth.authMark,
        isAuth: true
      }))
      processed.children = processed.children ? [...processed.children, ...authNodes] : authNodes
    }
    if (processed.children) processed.children = processed.children.map(processRouteNode)
    return processed
  }

  const getAllNodeKeys = (nodes: any[]): string[] => {
    const keys: string[] = []
    const traverse = (list: any[]) => {
      list.forEach((n) => {
        if (n && n.name) keys.push(n.name)
        if (n && n.children && n.children.length) traverse(n.children)
      })
    }
    traverse(nodes)
    return keys
  }

  const flattenNodes = (nodes: any[]): any[] => {
    const out: any[] = []
    const walk = (list: any[], parentTopName?: string) => {
      list.forEach((n) => {
        const topName = parentTopName ?? n.name
        out.push({ ...n, _topName: topName })
        if (n.children?.length) walk(n.children, topName)
      })
    }
    walk(nodes)
    return out
  }

  const buildAsyncRouteNodes = () => {
    return asyncRoutes.map(processRouteNode)
  }

  // 获取指定模块下指定动作标记的权限键（如 'Clue_edit'）
  const getModuleAuthKeys = (moduleName: string, marks: string[]): string[] => {
    const nodes = buildAsyncRouteNodes()
    const flat = flattenNodes(nodes)
    const out = new Set<string>()
    flat.forEach((n: any) => {
      if (!n?.name) return
      const isAuthNode = n.isAuth === true && typeof n.authMark === 'string'
      const inModule = n._topName === moduleName
      if (isAuthNode && inModule && marks.includes(n.authMark)) {
        out.add(n.name)
      }
    })
    return Array.from(out)
  }

  const initAllRolePermissions = async () => {
    try {
      // 1) 收集所有可用的权限键（基于 asyncRoutes）
      const nodes = buildAsyncRouteNodes()
      const allKeys = getAllNodeKeys(nodes)
      if (!allKeys.length) {
        ElMessage.error('路由树为空，无法初始化权限')
        return
      }

      // 2) 拉取全部角色
      const res = await fetchGetRoleList({ current: 1, size: 9999 })
      const records = (res as any)?.data?.records || (res as any)?.records || []
      if (!Array.isArray(records) || !records.length) {
        ElMessage.error('没有可初始化的角色数据')
        return
      }

      // 模块映射：限定角色仅允许查看和编辑；前台对线索允许增改删、对个人中心允许增改
      const limitedModules = ['UserCenter', 'Customer', 'Opportunity', 'Clue']
      const limitedModuleKeys = Array.from(
        new Set([...limitedModules.flatMap((m) => [m, ...getModuleAuthKeys(m, ['view', 'edit'])])])
      )
      const frontDeskModuleKeys = Array.from(
        new Set([
          'Clue',
          ...getModuleAuthKeys('Clue', ['view', 'add', 'edit', 'delete']),
          'UserCenter',
          ...getModuleAuthKeys('UserCenter', ['view', 'add', 'edit'])
        ])
      )

      // 角色映射
      const limitedCodes = new Set([
        'R_SALES',
        'R_SALES_MANAGER',
        'R_APPOINTMENT',
        'R_STORE_DIRECTOR',
        'R_STORE_MANAGER',
        'R_REGION_DIRECTOR',
        'R_BRAND_DIRECTOR'
      ])
      const limitedNames = [
        '销售专员',
        '销售经理',
        '邀约专员',
        '门店总监',
        '门店经理',
        '区域总经理',
        '品牌总经理'
      ]
      const frontDeskCodes = new Set(['R_FRONT_DESK'])
      const frontDeskNames = ['前台']
      // 3) 逐个角色保存权限（分角色策略）
      for (const r of records) {
        const code: string = (r as any)?.roleCode || ''
        const name: string = (r as any)?.roleName || ''
        let keys: string[] = []

        const isFrontDesk = frontDeskCodes.has(code) || frontDeskNames.some((n) => name.includes(n))
        const isLimited = limitedCodes.has(code) || limitedNames.some((n) => name.includes(n))

        if (isFrontDesk) {
          keys = frontDeskModuleKeys
        } else if (isLimited) {
          keys = limitedModuleKeys
        } else {
          keys = allKeys
        }

        await fetchSaveRolePermissions({ roleId: r.roleId, keys })
        console.log('[初始化权限] 角色已写入:', {
          roleId: r.roleId,
          roleCode: code,
          roleName: name,
          keysCount: keys.length
        })
      }

      ElMessage.success('所有角色权限已初始化')
      refreshData()
    } catch (e) {
      console.error('初始化角色权限失败:', e)
      ElMessage.error('初始化角色权限失败')
    }
  }
</script>

<style lang="scss" scoped>
  .role-page {
    padding-bottom: 15px;
  }
</style>
