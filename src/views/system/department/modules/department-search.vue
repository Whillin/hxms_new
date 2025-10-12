<template>
  <ArtSearchBar
    ref="searchBarRef"
    v-model="formData"
    :items="formItems"
    @reset="handleReset"
    @search="handleSearch"
  />
</template>

<script setup lang="ts">
  interface Props {
    modelValue: Record<string, any>
  }
  interface Emits {
    (e: 'update:modelValue', value: Record<string, any>): void
    (e: 'search', params: Record<string, any>): void
    (e: 'reset'): void
  }
  const props = defineProps<Props>()
  const emit = defineEmits<Emits>()

  const searchBarRef = ref()
  const formData = computed({
    get: () => props.modelValue,
    set: (val) => emit('update:modelValue', val)
  })

  const typeOptions = [
    { label: '集团', value: 'group' },
    { label: '品牌', value: 'brand' },
    { label: '区域', value: 'region' },
    { label: '门店', value: 'store' },
    { label: '部门', value: 'department' }
  ]

  const enabledOptions = [
    { label: '启用', value: true },
    { label: '停用', value: false }
  ]

  const formItems = computed(() => [
    { label: '名称', key: 'name', type: 'input', props: { placeholder: '请输入名称' } },
    { label: '类型', key: 'type', type: 'select', props: { options: typeOptions, placeholder: '请选择类型' } },
    { label: '品牌', key: 'brand', type: 'input', props: { placeholder: '请输入品牌' } },
    { label: '区域', key: 'region', type: 'input', props: { placeholder: '请输入区域' } },
    { label: '门店', key: 'store', type: 'input', props: { placeholder: '请输入门店' } },
    { label: '状态', key: 'enabled', type: 'select', props: { options: enabledOptions, placeholder: '请选择状态' } }
  ])

  function handleReset() {
    emit('reset')
  }

  async function handleSearch() {
    await searchBarRef.value?.validate?.()
    emit('search', formData.value)
  }
</script>