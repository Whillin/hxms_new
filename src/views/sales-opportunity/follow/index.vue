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
            <ArtButtonTable
              v-if="!row.followResult"
              type="edit"
              @click="openEditFollowResult(row)"
            />
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
      <ElDialog
        v-model="followResultDialogVisible"
        title="编辑跟进结果"
        width="500px"
        destroy-on-close
      >
        <ElForm label-width="90px">
          <ElFormItem label="跟进结果">
            <ElInput
              v-model="editingFollowResult"
              type="textarea"
              :rows="3"
              placeholder="请填写本次跟进结果"
            />
          </ElFormItem>
        </ElForm>
        <template #footer>
          <ElButton @click="followResultDialogVisible = false">取消</ElButton>
          <ElButton type="primary" @click="saveFollowResultOnly">保存</ElButton>
        </template>
      </ElDialog>
    </ElCard>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed } from 'vue'
  import ArtButtonTable from '@/components/core/forms/art-button-table/index.vue'
  import { useTable } from '@/composables/useTable'
  import type { ColumnOption } from '@/types/component'
  import { ElButton, ElMessage } from 'element-plus'
  import {
    fetchGetOpportunityFollowList,
    fetchDeleteOpportunityFollow,
    fetchUpdateOpportunityFollowResult
  } from '@/api/opportunity'

  defineOptions({ name: 'OpportunityFollow' })

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
  const handleSearch = () => {
    const params = (searchRef.value?.getFormModel?.() || searchForm.value) as Record<string, any>
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
        }: Api.Common.CommonSearchParams): Promise<Api.Opportunity.FollowList> => {
          const page = await fetchGetOpportunityFollowList({
            current,
            size,
            method: searchParams.method,
            keyword: searchParams.keyword
          })
          return page
        },
        apiParams: { current: 1, size: 10 },
        columnsFactory: (): ColumnOption<Api.Opportunity.FollowItem>[] => [
          { type: 'globalIndex', label: '序号', width: 80 },
          { prop: 'opportunityName', label: '商机编码', minWidth: 160 },
          { prop: 'content', label: '跟进内容', minWidth: 220, useSlot: true },
          { prop: 'followResult', label: '跟进结果', minWidth: 220 },
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

  const handleDelete = (row: Api.Opportunity.FollowItem) => {
    fetchDeleteOpportunityFollow(row.id)
      .then((ok) => {
        if (ok) {
          ElMessage.success('删除成功')
          refreshData()
        } else {
          ElMessage.error('删除失败')
        }
      })
      .catch(() => {
        ElMessage.error('删除失败')
      })
  }

  const editingFollowResult = ref('')
  const editingFollowId = ref<number | null>(null)
  const followResultDialogVisible = ref(false)
  const openEditFollowResult = (row: Api.Opportunity.FollowItem) => {
    if (String(row.followResult || '').trim()) {
      ElMessage.error('该跟进记录已填写结果，不能再次编辑')
      return
    }
    editingFollowId.value = row.id
    editingFollowResult.value = row.followResult || ''
    followResultDialogVisible.value = true
  }
  const saveFollowResultOnly = async () => {
    if (!editingFollowId.value) {
      followResultDialogVisible.value = false
      return
    }
    await fetchUpdateOpportunityFollowResult({
      id: editingFollowId.value,
      followResult: editingFollowResult.value
    })
    ElMessage.success('跟进结果已更新')
    followResultDialogVisible.value = false
    refreshData()
  }
</script>

<style scoped>
  .art-table-card {
    margin-top: 0;
  }
</style>
