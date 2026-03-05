## ADDED Requirements

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
