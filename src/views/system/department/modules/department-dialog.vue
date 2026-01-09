<template>
  <ElDialog v-model="dialogVisible" :title="dialogTitle" width="30%" align-center>
    <ElForm ref="formRef" :model="formData" :rules="rules" label-width="90px">
      <ElFormItem label="上级节点" prop="parentId">
        <template v-if="!isEdit">
          <ElTreeSelect
            v-model="formData.parentId"
            :data="parentAllTree"
            :props="{ value: 'id', label: 'name', children: 'children', disabled: 'disabled' }"
            placeholder="可选：不选则创建集团"
            clearable
            check-strictly
            style="width: 100%"
          />
          <div v-if="isDev" style="margin-top: 6px; font-size: 12px; color: var(--el-color-info)">
            父级：{{ parentTypeText }} → 新增类型预览：{{ nextTypePreviewText }}
          </div>
        </template>
        <template v-else>
          <ElInput :model-value="parentName" disabled />
        </template>
      </ElFormItem>
      <ElFormItem label="名称" prop="name">
        <ElInput v-model="formData.name" placeholder="请输入名称" />
      </ElFormItem>
      <ElFormItem label="状态" prop="enabled">
        <ElSwitch v-model="formData.enabled" />
      </ElFormItem>
    </ElForm>
    <template #footer>
      <div class="dialog-footer">
        <ElButton @click="dialogVisible = false">取消</ElButton>
        <ElButton type="primary" @click="handleSubmit">提交</ElButton>
      </div>
    </template>
  </ElDialog>
</template>

