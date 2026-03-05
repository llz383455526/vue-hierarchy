## ADDED Requirements

### Requirement: SFC 块提取

系统 SHALL 使用 `@vue/compiler-sfc` 的 `parse()` 函数从 `.vue` 文件文本中提取 `<script>` 块的内容和元信息（lang 属性、起始行偏移量）。

#### Scenario: 提取普通 script 块

- **WHEN** 输入包含 `<script>` 块的 `.vue` 文件文本
- **THEN** 系统返回 script 块的源码内容、lang 属性值（默认 "js"）和 `<script>` 标签在文件中的起始行号

#### Scenario: 提取 TypeScript script 块

- **WHEN** 输入包含 `<script lang="ts">` 的 `.vue` 文件文本
- **THEN** 系统返回 script 块内容，lang 属性值为 "ts"

#### Scenario: 无 script 块

- **WHEN** 输入的 `.vue` 文件不包含 `<script>` 块
- **THEN** 系统返回空的解析结果（无节点）

#### Scenario: 同时存在 script 和 script setup

- **WHEN** 输入的 `.vue` 文件同时包含 `<script>` 和 `<script setup>` 块
- **THEN** 系统优先解析 `<script setup>` 块

#### Scenario: 纯 script setup 文件

- **WHEN** 输入的 `.vue` 文件仅包含 `<script setup>` 块
- **THEN** 系统使用 Composition API 解析路径处理该文件

#### Scenario: script setup 带 TypeScript

- **WHEN** 输入的 `<script setup lang="ts">` 块
- **THEN** 系统启用 TypeScript 插件进行 AST 解析

### Requirement: AST 解析

系统 SHALL 使用 `@babel/parser` 将 `<script>` 块内容解析为 AST，支持 JavaScript 和 TypeScript 语法。

#### Scenario: 解析 JavaScript

- **WHEN** script 块 lang 为 "js" 或未指定
- **THEN** 系统使用 @babel/parser 并启用 decorators 等常见插件成功解析为 AST

#### Scenario: 解析 TypeScript

- **WHEN** script 块 lang 为 "ts"
- **THEN** 系统使用 @babel/parser 并启用 typescript 插件成功解析为 AST

#### Scenario: 解析失败

- **WHEN** script 块内容存在语法错误无法解析
- **THEN** 系统返回空的解析结果而不抛出异常

### Requirement: 导出对象定位

系统 SHALL 从 AST 中定位 Options API 的组件选项对象，支持 `export default { ... }` 和 `export default defineComponent({ ... })` 两种模式。

#### Scenario: 直接导出对象字面量

- **WHEN** AST 中存在 `export default { props: {...}, methods: {...} }`
- **THEN** 系统定位到该 ObjectExpression 作为组件选项对象

#### Scenario: defineComponent 包裹

- **WHEN** AST 中存在 `export default defineComponent({ props: {...} })`
- **THEN** 系统定位到 defineComponent 第一个参数的 ObjectExpression 作为组件选项对象

#### Scenario: 无 export default

- **WHEN** AST 中不存在 `export default` 声明
- **THEN** 系统返回空的解析结果

### Requirement: Props 提取

系统 SHALL 从组件选项对象中提取 `props` 选项的所有属性，记录每个 prop 的名称、类型信息、默认值和源码位置。

#### Scenario: 数组语法 props

- **WHEN** props 定义为数组 `props: ['title', 'count']`
- **THEN** 系统提取每个字符串元素作为 prop 名称，无类型信息

#### Scenario: 对象语法 props（简写）

- **WHEN** props 定义为 `props: { title: String, count: Number }`
- **THEN** 系统提取每个属性名和对应的类型标识符名称

#### Scenario: 对象语法 props（完整）

- **WHEN** props 定义为 `props: { count: { type: Number, default: 0, required: true } }`
- **THEN** 系统提取属性名、type 值、default 值、required 值

#### Scenario: 行列位置记录

- **WHEN** 提取任意 prop
- **THEN** 系统记录该 prop 在 `.vue` 文件中的准确行号（包含 `<script>` 标签的行偏移）

### Requirement: Data 提取

系统 SHALL 从组件选项对象中提取 `data()` 函数返回值的所有属性。

#### Scenario: data 函数返回对象

- **WHEN** data 定义为 `data() { return { isLoading: false, list: [] } }`
- **THEN** 系统提取 return 对象中每个属性的名称和源码位置

#### Scenario: data 箭头函数

