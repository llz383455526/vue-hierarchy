# 数据流可视化 — 揭示关系和数据流

## 概述

为 Vue Hierarchy 插件增加"关系感知"能力。当前插件已能展示 Vue 文件的结构组成（有什么），本次变更将进一步展示**数据如何连接**——哪些 state 被模板引用、方法被哪些事件触发、watcher 监听了哪个数据源——让开发者在树视图中一眼看透组件的数据流全貌。

## 动机

仅展示 props/data/computed/methods 列表，等同于一个高级版的大纲视图，帮助有限。开发者在阅读不熟悉的 Vue 组件时，真正的痛点是：

1. **这个 data 在哪里被用了？** — 需要手动搜索 `{{ userName }}`、`:title="userName"`
2. **这个方法谁在调？** — 需要手动搜索 `@click="handleSubmit"`
3. **这个 watcher 监听的是什么？** — 需要跳到 watch 定义处阅读代码
4. **组件整体接口是什么？** — 需要分别查看 props 和 emits 才能理解输入输出

如果树节点本身就能回答这些问题，开发者可以在不离开侧栏的情况下快速建立对组件的整体认知。

## 变更范围

### Capability 1: 模板引用分析 (template-ref-analysis)

扫描 `<template>` 内容，统计每个 data/computed/prop/method 在模板中被引用的次数和位置。

- 在树节点 `detail` 中追加引用计数，如 `userName  String  ⟵ ×3`
- 在节点 `tooltip` 中列出具体引用位置，如 `line 15: {{ userName }}, line 22: :title`
- 引用类型包括：插值 `{{ }}`、指令绑定 `:attr`、事件绑定 `@event`、v-if/v-for 表达式

### Capability 2: 方法调用关系 (method-call-graph)

分析 method 与 template 事件绑定、以及 method 之间的调用关系。

- method 节点 `detail` 显示 template 绑定来源，如 `← @click (line 15)`
- 扫描 method 函数体，识别对同组件内其他 method 的调用
- watcher 节点显示其监听的数据源（已部分实现于 `watch(source)` 格式）

### Capability 3: 组件接口概览 (component-interface)

将 props 和 emits 在树顶部以"接口视图"方式呈现，让开发者快速理解组件的输入和输出契约。

- 添加顶层 `interface` 分类节点，聚合 props（输入）和 emits（输出）
- 显示格式如 `→ props (5)  ← emits (3)`
- 保留原有 props/emits 分类节点不变，interface 节点为补充视图

## 非目标 (Non-goals)

- **跨文件分析** — 不分析 import 的子组件内部实现
- **深层调用链** — 仅分析一级 method 调用，不递归追踪
- **运行时值推断** — 不推断 data 的运行时值或类型变化
- **模板 AST 结构展示** — 已验证价值有限，不在本次范围内

## 影响的文件

- `src/types.ts` — 扩展 HierarchyNode 接口（增加 refCount 等字段），新增 `interface` 分类
- `src/VueFileParser.ts` — 新增模板引用扫描、方法调用图分析逻辑
- `src/VueTreeProvider.ts` — 更新 detail/tooltip 渲染，新增 interface 概览节点
- `example/vue3-composition-api/UserManager.vue` — 验证效果

## 技术思路

### 模板引用扫描

使用正则或简单文本扫描（非 AST）提取模板中的标识符引用：
- `{{ expr }}` 插值内的标识符
- `:attr="expr"` 绑定表达式中的标识符
- `@event="handler"` 事件处理器名称
- `v-if="expr"` / `v-for="item in list"` 指令表达式

将提取的标识符与已解析的 data/computed/props/methods 名称做交叉匹配，统计引用次数和行号。

### 方法调用图

对 methods 对象中每个函数体做简单的标识符扫描：
- 提取 `this.methodName()` 形式的调用（Options API）
- 提取直接函数调用 `methodName()` 形式（Composition API）
- 与同组件已知的方法名交叉匹配

### 组件接口节点

在 `parseVueFile` 返回结果中，基于已解析的 props 和 emits 数据，生成一个聚合的 `interface` 分类节点，不需要额外解析。
