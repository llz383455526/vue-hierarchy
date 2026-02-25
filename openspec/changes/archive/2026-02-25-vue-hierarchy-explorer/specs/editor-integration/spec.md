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
