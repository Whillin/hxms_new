<template>
  <div class="employee-page art-full-height">
    <ElCard class="art-table-card" shadow="never">
      <h3>员工管理</h3>
      <p>这里是员工管理页面的占位内容，可后续接入表格和表单。</p>
    </ElCard>
  </div>
</template>

<script setup lang="ts">
  defineOptions({ name: 'Employee' })
</script>

<style lang="scss" scoped>
  .employee-page {
    h3 {
      margin: 0 0 12px;
      font-weight: 600;
      color: var(--art-text-gray-800);
    }
  }
</style>