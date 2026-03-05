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

### Requirement: 引用计数装饰

系统 SHALL 在成员节点的 description 中显示该标识符在模板中的引用次数。

#### Scenario: 有引用的 data 节点

- **WHEN** data 属性 `userName`（类型 String）在模板中被引用 3 次
- **THEN** 节点 description 显示为 `String  ⟵ ×3`

#### Scenario: 有引用无类型的节点

- **WHEN** data 属性 `isLoading` 无类型信息，被引用 2 次
- **THEN** 节点 description 显示为 `⟵ ×2`

#### Scenario: 无引用的节点

- **WHEN** data 属性 `internalFlag` 在模板中未被引用
- **THEN** 节点 description 不追加引用信息（保持原有显示）

#### Scenario: 引用计数与原有 detail 并存

- **WHEN** computed 属性 `fullName` 有 detail "get/set"，被引用 1 次
- **THEN** 节点 description 显示为 `get/set  ⟵ ×1`

### Requirement: 引用位置 Tooltip

系统 SHALL 在成员节点的 tooltip 中展示详细的引用位置信息。

#### Scenario: 单个引用位置

- **WHEN** `userName` 仅在 line 15 以插值方式引用
- **THEN** tooltip 包含 `引用: L15 {{ }}`

#### Scenario: 多个引用位置

- **WHEN** `userName` 在 line 15（插值）、line 22（:title 绑定）、line 30（v-if）被引用
- **THEN** tooltip 包含 `引用: L15 {{ }}, L22 :title, L30 v-if`

#### Scenario: 无引用的 tooltip

- **WHEN** 属性在模板中未被引用
- **THEN** tooltip 保持原有内容，不追加引用信息

### Requirement: 方法事件绑定装饰

系统 SHALL 在 methods 成员节点的 description 中显示该方法被哪些模板事件绑定。

#### Scenario: 方法被单个事件绑定

- **WHEN** `handleSubmit` 被模板 `@click` (line 15) 绑定
- **THEN** 节点 description 显示 `← @click (L15)`

#### Scenario: 方法被多个事件绑定

- **WHEN** `handleSubmit` 被 `@click` (line 15) 和 `@submit` (line 30) 绑定
- **THEN** 节点 description 显示 `← @click (L15), @submit (L30)`

#### Scenario: 方法无事件绑定

- **WHEN** `validateForm` 未被任何模板事件直接绑定
- **THEN** 节点 description 不显示事件绑定信息

### Requirement: 方法调用关系 Tooltip

系统 SHALL 在 methods 成员节点的 tooltip 中展示调用关系。

#### Scenario: 方法调用其他方法

- **WHEN** `handleSubmit` 调用了 `validateForm()` 和 `saveData()`
- **THEN** tooltip 包含 `调用: validateForm(), saveData()`

#### Scenario: 方法被其他方法调用

- **WHEN** `validateForm` 被 `handleSubmit` 调用
- **THEN** tooltip 包含 `被调用: handleSubmit`
- **AND** 节点 description 追加 `← handleSubmit`

### Requirement: 组件接口概览节点

系统 SHALL 在树的顶层添加一个 `interface` 分类节点，聚合展示组件的 props（输入）和 emits（输出）接口。

#### Scenario: 组件同时有 props 和 emits

- **WHEN** 组件定义了 3 个 props 和 2 个 emits
- **THEN** 树顶层显示 `interface` 节点，label 为 `interface`
- **AND** 该节点下有两个子节点：`→ props (3)` 和 `← emits (2)`
- **AND** 每个子节点可展开，显示具体的 prop/emit 名称

#### Scenario: 仅有 props

- **WHEN** 组件定义了 props 但没有 emits
- **THEN** `interface` 节点下仅显示 `→ props (N)` 子节点

#### Scenario: 仅有 emits

- **WHEN** 组件定义了 emits 但没有 props
- **THEN** `interface` 节点下仅显示 `← emits (N)` 子节点

#### Scenario: 无 props 也无 emits

- **WHEN** 组件未定义 props 和 emits
- **THEN** 树中不显示 `interface` 节点

#### Scenario: interface 节点位置

- **WHEN** 组件同时有 template、interface 等节点
- **THEN** `interface` 节点显示在 `template` 之后、具体分类节点之前

#### Scenario: 独立 props/emits 节点去重

- **WHEN** 显示 `interface` 概览节点
- **THEN** 原有的独立 `props` 和 `emits` 分类节点从树中移除，仅在 interface 内展示

### Requirement: interface 节点图标

系统 SHALL 为 interface 节点使用专属的 VSCode 主题图标。

#### Scenario: interface 分类图标

- **WHEN** 显示 `interface` 分类节点
- **THEN** 使用 `plug` 图标表示组件接口

#### Scenario: 输入/输出子节点图标

- **WHEN** 显示 `→ props` 子节点
- **THEN** 使用 `arrow-right` 图标

- **WHEN** 显示 `← emits` 子节点
- **THEN** 使用 `arrow-left` 图标

### Requirement: interface 节点展开状态

系统 SHALL 默认展开 `interface` 节点以便一眼看到组件接口。

#### Scenario: 默认展开

- **WHEN** 首次解析并显示树
- **THEN** `interface` 节点默认展开，子节点（→ props / ← emits）也展开显示具体成员

