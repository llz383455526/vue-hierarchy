## ADDED Requirements

### Requirement: 活动栏视图容器注册

系统 SHALL 在 VSCode 左侧活动栏注册一个名为 "Vue Hierarchy" 的视图容器，带有专属图标。

#### Scenario: 显示活动栏图标

- **WHEN** 扩展激活后
- **THEN** VSCode 左侧活动栏出现 "Vue Hierarchy" 图标，点击可切换到该面板

### Requirement: TreeView 注册

系统 SHALL 在 "Vue Hierarchy" 视图容器中注册一个名为 "Structure" 的 TreeView。

#### Scenario: 打开 vue 文件时显示结构

- **WHEN** 用户打开一个 `.vue` 文件并切换到 Vue Hierarchy 面板
- **THEN** TreeView 中显示该文件的 Options API 结构树

#### Scenario: 非 vue 文件时显示空状态

- **WHEN** 当前激活的编辑器不是 `.vue` 文件
- **THEN** TreeView 显示提示信息（如 "Open a .vue file to see its structure"）

### Requirement: 树节点层级结构

系统 SHALL 以两级树结构展示解析结果：第一级为选项分类节点（如 props、methods），第二级为该分类下的具体成员。

#### Scenario: 分类节点显示

- **WHEN** 组件包含 3 个 props 和 2 个 methods
- **THEN** 树中显示 "props (3)" 和 "methods (2)" 两个可展开的分类节点

#### Scenario: 成员节点显示

- **WHEN** 展开 "props" 分类节点
- **THEN** 显示该分类下所有 prop 的名称，props 带类型信息则显示为 "name: Type" 格式

#### Scenario: 空分类不显示

- **WHEN** 组件不包含 watch 选项
- **THEN** 树中不显示 "watch" 分类节点

### Requirement: 节点展开与收缩

系统 SHALL 支持分类节点的展开和收缩操作。

#### Scenario: 默认展开

- **WHEN** 首次解析并显示树
- **THEN** 所有分类节点默认展开，用户可一眼看到完整结构

#### Scenario: 收缩后保持状态

- **WHEN** 用户手动收缩某个分类节点
- **THEN** 该节点保持收缩状态，直到用户再次展开

### Requirement: 节点图标

系统 SHALL 为不同类型的分类节点显示不同的 VSCode 主题图标（codicons），以便视觉区分。

#### Scenario: 分类节点图标

- **WHEN** 显示分类节点
- **THEN** props 显示 symbol-field 图标，data 显示 database 图标，methods 显示 symbol-method 图标，computed 显示 symbol-property 图标，watch 显示 eye 图标，lifecycle 显示 history 图标，components 显示 symbol-class 图标

#### Scenario: 成员节点图标

- **WHEN** 显示成员节点
- **THEN** 成员节点显示与其所属分类一致的图标

### Requirement: 节点装饰信息

系统 SHALL 在成员节点上显示额外的装饰信息（TreeItem.description）。

#### Scenario: Props 类型显示

- **WHEN** prop 定义了类型（如 `title: String`）
- **THEN** 节点显示为 label="title", description="String"

#### Scenario: Methods async 标记

- **WHEN** method 声明为 async
- **THEN** 节点 description 显示 "async"

#### Scenario: Watch deep/immediate 标记

- **WHEN** watcher 配置了 deep: true
- **THEN** 节点 description 显示 "deep"

### Requirement: 刷新按钮

系统 SHALL 在 TreeView 标题栏提供手动刷新按钮。

#### Scenario: 点击刷新

- **WHEN** 用户点击 TreeView 标题栏的刷新图标
- **THEN** 系统重新解析当前文件并刷新树

### Requirement: 内置搜索支持

系统 SHALL 支持 VSCode TreeView 内置的 Ctrl+F 搜索过滤功能。

#### Scenario: 搜索过滤

- **WHEN** 用户在 TreeView 中按 Ctrl+F 并输入关键词
- **THEN** TreeView 过滤并高亮匹配的节点
