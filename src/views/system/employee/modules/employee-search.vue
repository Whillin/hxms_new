<template>
  <ArtSearchBar
    ref="searchBarRef"
    v-model="formModel"
    :items="formItems"
    @reset="onReset"
    @search="onSearch"
  />
</template>

<script setup lang="ts">
  import { EMPLOYEE_ROLE_LABELS } from '@/utils/employee'
  import ArtSearchBar from '@/components/core/forms/art-search-bar/index.vue'
  import { fetchGetDepartmentList } from '@/api/system-manage'

  defineOptions({ name: 'EmployeeSearch' })

  const props = defineProps<{ modelValue: Record<string, any> }>()
  const emit = defineEmits<{
    (e: 'update:modelValue', v: Record<string, any>): void
    (e: 'search', v: Record<string, any>): void
    (e: 'reset'): void
  }>()

  const searchBarRef = ref()
  const formModel = computed({
    get: () => props.modelValue || {},
    set: (val: Record<string, any>) => emit('update:modelValue', val)
  })

  const genderOptions = [
    { label: '男', value: 'male' },
    { label: '女', value: 'female' },
    { label: '其他', value: 'other' }
  ]
  const statusOptions = [
    { label: '在职', value: '1' },
    { label: '离职', value: '2' }
  ]
  const roleOptions = computed(() =>
    Object.entries(EMPLOYEE_ROLE_LABELS).map(([value, label]) => ({ label, value }))
  )

  // 部门树与级联选项
  const deptTree = ref<any[]>([])
  const idMap = ref<Record<number, any>>({})
  const buildIdMap = (nodes: any[]) => {
    const walk = (n: any) => {
      idMap.value[n.id] = n
      if (Array.isArray(n.children)) n.children.forEach(walk)
    }
    nodes.forEach(walk)
  }
  const buildDeptOptions = (nodes: any[]) => {
    const mapNode = (n: any): any => ({
      value: n.id,
      label: n.name,
      // 禁用“销售部门”节点，允许选择门店与小组（team）
      disabled: n.type === 'department',
      children: Array.isArray(n.children) ? n.children.map(mapNode) : undefined
    })
    return nodes.map(mapNode)
  }
  const deptOptions = computed(() => buildDeptOptions(deptTree.value))
  const loadDeptTree = async () => {
    try {
      const res = await fetchGetDepartmentList({})
      const tree = Array.isArray(res as any) ? (res as any) : []
      deptTree.value = tree
      buildIdMap(tree)
    } catch {
      deptTree.value = []
      idMap.value = {}
    }
  }
  onMounted(loadDeptTree)

  const formItems = computed(() => [
    {
      label: '姓名',
      key: 'name',
      type: 'input',
      props: { placeholder: '请输入姓名', clearable: true }
    },
    {
      label: '手机号',
      key: 'phone',
      type: 'input',
      props: { placeholder: '请输入手机号', clearable: true }
    },
    {
      label: '岗位',
      key: 'role',
      type: 'select',
      props: {
        options: roleOptions.value,
        placeholder: '选择岗位',
        clearable: true
      }
    },
    {
      label: '部门/小组',
      key: 'departmentPath',
      type: 'cascader',
      props: {
        options: deptOptions.value,
        props: { checkStrictly: true, emitPath: true },
        placeholder: '请选择部门/小组',
        clearable: true,
        showAllLevels: false // 只显示最后一级的名称
      }
    },
    {
      label: '性别',
      key: 'gender',
      type: 'select',
      props: {
        options: genderOptions,
        placeholder: '选择性别',
        clearable: true
      }
    },
    {
      label: '状态',
      key: 'status',
      type: 'select',
      props: {
        options: statusOptions,
        placeholder: '在职/离职',
        clearable: true
      }
    }
  ])

  const onSearch = async () => {
    await searchBarRef.value?.validate?.()
    const payload = { ...formModel.value }
    // 将部门路径映射为 brandId/regionId/storeId/departmentId
    const path: number[] | undefined = payload.departmentPath
    delete payload.departmentPath
    if (Array.isArray(path) && path.length) {
      payload.brandId = undefined
      payload.regionId = undefined
      payload.storeId = undefined
      payload.departmentId = undefined
      for (const id of path) {
        const node = idMap.value[id]
        if (!node) continue
        if (node.type === 'brand') payload.brandId = id
        if (node.type === 'region') payload.regionId = id
        if (node.type === 'store') payload.storeId = id
        if (node.type === 'team') payload.departmentId = id // 小组ID映射到departmentId
      }
    }
    emit('search', payload)
  }
  const onReset = () => {
    formModel.value = {}
    emit('reset')
  }
</script>

<style scoped></style>