- **WHEN** data 定义为 `data: () => ({ isLoading: false })`
- **THEN** 系统提取箭头函数返回对象中每个属性的名称和源码位置

#### Scenario: data 为纯对象（Vue 2 根实例）

- **WHEN** data 定义为 `data: { message: 'hello' }`
- **THEN** 系统提取该对象的每个属性的名称和源码位置

### Requirement: Methods 提取

系统 SHALL 从组件选项对象中提取 `methods` 选项的所有方法名。

#### Scenario: 提取普通方法

- **WHEN** methods 定义为 `methods: { handleClick() {}, fetchData() {} }`
- **THEN** 系统提取每个方法名（"handleClick"、"fetchData"）和源码位置

#### Scenario: 提取 async 方法

- **WHEN** methods 中存在 `async fetchData() {}`
- **THEN** 系统提取方法名并标注为 async

### Requirement: Computed 提取

系统 SHALL 从组件选项对象中提取 `computed` 选项的所有计算属性名。

#### Scenario: 函数语法

- **WHEN** computed 定义为 `computed: { fullName() { return ... } }`
- **THEN** 系统提取计算属性名和源码位置

#### Scenario: getter/setter 语法

- **WHEN** computed 定义为 `computed: { fullName: { get() {}, set() {} } }`
- **THEN** 系统提取计算属性名和源码位置

### Requirement: Watch 提取

系统 SHALL 从组件选项对象中提取 `watch` 选项的所有监听器。

#### Scenario: 函数语法

- **WHEN** watch 定义为 `watch: { count(newVal) {} }`
- **THEN** 系统提取监听的属性名和源码位置

#### Scenario: 对象语法（含 deep/immediate）

- **WHEN** watch 定义为 `watch: { items: { handler() {}, deep: true } }`
- **THEN** 系统提取监听属性名，并标注 deep/immediate 标记

#### Scenario: 字符串路径 key

- **WHEN** watch key 为字符串 `watch: { 'obj.prop': function() {} }`
- **THEN** 系统正确提取该字符串路径作为监听名

### Requirement: Lifecycle Hooks 提取

系统 SHALL 从组件选项对象中提取所有生命周期钩子。

#### Scenario: 识别 Vue 2 生命周期

- **WHEN** 组件选项包含 `beforeCreate`、`created`、`beforeMount`、`mounted`、`beforeUpdate`、`updated`、`beforeDestroy`、`destroyed` 中的任意钩子
- **THEN** 系统将其识别为生命周期钩子并提取名称和源码位置

#### Scenario: 识别 Vue 3 生命周期

- **WHEN** 组件选项包含 `beforeUnmount`、`unmounted` 等 Vue 3 新增钩子
- **THEN** 系统将其识别为生命周期钩子并提取名称和源码位置

### Requirement: Components 提取

系统 SHALL 从组件选项对象中提取 `components` 选项的所有注册组件名。

#### Scenario: 提取注册组件

- **WHEN** components 定义为 `components: { ChildA, ChildB: SomeComponent }`
- **THEN** 系统提取每个注册名（"ChildA"、"ChildB"）和源码位置

### Requirement: 其他选项提取

系统 SHALL 从组件选项对象中提取 `emits`、`mixins`、`directives`、`filters`、`provide`、`inject` 等选项。

#### Scenario: emits 数组

- **WHEN** emits 定义为 `emits: ['change', 'update']`
- **THEN** 系统提取每个事件名

#### Scenario: mixins 数组

- **WHEN** mixins 定义为 `mixins: [mixin1, mixin2]`
- **THEN** 系统提取每个 mixin 标识符名称

#### Scenario: directives 对象

- **WHEN** directives 定义为 `directives: { focus, highlight }`
- **THEN** 系统提取每个指令名称

### Requirement: 行号偏移计算

系统 SHALL 将 AST 中的行号与 `<script>` 标签在 `.vue` 文件中的起始行进行偏移叠加，确保最终行号指向 `.vue` 文件中的正确位置。

#### Scenario: 行号偏移

- **WHEN** `<script>` 标签位于 `.vue` 文件第 10 行，AST 节点在 script 内容第 5 行
- **THEN** 系统返回该节点在 `.vue` 文件中的行号为第 14 行（10 + 5 - 1，因为 script 内容从标签下一行开始）

### Requirement: 解析性能

系统 SHALL 在 50ms 内完成中等大小（500 行以内）`.vue` 文件的完整解析。

