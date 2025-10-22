<template>
  <ElDialog
    v-model="visible"
    title="菜单权限"
    width="520px"
    align-center
    class="el-dialog-border"
    @close="handleClose"
  >
    <ElScrollbar height="70vh">
      <ElAlert
        v-if="showEmptyTip"
        title="当前角色尚未配置权限或接口返回为空"
        type="info"
        :closable="false"
        description="可点击全部选择或手动勾选后保存，再次打开将显示默认勾选。"
        style="margin: 0 0 12px 0"
      />
      <!-- 键名规范提示：统一使用 RouteName_action 格式，例如 ClueLeads_add -->
      <ElAlert
        title="权限键名规范"
        type="success"
        :closable="false"
        description="统一使用 RouteName_action 格式（例如：ClueLeads_add、CustomerList_edit）。保存时会自动归一（将 .、-、\\ 转为 _），避免歧义。"
        style="margin: 0 0 12px 0"
      />
      <ElTree
        ref="treeRef"
        :data="processedMenuList"
        show-checkbox
        node-key="name"
        :default-expand-all="isExpandAll"
        :default-checked-keys="defaultCheckedKeys"
        :props="defaultProps"
        @check="handleTreeCheck"
      >
        <template #default="{ data }">
          <div style="display: flex; align-items: center">
            <span v-if="data.isAuth">
              {{ data.label }}
            </span>
            <span v-else>{{ defaultProps.label(data) }}</span>
          </div>
        </template>
      </ElTree>
    </ElScrollbar>
    <template #footer>
      <div class="dialog-footer">
        <ElButton @click="outputSelectedData" style="margin-left: 8px">获取选中数据</ElButton>

        <ElButton @click="toggleExpandAll">{{ isExpandAll ? '全部收起' : '全部展开' }}</ElButton>
        <ElButton @click="toggleSelectAll" style="margin-left: 8px">{{
          isSelectAll ? '取消全选' : '全部选择'
        }}</ElButton>
        <ElButton type="primary" @click="savePermission">保存</ElButton>
      </div>
    </template>
  </ElDialog>
</template>

