# Example Vue Files for Plugin Verification

用于验证 Vue Hierarchy 插件解析效果的示例文件。

## 目录结构

```
example/
├── vue2-options-api/
│   └── UserManager.vue      # Vue 2 Options API 完整示例
└── vue3-composition-api/
    └── UserManager.vue       # Vue 3 <script setup> + TypeScript 完整示例
```

## 验证方法

1. 在 VS Code 中打开本项目
2. 按 `F5` 启动插件开发宿主
3. 在宿主窗口中打开 `example/` 目录下的 `.vue` 文件
4. 查看左侧 **Vue Hierarchy** 面板中的结构树

## Vue 2 Options API 覆盖场景

| 分类 | 覆盖项 |
|------|--------|
| **components** | SearchBar, UserCard, UserForm, Pagination, Modal |
| **mixins** | authMixin, logMixin |
| **directives** | focus, highlight |
| **props** | 5 个 prop（String, Number, Boolean, Array，含 required/default） |
| **emits** | 3 个事件（数组形式） |
| **data** | 11 个 data 属性 |
| **computed** | 5 个计算属性（含 get/set 形式的 sortedUsers） |
| **watch** | 3 个 watcher（函数/对象/深层路径） |
| **filters** | capitalize, truncate |
| **provide** | 函数形式 provide（3 个 key） |
| **inject** | 数组形式 inject（2 个 key） |
| **lifecycle** | 全部 11 个生命周期钩子 |
| **methods** | 14 个方法 |
| **template** | ✅ |
| **style** | scoped |

## Vue 3 Composition API 覆盖场景

| 分类 | 覆盖项 |
|------|--------|
| **props** | `withDefaults(defineProps<Props>(), {...})` 类型声明 + 默认值 |
| **emits** | `defineEmits<{...}>()` 类型声明（call signature 形式） |
| **state** | `ref` × 8, `reactive` × 2, `shallowRef` × 1, `readonly` × 1 |
| **computed** | 5 个 `computed()`（含泛型 `computed<string>`） |
| **watch** | `watch(单源)`, `watch(getter)`, `watch([多源])`, `watchEffect()`, `const stop = watch(...)` |
| **lifecycle** | `onBeforeMount`, `onMounted`, `onUnmounted` |
| **provide** | 3 个 `provide()` 调用 |
| **inject** | 2 个 `inject()` 调用（含泛型） |
| **composables** | `useRouter()`, `useAuth()` (解构), `useDebounce()`, `usePagination()` |
| **expose** | `defineExpose({ fetchUsers, closeModal, totalCount })` |
| **template** | ✅ |
| **style** | scoped + 全局（2 blocks） |