#### Scenario: 中等文件解析

- **WHEN** 输入 500 行的 `.vue` 文件
- **THEN** 完整解析流程（SFC 拆分 + AST 解析 + 选项提取）在 50ms 内完成

### Requirement: defineProps 解析

系统 SHALL 从 `defineProps()` 调用中提取所有 prop 定义，支持运行时声明和 TypeScript 纯类型声明。

#### Scenario: 运行时对象语法

- **WHEN** `defineProps({ title: String, count: { type: Number, default: 0 } })`
- **THEN** 系统提取 "title"（类型 String）和 "count"（类型 Number）

#### Scenario: 运行时数组语法

- **WHEN** `defineProps(['title', 'count'])`
- **THEN** 系统提取 "title" 和 "count"，无类型信息

#### Scenario: TypeScript 类型声明

- **WHEN** `defineProps<{ title: string; count?: number }>()`
- **THEN** 系统从 TSTypeLiteral 中提取 "title"（类型 string）和 "count"（类型 number?）

#### Scenario: withDefaults 包裹

- **WHEN** `withDefaults(defineProps<{ title?: string }>(), { title: 'hello' })`
- **THEN** 系统穿透 withDefaults 包裹，从内部 defineProps 提取 props

### Requirement: defineEmits 解析

系统 SHALL 从 `defineEmits()` 调用中提取所有事件定义。

#### Scenario: 数组语法

- **WHEN** `defineEmits(['update', 'close'])`
- **THEN** 系统提取 "update" 和 "close"

#### Scenario: TypeScript 调用签名

- **WHEN** `defineEmits<{ (e: 'update', value: string): void; (e: 'close'): void }>()`
- **THEN** 系统从 TSCallSignatureDeclaration 中提取事件名 "update" 和 "close"

#### Scenario: TypeScript 属性签名

- **WHEN** `defineEmits<{ update: [value: string]; close: [] }>()`
- **THEN** 系统从 TSPropertySignature 中提取事件名 "update" 和 "close"

### Requirement: 响应式状态解析

系统 SHALL 识别 Vue 响应式 API 调用并归类到 `state` 分类。

#### Scenario: ref 调用

- **WHEN** `const count = ref(0)`
- **THEN** 系统提取 "count"，分类为 state，detail 为 "ref"

#### Scenario: reactive 调用

- **WHEN** `const state = reactive({ name: '', age: 0 })`
- **THEN** 系统提取 "state"，分类为 state，detail 为 "reactive"

#### Scenario: 带泛型类型提示

- **WHEN** `const user = ref<User | null>(null)`
- **THEN** 系统提取 "user"，detail 为 "ref<User | null>"

#### Scenario: 其他响应式函数

- **WHEN** 使用 `shallowRef`, `shallowReactive`, `readonly`, `shallowReadonly`, `triggerRef`, `customRef`, `markRaw`, `toRaw`
- **THEN** 系统均识别并归类到 state 分类

### Requirement: computed 解析 (Composition API)

系统 SHALL 识别 `computed()` 调用并归类到 `computed` 分类。

#### Scenario: 基本 computed

- **WHEN** `const fullName = computed(() => firstName.value + lastName.value)`
- **THEN** 系统提取 "fullName"，分类为 computed

#### Scenario: 带类型的 computed

- **WHEN** `const total = computed<number>(() => items.value.length)`
- **THEN** 系统提取 "total"，detail 显示类型 "number"

### Requirement: watch 解析 (Composition API)

系统 SHALL 识别 watch 相关 API 调用并归类到 `watch` 分类。

#### Scenario: watch 单个源

- **WHEN** `watch(count, (newVal) => { ... })`
- **THEN** 系统提取 "watch(count)"

#### Scenario: watch getter 函数

- **WHEN** `watch(() => route.params, (newVal) => { ... })`
- **THEN** 系统提取 "watch(())"

#### Scenario: watch 数组源

- **WHEN** `watch([firstName, lastName], ([a, b]) => { ... })`
- **THEN** 系统提取 "watch([firstName, lastName])"

#### Scenario: watchEffect

- **WHEN** `watchEffect(() => { ... })`
- **THEN** 系统提取 "watchEffect"

#### Scenario: 赋值给变量的 watch

- **WHEN** `const stop = watch(count, () => { ... })`
- **THEN** 系统提取 "watch(count)"，detail 为 "→ stop"

### Requirement: 生命周期钩子解析 (Composition API)