### Requirement: 右键跳转到引用

系统 SHALL 在有模板引用的成员节点上提供右键菜单 "Go to Reference" 命令。

#### Scenario: 单个引用

- **WHEN** 用户右键点击一个有 1 个模板引用的节点，选择 "Go to Reference"
- **THEN** 编辑器直接跳转到模板中的引用位置

#### Scenario: 多个引用

- **WHEN** 用户右键点击一个有 3 个模板引用的节点，选择 "Go to Reference"
- **THEN** 弹出 QuickPick 列表，显示每个引用的行号和类型，用户选择后跳转

#### Scenario: 无引用

- **WHEN** 用户右键点击一个无模板引用的节点，选择 "Go to Reference"
- **THEN** 显示提示信息 "has no template references"

### Requirement: 分类过滤命令

系统 SHALL 在树视图标题栏提供 "Filter Categories" 按钮，允许用户选择要显示的分类。

#### Scenario: 点击过滤按钮

- **WHEN** 用户点击标题栏的 filter 图标
- **THEN** 弹出 QuickPick 多选列表，列出当前文件解析出的所有分类名（如 template、interface、state、computed、watch...）
- **AND** 所有分类默认选中

#### Scenario: 选择部分分类

- **WHEN** 用户在 QuickPick 中仅选中 "methods" 和 "computed"
- **THEN** 树视图仅显示 methods 和 computed 分类节点及其子节点
- **AND** 其他分类节点被隐藏

#### Scenario: 重置过滤

- **WHEN** 用户再次点击 filter 按钮并选择全部分类（或不做任何更改直接关闭）
- **THEN** 树视图恢复显示所有分类

#### Scenario: 过滤状态标识

- **WHEN** 当前有过滤器处于激活状态
- **THEN** filter 图标旁显示徽章或使用不同颜色提示用户当前有过滤

#### Scenario: 切换文件时重置

- **WHEN** 用户切换到另一个 .vue 文件
- **THEN** 过滤状态自动重置为显示全部

### Requirement: 过滤后的树视图行为

系统 SHALL 在过滤激活时正确维护树的交互功能。

#### Scenario: 过滤后点击跳转

- **WHEN** 过滤后仅显示 methods 分类，用户点击某个 method 节点
- **THEN** 编辑器正常跳转到该方法定义行

#### Scenario: 过滤后光标同步

- **WHEN** 过滤仅显示 methods，光标移到 data 属性定义处
- **THEN** 树视图不高亮任何节点（因为 data 分类被隐藏）

#### Scenario: 过滤后刷新

- **WHEN** 过滤器激活时文件被编辑并触发自动刷新
- **THEN** 刷新后过滤状态保持不变，仍仅显示选中的分类

### Requirement: 快速跳转命令

系统 SHALL 提供 "Go to Member" 命令，弹出 QuickPick 搜索列表，允许用户按名称快速跳转到任意成员。

#### Scenario: 弹出搜索列表

- **WHEN** 用户点击标题栏的 search 图标或执行命令
- **THEN** 弹出 QuickPick，列出当前文件所有成员节点
- **AND** 每个条目显示格式为 label=成员名, description=分类名

#### Scenario: 模糊搜索

- **WHEN** 用户在 QuickPick 中输入 "hand"
- **THEN** 列表过滤显示 "handleSubmit"、"handleDelete" 等匹配项

#### Scenario: 选中跳转

- **WHEN** 用户选中 "handleSubmit" 条目
- **THEN** 编辑器跳转到 handleSubmit 定义行
- **AND** 树视图中对应节点被高亮选中

#### Scenario: 无成员

- **WHEN** 当前文件无任何已解析的成员节点
- **THEN** QuickPick 显示提示 "No members found"

### Requirement: 折叠状态记忆

系统 SHALL 记住用户对每个分类节点的折叠/展开状态，在文件刷新时恢复。

#### Scenario: 手动折叠后刷新

- **WHEN** 用户手动折叠了 "methods" 分类，然后编辑文件触发自动刷新
- **THEN** 刷新后 "methods" 分类保持折叠状态

#### Scenario: 切换文件后回来

- **WHEN** 用户在 A.vue 中折叠了 props，切换到 B.vue，再切回 A.vue
- **THEN** A.vue 的 props 分类仍保持折叠状态

#### Scenario: 折叠状态持久化

- **WHEN** 用户关闭并重新打开 VS Code
- **THEN** 之前的折叠状态被恢复（使用 workspaceState）

#### Scenario: 新文件默认全展开

- **WHEN** 用户打开一个从未访问过的 .vue 文件
- **THEN** 所有分类节点默认展开

### Requirement: 批量折叠操作

系统 SHALL 提供快捷命令来批量控制折叠状态。

#### Scenario: 全部折叠

- **WHEN** 用户执行 "Collapse All" 命令
- **THEN** 所有分类节点收缩为仅显示分类名，不显示成员

#### Scenario: 全部展开

- **WHEN** 用户执行 "Expand All" 命令
- **THEN** 所有分类节点展开，显示所有成员

#### Scenario: 只展开某分类

- **WHEN** 用户执行 "Focus Category" 命令并选择 "methods"
- **THEN** methods 分类展开，其他所有分类折叠
