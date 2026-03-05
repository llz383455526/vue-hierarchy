## ADDED Requirements

### Requirement: Script Setup 检测

系统 SHALL 检测 `<script setup>` 块并使用 Composition API 解析路径，区别于 Options API 的 `export default` 解析路径。

#### Scenario: 纯 script setup 文件

- **WHEN** 输入的 `.vue` 文件仅包含 `<script setup>` 块
- **THEN** 系统使用 Composition API 解析路径处理该文件

#### Scenario: 纯 script 文件（无 setup）

- **WHEN** 输入的 `.vue` 文件仅包含 `<script>` 块（无 setup 属性）
- **THEN** 系统使用 Options API 解析路径处理该文件

#### Scenario: script setup 带 TypeScript

- **WHEN** 输入的 `<script setup lang="ts">` 块
- **THEN** 系统启用 TypeScript 插件进行 AST 解析

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

### Requirement: computed 解析

系统 SHALL 识别 `computed()` 调用并归类到 `computed` 分类。

#### Scenario: 基本 computed

- **WHEN** `const fullName = computed(() => firstName.value + lastName.value)`
- **THEN** 系统提取 "fullName"，分类为 computed

#### Scenario: 带类型的 computed

- **WHEN** `const total = computed<number>(() => items.value.length)`
- **THEN** 系统提取 "total"，detail 显示类型 "number"

### Requirement: watch 解析

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

### Requirement: 生命周期钩子解析

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