系统 SHALL 识别 Composition API 生命周期钩子调用并归类到 `lifecycle` 分类。

#### Scenario: 识别所有钩子

- **WHEN** 代码包含 `onBeforeMount`, `onMounted`, `onBeforeUpdate`, `onUpdated`, `onBeforeUnmount`, `onUnmounted`, `onActivated`, `onDeactivated`, `onErrorCaptured`, `onRenderTracked`, `onRenderTriggered`, `onServerPrefetch`
- **THEN** 系统将所有钩子识别并归类到 lifecycle 分类

### Requirement: provide / inject 解析

系统 SHALL 识别 `provide()` 和 `inject()` 调用。

#### Scenario: provide 字符串 key

- **WHEN** `provide('theme', themeRef)`
- **THEN** 系统提取 "theme"，分类为 provide

#### Scenario: provide Symbol key

- **WHEN** `provide(ThemeSymbol, themeRef)`
- **THEN** 系统提取 "ThemeSymbol"，分类为 provide

#### Scenario: inject 字符串 key

- **WHEN** `const theme = inject('theme')`
- **THEN** 系统提取 "theme"，分类为 inject，detail 为 "theme"

### Requirement: Composable 调用解析

系统 SHALL 识别以 `use` 开头的函数调用（composable 模式），并归类到 `composables` 分类。

#### Scenario: 简单赋值

- **WHEN** `const router = useRouter()`
- **THEN** 系统提取 "useRouter"，detail 为 "→ router"

#### Scenario: 解构赋值

- **WHEN** `const { user, isAuthenticated, logout } = useAuth()`
- **THEN** 系统提取 "useAuth"，detail 为 "→ { user, isAuthenticated, logout }"

#### Scenario: 短名称不识别

- **WHEN** `const x = use()` 或 `const x = us()`
- **THEN** 系统不将其识别为 composable（名称需为 "use" + 至少 1 个额外字符）

### Requirement: defineExpose 解析

系统 SHALL 识别 `defineExpose()` 调用，提取暴露给父组件的成员名。

#### Scenario: 对象字面量暴露

- **WHEN** `defineExpose({ submit, reset, formData })`
- **THEN** 系统提取 "submit"、"reset"、"formData"，归类到 expose 分类

### Requirement: 模板引用扫描

系统 SHALL 扫描 `<template>` 块内容，提取所有对组件内部标识符（data/computed/props/state/methods）的引用，记录引用次数和引用位置。

#### Scenario: 插值表达式引用

- **WHEN** 模板包含 `{{ userName }}`
- **THEN** 系统识别 `userName` 被引用 1 次，记录引用行号和引用类型为 "interpolation"

#### Scenario: 指令绑定引用

- **WHEN** 模板包含 `:title="userName"` 或 `v-bind:title="userName"`
- **THEN** 系统识别 `userName` 被引用 1 次，记录引用类型为 "v-bind"

#### Scenario: 条件/循环指令引用

- **WHEN** 模板包含 `v-if="isLoading"` 或 `v-for="item in items"`
- **THEN** 系统识别 `isLoading` 和 `items` 分别被引用 1 次，记录引用类型为 "v-if" / "v-for"

#### Scenario: 事件绑定引用

- **WHEN** 模板包含 `@click="handleSubmit"` 或 `v-on:click="handleSubmit"`
- **THEN** 系统识别 `handleSubmit` 被引用 1 次，记录引用类型为 "event"

#### Scenario: 复合表达式引用

- **WHEN** 模板包含 `{{ items.length > 0 ? userName : 'N/A' }}`
- **THEN** 系统识别 `items` 和 `userName` 各被引用 1 次

#### Scenario: 多次引用计数

- **WHEN** `userName` 在模板中出现 3 次（插值 1 次、v-bind 1 次、v-if 1 次）
- **THEN** 系统记录 `userName` 总引用次数为 3，并保存所有 3 个引用位置

#### Scenario: 无引用的标识符

- **WHEN** data 中定义了 `internalFlag` 但模板中从未使用
- **THEN** 该标识符的引用次数为 0，不附加引用信息

### Requirement: 引用信息输出格式

系统 SHALL 将引用信息附加到已解析的 HierarchyNode 上，通过扩展的字段传递。

#### Scenario: detail 字段追加引用计数

- **WHEN** `userName` 类型为 String，被引用 3 次
- **THEN** 节点 detail 显示为 `String  ⟵ ×3`

#### Scenario: 无类型有引用

