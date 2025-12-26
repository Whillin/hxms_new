<template>
  <div class="page-content art-full-height">
    <ElCard class="art-custom-card" shadow="never">
      <template #header>
        <div class="card-title">渠道线索转化分析</div>
      </template>

      <ElTabs v-model="active" class="channel-tabs" tab-position="bottom">
        <ElTabPane label="整体到店分析" name="overall">
          <section class="tab-section">
            <SalesProcess :title="'整体到店分析'" />
          </section>
        </ElTabPane>
        <ElTabPane label="线上线索转化分析" name="online">
          <section class="tab-section">
            <OnlineSalesProcess :title="'线上线索转化分析'" />
          </section>
        </ElTabPane>
        <ElTabPane label="展厅到店转化分析" name="showroom">
          <section class="tab-section">
            <SalesProcess :forcedChannelLevel1="'展厅到店'" :title="'展厅到店转化分析'" />
          </section>
        </ElTabPane>
      </ElTabs>
    </ElCard>
  </div>
</template>

<script setup lang="ts">
  import { ref } from 'vue'
  import SalesProcess from '@views/bi/sales-process/index.vue'
  import OnlineSalesProcess from '@views/bi/online-sales-process/index.vue'

  const active = ref<'overall' | 'online' | 'showroom'>('overall')
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
    display: flex;
    flex: 1;
    flex-direction: column;
    min-height: 0;
  }

  :deep(.art-custom-card .el-card__body) {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-height: 0;
    overflow: visible !important;
  }

  .channel-tabs {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-height: 0;
    margin-top: 8px;
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

  .section-body {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 260px;
  }
</style>
