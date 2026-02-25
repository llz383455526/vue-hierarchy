## ADDED Requirements

### Requirement: SFC 块提取

系统 SHALL 使用 `@vue/compiler-sfc` 的 `parse()` 函数从 `.vue` 文件文本中提取 `<script>` 块的内容和元信息（lang 属性、起始行偏移量）。

#### Scenario: 提取普通 script 块

- **WHEN** 输入包含 `<script>` 块的 `.vue` 文件文本
- **THEN** 系统返回 script 块的源码内容、lang 属性值（默认 "js"）和 `<script>` 标签在文件中的起始行号

#### Scenario: 提取 TypeScript script 块

- **WHEN** 输入包含 `<script lang="ts">` 的 `.vue` 文件文本
- **THEN** 系统返回 script 块内容，lang 属性值为 "ts"

#### Scenario: 无 script 块

- **WHEN** 输入的 `.vue` 文件不包含 `<script>` 块
- **THEN** 系统返回空的解析结果（无节点）

#### Scenario: 同时存在 script 和 script setup

- **WHEN** 输入的 `.vue` 文件同时包含 `<script>` 和 `<script setup>` 块
- **THEN** 系统仅解析 `<script>` 块，忽略 `<script setup>` 块

### Requirement: AST 解析

系统 SHALL 使用 `@babel/parser` 将 `<script>` 块内容解析为 AST，支持 JavaScript 和 TypeScript 语法。

#### Scenario: 解析 JavaScript

- **WHEN** script 块 lang 为 "js" 或未指定
- **THEN** 系统使用 @babel/parser 并启用 decorators 等常见插件成功解析为 AST

#### Scenario: 解析 TypeScript

- **WHEN** script 块 lang 为 "ts"
- **THEN** 系统使用 @babel/parser 并启用 typescript 插件成功解析为 AST

#### Scenario: 解析失败

- **WHEN** script 块内容存在语法错误无法解析
- **THEN** 系统返回空的解析结果而不抛出异常

### Requirement: 导出对象定位

系统 SHALL 从 AST 中定位 Options API 的组件选项对象，支持 `export default { ... }` 和 `export default defineComponent({ ... })` 两种模式。

#### Scenario: 直接导出对象字面量

- **WHEN** AST 中存在 `export default { props: {...}, methods: {...} }`
- **THEN** 系统定位到该 ObjectExpression 作为组件选项对象

#### Scenario: defineComponent 包裹

- **WHEN** AST 中存在 `export default defineComponent({ props: {...} })`
- **THEN** 系统定位到 defineComponent 第一个参数的 ObjectExpression 作为组件选项对象

#### Scenario: 无 export default

- **WHEN** AST 中不存在 `export default` 声明
- **THEN** 系统返回空的解析结果

### Requirement: Props 提取

系统 SHALL 从组件选项对象中提取 `props` 选项的所有属性，记录每个 prop 的名称、类型信息、默认值和源码位置。

#### Scenario: 数组语法 props

- **WHEN** props 定义为数组 `props: ['title', 'count']`
- **THEN** 系统提取每个字符串元素作为 prop 名称，无类型信息

#### Scenario: 对象语法 props（简写）

- **WHEN** props 定义为 `props: { title: String, count: Number }`
- **THEN** 系统提取每个属性名和对应的类型标识符名称

#### Scenario: 对象语法 props（完整）

- **WHEN** props 定义为 `props: { count: { type: Number, default: 0, required: true } }`
- **THEN** 系统提取属性名、type 值、default 值、required 值

#### Scenario: 行列位置记录

- **WHEN** 提取任意 prop
- **THEN** 系统记录该 prop 在 `.vue` 文件中的准确行号（包含 `<script>` 标签的行偏移）

### Requirement: Data 提取

系统 SHALL 从组件选项对象中提取 `data()` 函数返回值的所有属性。

#### Scenario: data 函数返回对象

- **WHEN** data 定义为 `data() { return { isLoading: false, list: [] } }`
- **THEN** 系统提取 return 对象中每个属性的名称和源码位置

#### Scenario: data 箭头函数

- **WHEN** data 定义为 `data: () => ({ isLoading: false })`
- **THEN** 系统提取箭头函数返回对象中每个属性的名称和源码位置

#### Scenario: data 为纯对象（Vue 2 根实例）

