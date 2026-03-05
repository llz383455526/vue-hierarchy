## ADDED Requirements

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
