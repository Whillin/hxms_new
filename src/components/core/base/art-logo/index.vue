<!-- 系统logo -->
<template>
  <div class="art-logo">
    <img :style="logoStyle" :src="logoSrc" alt="logo" />
  </div>
</template>

<script setup lang="ts">
  defineOptions({ name: 'ArtLogo' })
  import { storeToRefs } from 'pinia'
  import { useSettingStore } from '@/store/modules/setting'
  import logoDark from '@imgs/common/logo.webp'
  import logoLight from '@imgs/common/logo1.webp'

  interface Props {
    /** logo 大小 */
    size?: number | string
  }

  const props = withDefaults(defineProps<Props>(), {
    size: 36
  })

  const logoStyle = computed(() => ({ width: `${props.size}px` }))
  const { isDark } = storeToRefs(useSettingStore())
  const logoSrc = computed(() => (isDark.value ? logoDark : logoLight))
</script>

<style lang="scss" scoped>
  .art-logo {
    display: flex;
    align-items: center;
    justify-content: center;

    img {
      width: 100%;
      height: 100%;
    }
  }
</style>
