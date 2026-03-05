## ADDED Requirements

### Requirement: 点击跳转到源码

系统 SHALL 在用户点击成员节点时，将编辑器光标跳转到该成员在 `.vue` 文件中的精确源码位置。

#### Scenario: 点击 prop 节点跳转

- **WHEN** 用户点击 "title" prop 节点，该 prop 定义在文件第 15 行第 4 列
- **THEN** 编辑器光标跳转到第 15 行第 4 列，并将该行滚动到可见区域中央

#### Scenario: 点击 method 节点跳转

- **WHEN** 用户点击 "handleClick" method 节点
- **THEN** 编辑器光标跳转到该 method 定义处

#### Scenario: 点击分类节点不跳转

- **WHEN** 用户点击 "props (3)" 分类节点
- **THEN** 分类节点展开或收缩，不触发光标跳转

### Requirement: 编辑时自动刷新

系统 SHALL 在用户编辑 `.vue` 文件时自动重新解析并刷新 TreeView，使用 300ms 防抖避免频繁刷新。

#### Scenario: 编辑后自动刷新

- **WHEN** 用户在当前 `.vue` 文件中新增一个 method 并停止输入超过 300ms
- **THEN** TreeView 自动刷新，methods 分类下出现新增的 method 节点

#### Scenario: 连续输入时不刷新

- **WHEN** 用户连续快速输入字符，每次输入间隔 < 300ms
- **THEN** TreeView 不刷新，直到用户停止输入超过 300ms 后才一次性刷新

#### Scenario: 编辑非 vue 文件不触发

- **WHEN** 用户编辑一个 `.js` 或 `.ts` 文件
- **THEN** TreeView 不触发刷新

### Requirement: 切换文件自动刷新

系统 SHALL 在用户切换激活的编辑器时自动检测并刷新 TreeView。

#### Scenario: 切换到另一个 vue 文件

- **WHEN** 用户从 `A.vue` 切换到 `B.vue`
- **THEN** TreeView 立即刷新为 `B.vue` 的组件结构

#### Scenario: 切换到非 vue 文件

- **WHEN** 用户从 `A.vue` 切换到 `utils.ts`
- **THEN** TreeView 清空并显示空状态提示

#### Scenario: 回到之前的 vue 文件

- **WHEN** 用户从 `utils.ts` 切换回 `A.vue`
- **THEN** TreeView 重新解析并显示 `A.vue` 的结构

### Requirement: 仅处理当前激活文件

系统 SHALL 仅对当前激活的编辑器中的 `.vue` 文件进行解析和展示。

#### Scenario: 多个 vue 文件打开

- **WHEN** 用户打开了 `A.vue`、`B.vue`、`C.vue`，当前激活 `B.vue`
- **THEN** TreeView 仅显示 `B.vue` 的结构

#### Scenario: 无激活编辑器

- **WHEN** 用户关闭所有编辑器标签
- **THEN** TreeView 显示空状态

### Requirement: 扩展激活条件

系统 SHALL 仅在工作空间中存在 `.vue` 文件时激活扩展，以避免不必要的资源消耗。

#### Scenario: 包含 vue 文件的项目

- **WHEN** 用户打开一个包含 `.vue` 文件的工作空间
- **THEN** 扩展激活，活动栏显示 Vue Hierarchy 图标

#### Scenario: 打开 vue 文件时激活

- **WHEN** 用户在编辑器中打开一个 `.vue` 文件
- **THEN** 扩展激活（如果尚未激活）

### Requirement: 光标位置同步到树面板

系统 SHALL 在用户移动编辑器光标时，自动在 Vue Hierarchy 树面板中高亮与光标位置最匹配的结构节点。

#### Scenario: 光标在 ref 定义处

- **WHEN** 用户将光标移到 `const count = ref(0)` 所在行
- **THEN** 树面板中 state 分类下的 "count" 节点被高亮选中

#### Scenario: 光标在生命周期钩子处

- **WHEN** 用户将光标移到 `onMounted(() => { ... })` 所在行
- **THEN** 树面板中 lifecycle 分类下的 "onMounted" 节点被高亮选中

#### Scenario: 光标在两个节点之间

- **WHEN** 用户将光标移到两个已解析节点之间的空行
- **THEN** 树面板高亮行号最接近且不超过光标行的节点

#### Scenario: 光标在 template 区域

- **WHEN** 用户将光标移到 `<template>` 块中
- **THEN** 树面板高亮 "template" 节点

### Requirement: 同步防抖

系统 SHALL 使用 150ms 防抖延迟来避免快速光标移动时频繁触发同步。

#### Scenario: 快速滚动

- **WHEN** 用户连续快速移动光标（间隔 < 150ms）
- **THEN** 仅在最后一次移动后 150ms 才执行同步

### Requirement: 防循环机制

系统 SHALL 防止树面板点击跳转和光标同步之间的无限循环。

#### Scenario: 点击树节点后

- **WHEN** 用户点击树面板中的节点，编辑器跳转到对应行
- **THEN** 该跳转产生的光标变化不触发反向的树面板同步

#### Scenario: 光标触发 reveal 后

- **WHEN** 光标移动触发了树面板 reveal 操作
- **THEN** reveal 导致的 selection 变化不再触发新的同步

### Requirement: 仅可见时同步

系统 SHALL 仅在 Vue Hierarchy 面板可见时执行光标同步，避免不必要的计算。

#### Scenario: 面板隐藏时

- **WHEN** 用户切换到其他侧边栏面板（如资源管理器），Vue Hierarchy 面板不可见
- **THEN** 光标移动不触发任何同步操作
