# Composition API / `<script setup>` 支持

## 概述

为 Vue Hierarchy 插件添加 Vue 3 Composition API 和 `<script setup>` 语法的完整解析支持。此前插件仅支持 Options API，无法解析现代 Vue 3 项目中广泛使用的 `<script setup>` 写法。

## 动机

Vue 3 推荐使用 `<script setup>` + Composition API 的开发模式，已成为社区主流。不支持该语法意味着插件对大量 Vue 3 项目无用。

## 变更范围

### 新增解析能力

- **defineProps / withDefaults** — 运行时声明和 TypeScript 纯类型声明
- **defineEmits** — 运行时和类型声明两种模式
- **defineExpose** — 暴露给父组件的成员
- **响应式状态** — ref, reactive, shallowRef, shallowReactive, readonly 等
- **computed** — computed() 调用
- **watch** — watch(), watchEffect(), watchPostEffect(), watchSyncEffect()
- **生命周期钩子** — 全部 Composition API 钩子
- **provide / inject** — 依赖注入
- **Composable** — 识别 useXxx() 模式的组合式函数调用

### 新增分类

- `state` — 响应式状态变量
- `composables` — 组合式函数调用
- `expose` — defineExpose 暴露的成员

### TypeScript 类型提示

- 从泛型参数提取类型信息（如 `ref<string>()`）
- 支持联合类型显示（如 `User | null`）

## 影响的文件

- `src/types.ts` — 新增分类和常量列表
- `src/VueFileParser.ts` — 新增 parseScriptSetup() 及辅助函数
- `package.json` — 版本升级至 0.0.2

## 测试

创建了 `example/` 目录包含完整的验证用例：
- `example/vue3-composition-api/UserManager.vue` — 覆盖所有 Composition API 场景
- `example/vue2-options-api/UserManager.vue` — 覆盖所有 Options API 场景