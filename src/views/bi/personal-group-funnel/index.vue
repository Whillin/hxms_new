<template>
  <div class="page-content art-full-height">
    <ElCard class="art-custom-card" shadow="never">
      <template #header>
        <div class="card-title">个人/小组转化分析</div>
      </template>

      <ElTabs v-model="active" class="pg-tabs" tab-position="bottom">
        <ElTabPane label="销售小组转化分析" name="group">
          <section class="tab-section">
            <SalesProcess
              :title="'销售小组到店转化分析'"
              :forcedFunnelType="'person'"
              :hideConsultantSelect="true"
              :preferBlankStore="true"
              :ignoreStoreWhenTeamSelected="false"
            />
          </section>
        </ElTabPane>
        <ElTabPane label="销售顾问转化分析" name="consultant">
          <section class="tab-section">
            <SalesProcess
              :title="'销售顾问到店转化分析'"
              :forcedFunnelType="'person'"
              :hideTeamSelect="true"
              :hideCompareStore="true"
              :hideCompareTeam="true"
            />
          </section>
        </ElTabPane>
        <ElTabPane label="邀约专员到店分析" name="inviter">
          <section class="tab-section">
            <SalesProcess
              :title="'邀约专员到店转化分析'"
              :forcedFunnelType="'person'"
              :hideTeamSelect="true"
              :hideCompareStore="true"
              :hideCompareTeam="true"
              :personRole="'inviter'"
            />
          </section>
        </ElTabPane>
      </ElTabs>
    </ElCard>
  </div>
</template>

<script setup lang="ts">
  import { ref } from 'vue'
  import SalesProcess from '@views/bi/sales-process/index.vue'

  const active = ref<'group' | 'consultant' | 'inviter'>('group')
</script>

<style lang="scss" scoped>
  .card-title {
    font-size: 16px;
    font-weight: 600;
  }
  .page-content.art-full-height {
    display: flex;
    flex-direction: column;
    overflow: auto !important;
  }
  .art-custom-card {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }

  :deep(.art-custom-card .el-card__body) {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
    overflow: visible !important;
  }

  .pg-tabs {
    margin-top: 8px;
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }

  :deep(.el-tabs__content) {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
  }

  :deep(.el-tabs__header.is-bottom) {
    position: sticky;
    bottom: 0;
    z-index: 2;
    background: var(--art-main-bg-color);
    border-top: 1px solid var(--art-border-color);
  }
  .tab-section {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
</style>
