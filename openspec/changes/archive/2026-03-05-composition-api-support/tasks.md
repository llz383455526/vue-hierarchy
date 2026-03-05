# 任务清单

## Composition API 支持

- [x] 扩展 HierarchyCategory 类型，新增 state, composables, expose, slots
- [x] 定义 COMPOSITION_LIFECYCLE_HOOKS, REACTIVE_STATE_FUNCTIONS, WATCH_FUNCTIONS, DEFINE_MACROS 常量
- [x] 实现 parseScriptSetup() 主函数，遍历 AST 顶层语句
- [x] 实现 getCalleeName() 提取 CallExpression 函数名
- [x] 实现 extractTypeHint() 提取 TypeScript 泛型类型信息
- [x] 实现 parseDefineProps() 解析 defineProps 调用
- [x] 实现 parseDefineEmits() 解析 defineEmits 调用
- [x] 实现 parseDefineExpose() 解析 defineExpose 调用
- [x] 实现 getWatchSource() 提取 watch 监听源描述
- [x] 实现响应式状态（ref/reactive 等）识别和分类
- [x] 实现 computed() 调用识别
- [x] 实现 Composition API 生命周期钩子识别
- [x] 实现 watch/watchEffect 识别
- [x] 实现 provide/inject 识别
- [x] 实现 useXxx() composable 调用识别（含解构显示）
- [x] 在 parseVueFile 中集成 scriptSetup 分支判断
- [x] 更新 CATEGORY_ICONS 和 MEMBER_ICONS 映射

## 测试验证

- [x] 创建 example/vue3-composition-api/UserManager.vue 测试文件
- [x] 创建 example/vue2-options-api/UserManager.vue 测试文件
- [x] 验证插件正确显示所有 Composition API 分类和成员
