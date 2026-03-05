## ADDED Requirements

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

- **WHEN** 组件同时有 template、interface、props、data 等节点
- **THEN** `interface` 节点显示在 `template` 之后、具体分类节点之前

#### Scenario: 与原有 props/emits 节点共存

- **WHEN** 显示 `interface` 概览节点
- **THEN** 原有的 `props` 和 `emits` 分类节点保持不变，interface 为补充视图

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