<script setup lang="ts">
  import { useMenuStore } from '@/store/modules/menu'
  import { formatMenuTitle } from '@/router/utils/utils'
  import { fetchGetRolePermissions, fetchSaveRolePermissions } from '@/api/system-manage'

  type RoleListItem = Api.SystemManage.RoleListItem

  interface Props {
    modelValue: boolean
    roleData?: RoleListItem
  }

  interface Emits {
    (e: 'update:modelValue', value: boolean): void
    (e: 'success'): void
  }

  const props = withDefaults(defineProps<Props>(), {
    modelValue: false,
    roleData: undefined
  })

  const emit = defineEmits<Emits>()

  const visible = computed({
    get: () => props.modelValue,
    set: (value) => emit('update:modelValue', value)
  })

  const currentRoleId = computed(() => Number(props.roleData?.roleId ?? 0))

  const { menuList } = storeToRefs(useMenuStore())
  const treeRef = ref()
  const isExpandAll = ref(true)
  const isSelectAll = ref(false)
  const defaultCheckedKeys = ref<string[]>([])
  // 缓存后端加载到的原始权限键，等待树渲染完成后再应用
  const loadedKeysBuffer = ref<string[]>([])
  const showEmptyTip = computed(() => visible.value && loadedKeysBuffer.value.length === 0)

  // 处理菜单数据，将 authList 转换为子节点
  const processedMenuList = computed(() => {
    const processNode = (node: any) => {
      const processed = { ...node }

      // 如果有 authList，将其转换为子节点
      if (node.meta && node.meta.authList && node.meta.authList.length) {
        const authNodes = node.meta.authList.map((auth: any) => ({
          id: `${node.id}_${auth.authMark}`,
          name: `${node.name}_${auth.authMark}`,
          label: auth.title,
          authMark: auth.authMark,
          isAuth: true,
          checked: auth.checked || false
        }))

        processed.children = processed.children ? [...processed.children, ...authNodes] : authNodes
      }

      // 递归处理子节点
      if (processed.children) {
        processed.children = processed.children.map(processNode)
      }

      return processed
    }

    return menuList.value.map(processNode)
  })

  const defaultProps = {
    children: 'children',
    label: (data: any) => formatMenuTitle(data.meta?.title) || ''
  }

  // 构建旧键到新键的映射（兼容历史以 id 为键的保存方式）
  const buildLegacyKeyMap = (nodes: any[]): Record<string, string> => {
    const map: Record<string, string> = {}
    const walk = (list: any[]) => {
      list.forEach((node) => {
        const name = node?.name
        const id = node?.id
        if (id && name) {
          map[String(id)] = String(name)
        }
        if (node.children && node.children.length > 0) {
          walk(node.children)
        }
      })
    }
    walk(nodes)
    return map
  }

  const getAllNodeKeys = (nodes: any[]): string[] => {
    const keys: string[] = []
    const traverse = (nodeList: any[]) => {
      nodeList.forEach((node) => {
        if (node.name) {
          keys.push(node.name)
        }
        if (node.children && node.children.length > 0) {
          traverse(node.children)
        }
      })
    }
    traverse(nodes)
    return keys
  }

  // 将后端返回的键归一化为树的 node-key 集合
  const normalizeLoadedKeys = (loadedKeys: string[], nodes: any[]): string[] => {
    const allKeys = getAllNodeKeys(nodes)
    const legacyMap = buildLegacyKeyMap(nodes)
    const normalizedKeys = loadedKeys
      .map((k) => {
        const key = String(k)
        const norm = key.replace(/[.\-\\]/g, '_')
        if (allKeys.includes(key)) return key
        if (allKeys.includes(norm)) return norm
        const mapped = legacyMap[key] || legacyMap[norm]
        return mapped && allKeys.includes(mapped) ? mapped : null
      })
      .filter((k): k is string => !!k)
    return normalizedKeys
  }

  // 扁平化并标注顶层模块名，便于按模块筛选权限键
  const flattenNodes = (nodes: any[]): any[] => {
    const out: any[] = []
    const walk = (list: any[], top?: string) => {
      list.forEach((n) => {
        const topName = top ?? n.name
        out.push({ ...n, _topName: topName })
        if (n.children && n.children.length > 0) {
          walk(n.children, topName)
        }
      })
    }
    walk(nodes)
    return out
  }

  // 获取指定模块下指定动作标记的权限键（如 'Clue_edit'）
  const getModuleAuthKeys = (moduleName: string, marks: string[]): string[] => {
    const flat = flattenNodes(processedMenuList.value)
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

  // 计算不同角色的默认权限键集合
  const computeDefaultKeysForRole = (role: { code?: string; name?: string }): string[] => {
    const allKeys = getAllNodeKeys(processedMenuList.value)
    // 模块映射：限定角色仅允许查看和编辑；前台对线索允许增改删、对个人中心允许增改
    const limitedModules = ['UserCenter', 'Customer', 'Opportunity', 'Clue']
    const limitedModuleKeys = Array.from(
      new Set([
        ...limitedModules.flatMap((m) => [m, ...getModuleAuthKeys(m, ['view', 'edit'])])
      ])
    )
    const frontDeskModuleKeys = Array.from(
      new Set([
        'Clue',
        ...getModuleAuthKeys('Clue', ['view', 'add', 'edit', 'delete']),
        'UserCenter',
        ...getModuleAuthKeys('UserCenter', ['view', 'add', 'edit'])
      ])
    )

    const limitedCodes = new Set([
      'R_SALES',
      'R_SALES_MANAGER',
      'R_APPOINTMENT',
      'R_STORE_DIRECTOR',
      'R_STORE_MANAGER',
      'R_REGION_DIRECTOR',
      'R_BRAND_DIRECTOR'
    ])
    const limitedNames = ['销售专员', '销售经理', '邀约专员', '门店总监', '门店经理', '区域总经理', '品牌总经理']
    const frontDeskCodes = new Set(['R_FRONT_DESK'])
    const frontDeskNames = ['前台']

    const code = role.code || ''
    const name = role.name || ''
    const isFrontDesk = frontDeskCodes.has(code) || frontDeskNames.some((n) => name.includes(n))
    const isLimited = limitedCodes.has(code) || limitedNames.some((n) => name.includes(n))

    if (isFrontDesk) return frontDeskModuleKeys
    if (isLimited) return limitedModuleKeys
    return allKeys
  }

  // 应用勾选（确保树已渲染并且数据已准备）
  const applyCheckedKeys = async () => {
    const nodes = processedMenuList.value
    const tree = treeRef.value
    if (!nodes || !nodes.length || !tree) return

    const validKeys = normalizeLoadedKeys(loadedKeysBuffer.value, nodes)
    defaultCheckedKeys.value = validKeys
    await nextTick()
    // 二次 nextTick 确保 ElTree store 完全建立
    await nextTick()
    try {
      tree.setCheckedKeys(validKeys)
    } catch (e) {
      console.warn('setCheckedKeys 执行异常:', e)
    }

    const allKeys = getAllNodeKeys(nodes)
    isSelectAll.value = validKeys.length === allKeys.length && allKeys.length > 0
    // 调试输出
    console.log('[权限弹窗] 已应用勾选:', {
      roleId: currentRoleId.value,
      loadedKeys: loadedKeysBuffer.value,
      normalized: validKeys,
      allKeysCount: allKeys.length
    })
  }

  // 监听弹窗打开，拉取并缓存权限键
  watch(
    () => props.modelValue,
    async (newVal) => {
      if (newVal && props.roleData) {
        try {
          const roleId = props.roleData.roleId
          const resp = await fetchGetRolePermissions({ roleId })
          const loadedKeys = (resp as any)?.data ?? (Array.isArray(resp) ? resp : [])
          loadedKeysBuffer.value = loadedKeys.map((k) => String(k))
          console.log('[权限弹窗] 后端返回的权限键:', {
            roleId,
            keys: loadedKeysBuffer.value,
            count: loadedKeysBuffer.value.length
          })

          // 服务端无数据时按角色提供默认勾选
          if (!loadedKeysBuffer.value.length) {
            const defaults = computeDefaultKeysForRole({
              code: props.roleData.roleCode,
              name: props.roleData.roleName
            })
            loadedKeysBuffer.value = defaults
            console.log('[权限弹窗] 使用角色默认权限:', {
              roleCode: props.roleData.roleCode,
              roleName: props.roleData.roleName,
              count: defaults.length
            })
          }

          await nextTick()
          applyCheckedKeys()
        } catch (error) {
          console.error('加载角色权限失败:', error)
          ElMessage.error('加载角色权限失败')
        }
      }
    }
  )

  // 监听树数据变化（菜单列表加载完成后再尝试应用）
  watch(
    () => processedMenuList.value,
    async (nodes) => {
      if (visible.value && loadedKeysBuffer.value.length) {
        await nextTick()
        applyCheckedKeys()
      }
    },
    { deep: true }
  )

  const handleClose = () => {
    visible.value = false
    defaultCheckedKeys.value = []
    loadedKeysBuffer.value = []
    treeRef.value?.setCheckedKeys([])
  }

  const savePermission = async () => {
    if (!props.roleData) return
    const tree = treeRef.value
    if (!tree) return

    try {
      const checkedKeys: string[] = tree.getCheckedKeys()
      const halfCheckedKeys: string[] = tree.getHalfCheckedKeys()
      // 合并并去重，包含父节点半选中情况
      const keys = Array.from(new Set([...checkedKeys, ...halfCheckedKeys]))
      // 归一化（保证 RouteName_action 一致性）
      const normalizedKeys = keys.map((k) => String(k).replace(/[.\-\\]/g, '_'))
      // 仅提交有效键
      const allKeys = getAllNodeKeys(processedMenuList.value)
      const validKeys = normalizedKeys.filter((k) => allKeys.includes(k))

      console.log('[权限弹窗] 保存前校验:', {
        roleId: props.roleData.roleId,
        checkedKeysCount: checkedKeys.length,
        halfCheckedKeysCount: halfCheckedKeys.length,
        validKeysCount: validKeys.length
      })

      const ok = await fetchSaveRolePermissions({ roleId: props.roleData.roleId, keys: validKeys })
      const success = (ok as any)?.data === true || ok === true
      if (!success) {
        ElMessage.error('权限保存失败')
        return
      }

      ElMessage.success('权限保存成功')
      // 保存后回读一次，确认生效
      const resp = await fetchGetRolePermissions({ roleId: props.roleData.roleId })
      const readBack = (resp as any)?.data ?? (Array.isArray(resp) ? resp : [])
      console.log('[权限弹窗] 保存后回读:', {
        roleId: props.roleData.roleId,
        count: readBack.length,
        keys: readBack
      })

      emit('success')
      handleClose()
    } catch (error) {
      console.error('保存角色权限失败:', error)
      ElMessage.error('保存角色权限失败')
    }
  }

  const toggleExpandAll = () => {
    const tree = treeRef.value
    if (!tree) return

    // 使用store.nodesMap直接控制所有节点的展开状态
    const nodes = tree.store.nodesMap
    Object.values(nodes).forEach((node: any) => {
      node.expanded = !isExpandAll.value
    })

    isExpandAll.value = !isExpandAll.value
  }

  const toggleSelectAll = () => {
    const tree = treeRef.value
    if (!tree) return

    if (!isSelectAll.value) {
      // 全选：获取所有节点的key并设置为选中
      const allKeys = getAllNodeKeys(processedMenuList.value)
      tree.setCheckedKeys(allKeys)
    } else {
      // 取消全选：清空所有选中
      tree.setCheckedKeys([])
    }

    isSelectAll.value = !isSelectAll.value
  }

  const handleTreeCheck = () => {
    const tree = treeRef.value
    if (!tree) return

    // 使用树组件的getCheckedKeys方法获取选中的节点
    const checkedKeys = tree.getCheckedKeys()
    const allKeys = getAllNodeKeys(processedMenuList.value)

    // 判断是否全选：选中的节点数量等于总节点数量
    isSelectAll.value = checkedKeys.length === allKeys.length && allKeys.length > 0
  }

  // 输出选中的数据
  const outputSelectedData = () => {
    const tree = treeRef.value
    if (!tree) return

    // 获取选中的节点keys
    const checkedKeys = tree.getCheckedKeys()
    // 获取半选中的节点keys（父节点部分选中时）
    const halfCheckedKeys = tree.getHalfCheckedKeys()
    // 获取选中的节点数据
    const checkedNodes = tree.getCheckedNodes()
    // 获取半选中的节点数据
    const halfCheckedNodes = tree.getHalfCheckedNodes()

    const selectedData = {
      checkedKeys,
      halfCheckedKeys,
      checkedNodes,
      halfCheckedNodes,
      totalChecked: checkedKeys.length,
      totalHalfChecked: halfCheckedKeys.length
    }

    console.log('=== 选中的权限数据 ===', selectedData)
    ElMessage.success(`已输出选中数据到控制台，共选中 ${checkedKeys.length} 个节点`)
  }
</script>

<style lang="scss" scoped>
  .dialog-footer {
    display: flex;
    gap: 12px;
    justify-content: flex-end;
  }
</style>
