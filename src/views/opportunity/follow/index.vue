<template>
  <div class="opportunity-follow-page art-full-height">
    <!-- 搜索栏 -->
    <ArtSearchBar
      ref="searchRef"
      v-model="searchForm"
      :items="searchItems"
      :is-expand="false"
      :show-expand="false"
      :label-width="110"
      @search="handleSearch"
      @reset="handleReset"
    />

    <ElCard class="art-table-card" shadow="never">
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
            <ElPopconfirm title="确认删除该跟进记录？" @confirm="handleDelete(row)">
              <template #reference>
                <ArtButtonTable type="delete" />
              </template>
            </ElPopconfirm>
          </div>
        </template>
        <template #method="{ row }">
          <ElTag size="small">{{ row.method }}</ElTag>
        </template>
        <template #content="{ row }">
          <span>【{{ row.status }}】 {{ row.content }}</span>
        </template>
      </ArtTable>
    </ElCard>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed } from 'vue'
  import ArtButtonTable from '@/components/core/forms/art-button-table/index.vue'
  import { useTable } from '@/composables/useTable'
  import type { ColumnOption } from '@/types/component'
  import { useOpportunityFollowStore, type FollowUpRecord } from '@/store/modules/opportunityFollow'
  import { ElMessage } from 'element-plus'

  defineOptions({ name: 'OpportunityFollow' })

  const followStore = useOpportunityFollowStore()

  // 搜索栏配置
  const searchRef = ref()
  const followMethodOptions = [
    { label: '电话', value: '电话' },
    { label: '微信', value: '微信' },
    { label: '到店', value: '到店' },
    { label: '短信', value: '短信' },
    { label: '其它', value: '其它' }
  ]

  const searchForm = ref({
    method: undefined as any,
    keyword: ''
  })

  const searchItems = computed(() => [
    {
      label: '跟进方式',
      key: 'method',
      type: 'select',
      props: { options: followMethodOptions, placeholder: '请选择跟进方式' }
    },
    { label: '关键词', key: 'keyword', type: 'input', props: { placeholder: '请输入关键词' } }
  ])

  const searchParams: any = { method: undefined, keyword: '' }
  const handleSearch = (params: Record<string, any>) => {
    Object.assign(searchParams, params)
    refreshData()
  }
  const handleReset = () => {
    Object.assign(searchParams, { method: undefined, keyword: '' })
    refreshData()
  }

  // 列表
  const { data, columns, loading, pagination, handleSizeChange, handleCurrentChange, refreshData } =
    useTable({
      core: {
        apiFn: async ({
          current,
          size
        }: Api.Common.CommonSearchParams): Promise<
          Api.Common.PaginatedResponse<FollowUpRecord>
        > => {
          let all = followStore.records
          // 筛选：方式
          if (searchParams.method) {
            all = all.filter((r) => r.method === searchParams.method)
          }
          // 筛选：关键词（商机名称或内容）
          const kw = (searchParams.keyword || '').trim()
          if (kw) {
            all = all.filter(
              (r) => (r.opportunityName || '').includes(kw) || (r.content || '').includes(kw)
            )
          }
          // 按创建时间倒序
          all = all.slice().sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))

          const total = all.length
          const start = (current - 1) * size
          const end = start + size
          return { records: all.slice(start, end), total, current, size }
        },
        apiParams: { current: 1, size: 10 },
        columnsFactory: (): ColumnOption<FollowUpRecord>[] => [
          { type: 'globalIndex', label: '序号', width: 80 },
          { prop: 'opportunityName', label: '商机编码', minWidth: 160 },
          { prop: 'content', label: '跟进内容', minWidth: 220, useSlot: true },
          { prop: 'method', label: '跟进方式', width: 110, useSlot: true },
          { prop: 'nextContactTime', label: '下次联系时间', minWidth: 160 },
          { prop: 'createdAt', label: '创建时间', minWidth: 160 },
          {
            prop: 'operation',
            label: '操作',
            width: 140,
            align: 'center',
            fixed: 'right',
            useSlot: true
          }
        ]
      }
    })

  const handleDelete = (row: FollowUpRecord) => {
    followStore.deleteRecord(row.id)
    ElMessage.success('删除成功')
    refreshData()
  }
</script>

<style scoped>
  .art-table-card {
    margin-top: 0;
  }
</style>