<script setup lang="ts">
  import type { FormInstance, FormRules } from 'element-plus'
  import { fetchSaveDepartment } from '@/api/system-manage'
  import { ElMessage } from 'element-plus'

  interface Props {
    visible: boolean
    type: Form.DialogType
    deptData?: Partial<Api.SystemManage.DepartmentItem>
    deptTree?: Api.SystemManage.DepartmentItem[]
  }

  interface Emits {
    (e: 'update:visible', value: boolean): void
    (e: 'submit'): void
  }

  const props = defineProps<Props>()
  const emit = defineEmits<Emits>()

  const dialogVisible = computed({
    get: () => props.visible,
    set: (val) => emit('update:visible', val)
  })
  const dialogType = computed(() => props.type)
  const isEdit = computed(() => dialogType.value === 'edit')
  const dialogTitle = computed(() => (dialogType.value === 'add' ? '新增节点' : '编辑节点'))
  const deptTree = computed(() => props.deptTree || [])
  // 父级选择：允许选择任意节点作为父级（门店下可建销售小组）
  const parentAllTree = computed(() => {
    const enrich = (nodes: any[] = []): any[] =>
      nodes.map((n: any) => ({
        id: n.id,
        name: n.name,
        disabled: false,
        children: Array.isArray(n.children) ? enrich(n.children) : []
      }))
    return enrich(deptTree.value as any)
  })

  const formRef = ref<FormInstance>()
  const formData = reactive<Partial<Api.SystemManage.DepartmentItem>>({
    id: undefined,
    name: '',
    type: 'group',
    enabled: true,
    parentId: undefined
  })

  const rules = computed<FormRules>(() => ({
    name: [{ required: true, message: '请输入名称', trigger: 'blur' }]
  }))

  const initForm = () => {
    const row = props.deptData || {}
    Object.assign(formData, {
      id: row.id,
      name: (props.type === 'add' ? '' : row.name) || '',
      type: row.type || 'group',
      enabled: typeof row.enabled === 'boolean' ? row.enabled : true,
      parentId: row.parentId
    })
  }

  // 新层级规则：集团 -> 品牌 -> 销售部门(department) -> 区域(region) -> 门店(store) -> 销售小组(team)
  const nextTypeMap: Record<
    Api.SystemManage.DepartmentItem['type'],
    Api.SystemManage.DepartmentItem['type']
  > = {
    group: 'brand',
    brand: 'department',
    department: 'region',
    region: 'store',
    store: 'team',
    team: 'team'
  }

  const findNodeById = (nodes: any[] = [], id?: number): any | undefined => {
    if (!id) return undefined
    for (const n of nodes) {
      if (n.id === id) return n
      if (Array.isArray(n.children)) {
        const f = findNodeById(n.children, id)
        if (f) return f
      }
    }
    return undefined
  }
  const parentName = computed(() => {
    const parent = findNodeById(deptTree.value as any, formData.parentId as number)
    return parent ? parent.name : '无（顶级）'
  })

  // 开发环境调试信息
  const isDev = import.meta.env.DEV
  const parentTypeText = computed(() => {
    const parent = findNodeById(deptTree.value as any, formData.parentId as number)
    return parent ? parent.type : 'group(顶级)'
  })
  const nextTypePreviewText = computed(() => {
    const parent = findNodeById(deptTree.value as any, formData.parentId as number)
    if (!parent) return 'group'
    if (parent.type === 'store') return 'team(门店下新增销售小组)'
    if (parent.type === 'department') {
      const parentOfDept = findNodeById(deptTree.value as any, parent.parentId as number)
      if (parentOfDept && parentOfDept.type === 'store') return '不可新增（销售小组为最低层级）'
      return 'region'
    }
    return nextTypeMap[parent.type as Api.SystemManage.DepartmentItem['type']] || 'group'
  })

  // 收集某节点下的所有子节点（含多级）
  const collectDescendants = (node: any): any[] => {
    if (!node || !Array.isArray(node.children)) return []
    const result: any[] = []
    const walk = (nodes: any[]) => {
      for (const n of nodes) {
        result.push(n)
        if (Array.isArray(n.children) && n.children.length) walk(n.children)
      }
    }
    walk(node.children)
    return result
  }

  watch(
    () => [props.visible, props.type, props.deptData],
    ([visible]) => {
      if (visible) {
        initForm()
        nextTick(() => formRef.value?.clearValidate())
      }
    },
    { immediate: true }
  )

  const handleSubmit = async () => {
    if (!formRef.value) return
    await formRef.value.validate(async (valid) => {
      if (valid) {
        if (!isEdit.value) {
          // 新增：根据选择的父级推断类型；未选择则创建集团
          const parent = findNodeById(deptTree.value as any, formData.parentId as number)
          // 规则：
          // - 门店下可新增“销售小组”（team）
          // - 若父级为“销售小组”且其父级是门店，则视为最低层，不允许再新增
          let nextType: Api.SystemManage.DepartmentItem['type'] = 'group'
          if (parent) {
            if (parent.type === 'store') {
              nextType = 'team'
            } else if (parent.type === 'department') {
              // 查找该 department 的父级
              const parentOfDept = findNodeById(deptTree.value as any, parent.parentId as number)
              if (parentOfDept && parentOfDept.type === 'store') {
                ElMessage.warning('销售小组为最低层级，不能新增子级')
                return
              }
              nextType = 'region'
            } else {
              nextType = nextTypeMap[parent.type as Api.SystemManage.DepartmentItem['type']]
            }
          }
          formData.type = nextType
        }
        const originalEnabled = (props.deptData?.enabled ?? true) as boolean
        const newEnabled = (formData.enabled ?? true) as boolean
        await fetchSaveDepartment(formData, { showSuccessMessage: false })

        // 编辑时若状态发生变化，则级联更新所有子节点的 enabled
        if (isEdit.value && originalEnabled !== newEnabled) {
          const currentNode = findNodeById(deptTree.value as any, formData.id as number)
          const descendants = collectDescendants(currentNode)
          if (descendants.length) {
            try {
              await Promise.all(
                descendants.map((child) =>
                  fetchSaveDepartment(
                    { id: child.id, enabled: newEnabled },
                    { showSuccessMessage: false }
                  )
                )
              )
            } catch {
              ElMessage.warning('部分子节点状态更新失败，请刷新后重试')
            }
          }
        }
        // 统一仅提示一次成功
        if (isEdit.value && originalEnabled !== newEnabled) {
          ElMessage.success(
            `${dialogType.value === 'add' ? '新增' : '更新'}成功，已${newEnabled ? '启用' : '禁用'}所有子级`
          )
        } else {
          ElMessage.success(dialogType.value === 'add' ? '新增成功' : '更新成功')
        }
        dialogVisible.value = false
        emit('submit')
      }
    })
  }
</script>
