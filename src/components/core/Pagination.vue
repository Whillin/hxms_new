&lt;template&gt; &lt;el-pagination v-bind=&quot;$attrs&quot; :current-page=&quot;current&quot;
:page-size=&quot;size&quot; :page-sizes=&quot;pageSizes&quot; :total=&quot;total&quot;
:layout=&quot;layout&quot; @size-change=&quot;handleSizeChange&quot;
@current-change=&quot;handleCurrentChange&quot; /&gt; &lt;/template&gt; &lt;script setup
lang=&quot;ts&quot;&gt; import { computed } from 'vue' defineOptions({ name: 'ArtPagination' })
const props = withDefaults( defineProps&lt;{ current?: number size?: number total?: number
pageSizes?: number[] layout?: string }&gt;(), { current: 1, size: 10, total: 0, pageSizes: () =&gt;
[10, 20, 50, 100], layout: 'total, sizes, prev, pager, next, jumper' } ) const emit =
defineEmits&lt;{ (e: 'update:current', val: number): void (e: 'update:size', val: number): void (e:
'size-change', val: number): void (e: 'current-change', val: number): void }&gt;() const current =
computed({ get: () =&gt; props.current, set: (val) =&gt; emit('update:current', val) }) const size =
computed({ get: () =&gt; props.size, set: (val) =&gt; emit('update:size', val) }) const
handleSizeChange = (val: number) =&gt; { emit('size-change', val) emit('update:size', val) } const
handleCurrentChange = (val: number) =&gt; { emit('current-change', val) emit('update:current', val)
} &lt;/script&gt; &lt;style scoped&gt; /* 可添加自定义样式 */ &lt;/style&gt;