- **WHEN** data 定义为 `data: { message: 'hello' }`
- **THEN** 系统提取该对象的每个属性的名称和源码位置

### Requirement: Methods 提取

系统 SHALL 从组件选项对象中提取 `methods` 选项的所有方法名。

#### Scenario: 提取普通方法

- **WHEN** methods 定义为 `methods: { handleClick() {}, fetchData() {} }`
- **THEN** 系统提取每个方法名（"handleClick"、"fetchData"）和源码位置

#### Scenario: 提取 async 方法

- **WHEN** methods 中存在 `async fetchData() {}`
- **THEN** 系统提取方法名并标注为 async

### Requirement: Computed 提取

系统 SHALL 从组件选项对象中提取 `computed` 选项的所有计算属性名。

#### Scenario: 函数语法

- **WHEN** computed 定义为 `computed: { fullName() { return ... } }`
- **THEN** 系统提取计算属性名和源码位置

#### Scenario: getter/setter 语法

- **WHEN** computed 定义为 `computed: { fullName: { get() {}, set() {} } }`
- **THEN** 系统提取计算属性名和源码位置

### Requirement: Watch 提取

系统 SHALL 从组件选项对象中提取 `watch` 选项的所有监听器。

#### Scenario: 函数语法

- **WHEN** watch 定义为 `watch: { count(newVal) {} }`
- **THEN** 系统提取监听的属性名和源码位置

#### Scenario: 对象语法（含 deep/immediate）

- **WHEN** watch 定义为 `watch: { items: { handler() {}, deep: true } }`
- **THEN** 系统提取监听属性名，并标注 deep/immediate 标记

#### Scenario: 字符串路径 key

- **WHEN** watch key 为字符串 `watch: { 'obj.prop': function() {} }`
- **THEN** 系统正确提取该字符串路径作为监听名

### Requirement: Lifecycle Hooks 提取

系统 SHALL 从组件选项对象中提取所有生命周期钩子。

#### Scenario: 识别 Vue 2 生命周期

- **WHEN** 组件选项包含 `beforeCreate`、`created`、`beforeMount`、`mounted`、`beforeUpdate`、`updated`、`beforeDestroy`、`destroyed` 中的任意钩子
- **THEN** 系统将其识别为生命周期钩子并提取名称和源码位置

#### Scenario: 识别 Vue 3 生命周期

- **WHEN** 组件选项包含 `beforeUnmount`、`unmounted` 等 Vue 3 新增钩子
- **THEN** 系统将其识别为生命周期钩子并提取名称和源码位置

### Requirement: Components 提取

系统 SHALL 从组件选项对象中提取 `components` 选项的所有注册组件名。

#### Scenario: 提取注册组件

- **WHEN** components 定义为 `components: { ChildA, ChildB: SomeComponent }`
- **THEN** 系统提取每个注册名（"ChildA"、"ChildB"）和源码位置

### Requirement: 其他选项提取

系统 SHALL 从组件选项对象中提取 `emits`、`mixins`、`directives`、`filters`、`provide`、`inject` 等选项。

#### Scenario: emits 数组

- **WHEN** emits 定义为 `emits: ['change', 'update']`
- **THEN** 系统提取每个事件名

#### Scenario: mixins 数组

- **WHEN** mixins 定义为 `mixins: [mixin1, mixin2]`
- **THEN** 系统提取每个 mixin 标识符名称

#### Scenario: directives 对象

- **WHEN** directives 定义为 `directives: { focus, highlight }`
- **THEN** 系统提取每个指令名称

### Requirement: 行号偏移计算

系统 SHALL 将 AST 中的行号与 `<script>` 标签在 `.vue` 文件中的起始行进行偏移叠加，确保最终行号指向 `.vue` 文件中的正确位置。

#### Scenario: 行号偏移

- **WHEN** `<script>` 标签位于 `.vue` 文件第 10 行，AST 节点在 script 内容第 5 行
- **THEN** 系统返回该节点在 `.vue` 文件中的行号为第 14 行（10 + 5 - 1，因为 script 内容从标签下一行开始）

### Requirement: 解析性能

系统 SHALL 在 50ms 内完成中等大小（500 行以内）`.vue` 文件的完整解析。

#### Scenario: 中等文件解析

- **WHEN** 输入 500 行的 `.vue` 文件
- **THEN** 完整解析流程（SFC 拆分 + AST 解析 + 选项提取）在 50ms 内完成