- **WHEN** data 属性 `isLoading` 无类型信息，被引用 2 次
- **THEN** 节点 detail 显示为 `⟵ ×2`

#### Scenario: tooltip 显示引用位置

- **WHEN** `userName` 在 line 15（插值）、line 22（v-bind）、line 30（v-if）被引用
- **THEN** 节点 tooltip 包含 `引用: L15 {{ }}, L22 :title, L30 v-if`

### Requirement: 标识符提取策略

系统 SHALL 使用正则表达式从模板文本中提取标识符引用，而非完整的 AST 解析。

#### Scenario: 插值提取

- **WHEN** 扫描模板文本
- **THEN** 系统使用正则匹配 `\{\{\s*(.+?)\s*\}\}` 提取插值表达式，再从中提取顶层标识符

#### Scenario: 指令绑定提取

- **WHEN** 扫描模板文本
- **THEN** 系统匹配 `:attr="expr"`、`v-bind:attr="expr"`、`v-if="expr"`、`v-for="... in expr"`、`v-show="expr"`、`v-model="expr"` 模式

#### Scenario: 事件绑定提取

- **WHEN** 扫描模板文本
- **THEN** 系统匹配 `@event="handler"` 和 `v-on:event="handler"` 模式，提取处理器名称

#### Scenario: 标识符白名单匹配

- **WHEN** 从模板表达式中提取出标识符列表
- **THEN** 仅统计与已解析的 data/computed/props/state/methods 名称匹配的标识符，忽略 JavaScript 内置名称（`true`、`false`、`null`、`undefined`、`console`、`Math` 等）

### Requirement: 事件绑定 → 方法关联

系统 SHALL 将模板中的事件绑定（`@click="handler"`）与 methods/functions 进行关联，在方法节点上显示绑定来源。

#### Scenario: 方法被事件绑定

- **WHEN** 模板中 `@click="handleSubmit"` 出现在 line 15
- **THEN** `handleSubmit` 方法节点 detail 追加 `← @click (L15)`

#### Scenario: 方法被多个事件绑定

- **WHEN** `handleSubmit` 同时被 `@click` (line 15) 和 `@submit` (line 30) 绑定
- **THEN** 方法节点 detail 显示 `← @click (L15), @submit (L30)`

#### Scenario: 内联表达式事件

- **WHEN** 模板中 `@click="count++"` 使用内联表达式
- **THEN** 系统识别 `count` 被引用，但不将其作为方法绑定关联

### Requirement: 方法间调用关系

系统 SHALL 扫描 methods 函数体中对同组件其他 method 的调用。

#### Scenario: Options API this.method() 调用

- **WHEN** `handleSubmit` 方法体内包含 `this.validateForm()` 和 `this.saveData()`
- **THEN** 系统记录 `handleSubmit` 调用了 `validateForm` 和 `saveData`

#### Scenario: Composition API 直接调用

- **WHEN** `<script setup>` 中 `handleSubmit` 函数体内包含 `validateForm()`
- **THEN** 系统记录 `handleSubmit` 调用了 `validateForm`（前提：`validateForm` 是同组件已知函数）

#### Scenario: 调用关系显示

- **WHEN** `handleSubmit` 调用了 `validateForm` 和 `saveData`
- **THEN** `handleSubmit` 节点的 tooltip 包含 `调用: validateForm(), saveData()`

#### Scenario: 被调用标记

- **WHEN** `validateForm` 被 `handleSubmit` 调用
- **THEN** `validateForm` 节点 detail 追加 `← handleSubmit`

### Requirement: Watch 数据源关联

系统 SHALL 将 watcher 监听的数据源与已解析的 data/props/state 做关联匹配。

#### Scenario: Options API watch 关联

- **WHEN** `watch: { items: { handler() {} } }`，且 `items` 是 data 属性
- **THEN** `items` watcher 节点 detail 追加数据源类型 `← data`

#### Scenario: Composition API watch 关联

- **WHEN** `watch(searchQuery, ...)` 且 `searchQuery` 是 ref state
- **THEN** `watch(searchQuery)` 节点 detail 已通过现有逻辑显示源名称，无额外变更需要

### Requirement: 引用分析性能

系统 SHALL 在 20ms 内完成中等大小（200 行以内）模板块的引用扫描。

#### Scenario: 性能要求

- **WHEN** 模板块包含 200 行 HTML/Vue 模板
- **THEN** 引用扫描和交叉匹配在 20ms 内完成
