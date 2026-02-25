## Context

当前仓库为空白项目，需从零搭建一个 VSCode 扩展。扩展的核心功能是在左侧面板以 TreeView 展示当前 `.vue` 文件的 Options API 结构层级。

技术栈约束：

- VSCode Extension API（TypeScript）
- 解析层使用 `@vue/compiler-sfc` + `@babel/parser`
- 构建使用 esbuild（VSCode 官方推荐的扩展打包方案）
- 目标 VSCode 引擎版本 ^1.74.0

## Goals / Non-Goals

**Goals:**

- 提供一个清晰的 Vue Options API 组件结构视图
- 解析速度 < 50ms（中等大小文件），用户无感知延迟
- 点击节点精准跳转到源码行列
- 编辑时实时刷新，不卡顿
- 项目结构清晰，易于后续扩展（如 Composition API 支持）

**Non-Goals:**

- 不支持 Composition API / `<script setup>`（后续版本）
- 不支持跨文件分析（如追踪 mixin 来源）
- 不提供代码修改/重构功能
- 不解析 `<template>` 或 `<style>` 块的内部结构

## Decisions

### Decision 1: 解析策略 — @vue/compiler-sfc + @babel/parser

**选择**: 使用 `@vue/compiler-sfc` 拆分 SFC 块，再用 `@babel/parser` 解析 `<script>` 内容为 AST。

**替代方案:**

- 正则匹配：速度最快但不可靠，复杂嵌套场景容易出错
- TypeScript Compiler API：VSCode 内置无需额外依赖，但 API 复杂且不直接支持 Vue SFC
- Volar / vue-language-tools：最准确但依赖过重，耦合度高

**理由**: @vue/compiler-sfc 是 Vue 官方解析器，对 SFC 结构解析 100% 准确；@babel/parser 对 JS/TS 解析成熟稳定，支持所有语法特性，AST 中包含完整的 `loc`（行列位置）信息，直接满足跳转需求。两者组合在速度和准确度之间取得最佳平衡。

### Decision 2: AST 遍历策略 — 手动遍历 export default 对象

**选择**: 不使用 `@babel/traverse`，而是手动遍历 AST 中 `export default` 的 `ObjectExpression` 属性。

**理由**: Options API 的结构非常规整 — `export default { ... }` 内部就是一个对象字面量，各选项（props、data、methods 等）是其直接属性。只需：

1. 找到 `ExportDefaultDeclaration`
2. 获取其 `ObjectExpression`
3. 遍历 `properties` 数组，按 key 名分类提取

这比通用的 `@babel/traverse` 更轻量、更快，也减少一个依赖。

### Decision 3: TreeView 实现 — 原生 VSCode TreeDataProvider

**选择**: 使用 VSCode 原生的 `TreeDataProvider` + `TreeItem` API。

**替代方案:**

- WebView：自由度更高但实现复杂，且无法利用 VSCode 内置的树搜索
- TreeView with drag-and-drop：不需要拖拽功能

**理由**: TreeDataProvider 是 VSCode 推荐的树形视图方案，原生支持展开/收缩、图标、description、tooltip、内置搜索（Ctrl+F），完全满足需求。

### Decision 4: 实时刷新策略 — 防抖 300ms

**选择**: 监听 `onDidChangeTextDocument` 事件，使用 300ms 防抖后重新解析并刷新树。

**理由**:

- 不防抖：每次按键都解析，浪费资源
- 防抖 100ms：太短，快速输入时仍会频繁触发
- 防抖 300ms：用户停顿后几乎立即更新，体感流畅
- 防抖 500ms+：延迟明显，体验下降

### Decision 5: 构建工具 — esbuild

**选择**: 使用 esbuild 将扩展打包为单个 JS 文件。

**理由**: VSCode 官方模板已默认使用 esbuild，打包速度极快（< 1s），产出体积小，`@vue/compiler-sfc` 和 `@babel/parser` 都会被 bundle 进去，用户安装扩展时无需下载 node_modules。

### Decision 6: 节点结构设计

每个树节点携带以下信息：

```typescript
interface VueHierarchyNode {
  label: string; // 显示名称，如 "handleClick()"
  type: VueNodeType; // 分类：props | data | computed | methods | ...
  line: number; // 源码行号（1-based）
  column: number; // 源码列号（0-based）
  children?: VueHierarchyNode[]; // 子节点
  detail?: string; // 装饰信息，如 "String" (props 类型)、"async"
}
```

分类节点（如 "props (3)"）作为父节点不可跳转，叶子节点（如 "title: String"）可跳转。

## Risks / Trade-offs

- **[Risk] @vue/compiler-sfc 版本兼容** — Vue 2 和 Vue 3 的 compiler-sfc 是不同包（vue-template-compiler vs @vue/compiler-sfc）。→ **Mitigation**: 使用 @vue/compiler-sfc（Vue 3），其 `parse()` 函数对 Vue 2 风格的 SFC 同样可以正确拆分（SFC 格式本身没有破坏性变更）。

- **[Risk] 打包体积** — @vue/compiler-sfc 和 @babel/parser 体积较大，可能导致扩展安装包 > 1MB。→ **Mitigation**: esbuild tree-shaking 会移除未使用代码；实际只用到 `parse()` 函数，最终体积可控。

- **[Risk] 边缘 case：非标准写法** — 如 `export default defineComponent({ ... })`（Vue 3 + TypeScript）、`Vue.extend({ ... })`（Vue 2 class 风格）。→ **Mitigation**: 第一版处理 `export default { ... }` 和 `export default defineComponent({ ... })` 两种最常见模式，其他模式静默降级为空树。

- **[Risk] data() 返回值提取** — `data()` 是一个函数，需要找到其 `return` 语句再提取属性。→ **Mitigation**: 只查找函数体内的第一个顶层 `ReturnStatement`，取其 `ObjectExpression` 属性。

## Open Questions

- 扩展是否需要支持 `.vue` 文件中 `<script lang="ts">` 的 TypeScript 语法？→ **初步决策**: 是，@babel/parser 通过 `typescript` 插件可直接支持。
- 是否需要解析 `<script>` 和 `<script setup>` 共存的情况？→ **初步决策**: 第一版只解析 `<script>`（非 setup），忽略 `<script setup>` 块。
