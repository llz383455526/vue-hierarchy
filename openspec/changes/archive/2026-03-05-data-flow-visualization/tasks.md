# 数据流可视化 — 实施任务

## Phase 1: 类型与数据结构扩展

- [x] **T1.1** 在 `src/types.ts` 中为 `HierarchyNode` 增加引用分析字段
  - 添加 `refCount?: number` — 模板引用次数
  - 添加 `refs?: TemplateRef[]` — 引用位置详情数组
  - 添加 `eventBindings?: EventBinding[]` — 方法的事件绑定来源
  - 添加 `calls?: string[]` — 该方法调用的其他方法名
  - 添加 `calledBy?: string[]` — 调用该方法的其他方法名
  - 定义 `TemplateRef` 接口：`{ line: number; type: string; context: string }`
  - 定义 `EventBinding` 接口：`{ event: string; line: number }`

- [x] **T1.2** 在 `src/types.ts` 中添加 `interface` 到 `HierarchyCategory` 联合类型

- [x] **T1.3** 在 `src/VueFileParser.ts` 中为 `CATEGORY_ICONS` 和 `MEMBER_ICONS` 添加 `interface` 映射
  - `interface` → `plug`
  - 添加辅助图标常量：`arrow-right`（props 输入）、`arrow-left`（emits 输出）

## Phase 2: 模板引用扫描

- [x] **T2.1** 在 `src/VueFileParser.ts` 中实现 `scanTemplateRefs()` 函数
  - 输入：模板文本内容、模板起始行号、已知标识符集合（data/computed/props/state/methods 名称）
  - 输出：`Map<string, TemplateRef[]>` — 每个标识符对应的引用位置列表
  - 定义 JS 内置名称黑名单（`true`, `false`, `null`, `undefined`, `console`, `Math`, `Object`, `Array`, `JSON`, `window`, `document`, `$event`）

- [x] **T2.2** 实现插值表达式提取
  - 正则匹配 `\{\{\s*(.+?)\s*\}\}` 提取表达式
  - 从表达式中用 `\b([a-zA-Z_$][a-zA-Z0-9_$]*)\b` 提取顶层标识符
  - 记录行号、引用类型 `"{{ }}"`

- [x] **T2.3** 实现指令绑定提取
  - 匹配 `:attr="expr"` / `v-bind:attr="expr"` → 类型 `":attr"`
  - 匹配 `v-if="expr"` → 类型 `"v-if"`
  - 匹配 `v-else-if="expr"` → 类型 `"v-else-if"`
  - 匹配 `v-show="expr"` → 类型 `"v-show"`
  - 匹配 `v-for="... in expr"` → 类型 `"v-for"`，提取 `in`/`of` 右侧的标识符
  - 匹配 `v-model="expr"` → 类型 `"v-model"`

- [x] **T2.4** 实现事件绑定提取
  - 匹配 `@event="handler"` / `v-on:event="handler"` → 提取事件名和处理器名
  - 区分纯函数名（如 `handleSubmit`）和内联表达式（如 `count++`、`show = true`）
  - 纯函数名记录为 `EventBinding`，内联表达式中的标识符记录为普通引用

- [x] **T2.5** 在 `parseVueFile()` 中集成模板引用扫描
  - 在解析完 script 之后、返回结果之前调用 `scanTemplateRefs()`
  - 收集所有已解析子节点的标识符名称作为白名单
  - 将扫描结果回写到对应的 `HierarchyNode` 上（`refCount`、`refs`、`eventBindings`）

## Phase 3: 方法调用关系分析

- [x] **T3.1** 在 `src/VueFileParser.ts` 中实现 `scanMethodCalls()` 函数
  - Options API：扫描方法体中的 `this.xxx()` 调用，提取 `xxx`
  - Composition API：扫描函数体中的直接函数调用 `xxx()`，与已知函数名交叉匹配
  - 输出：`Map<string, string[]>` — 每个方法调用了哪些方法

- [x] **T3.2** 在解析完成后构建被调用关系 (`calledBy`)
  - 遍历 `calls` Map，反向填充 `calledBy` 字段
  - 例如：`handleSubmit.calls = [validateForm]` → `validateForm.calledBy = [handleSubmit]`

- [x] **T3.3** 将调用关系回写到 `HierarchyNode`
  - 在 methods 分类的子节点上设置 `calls` 和 `calledBy` 字段

## Phase 4: 引用信息渲染（TreeView 展示层）

- [x] **T4.1** 修改 `src/VueTreeProvider.ts` 中 `getTreeItem()` 的 description 生成逻辑
  - 成员节点：如果 `refCount > 0`，在原有 detail 后追加 `  ⟵ ×N`
  - methods 成员节点：如果有 `eventBindings`，显示 `← @event (LN)`
  - methods 成员节点：如果有 `calledBy`，追加 `← callerName`

- [x] **T4.2** 修改 `getTreeItem()` 的 tooltip 生成逻辑
  - 如果有 `refs`，tooltip 追加 `引用: L15 {{ }}, L22 :title, L30 v-if`
  - 如果有 `calls`，tooltip 追加 `调用: validateForm(), saveData()`
  - 如果有 `calledBy`，tooltip 追加 `被调用: handleSubmit`
  - 使用 `vscode.MarkdownString` 支持多行 tooltip

## Phase 5: 组件接口概览节点

- [x] **T5.1** 在 `src/VueFileParser.ts` 的 `parseVueFile()` 中生成 `interface` 节点
  - 在所有分类解析完成后，查找 props 和 emits 分类节点
  - 如果存在 props 或 emits（至少一个），构建 `interface` 节点
  - `interface` 节点的子节点：`→ props (N)` 和 `← emits (N)`
  - 每个子节点的 children 复用已解析的 prop/emit 成员节点（浅拷贝）

- [x] **T5.2** 确保 `interface` 节点插入位置正确
  - 在 categories 数组中，`interface` 排在 `template` 之后、其他分类之前
  - 如果没有 template 节点，`interface` 排在最前面

- [x] **T5.3** 在 `VueTreeProvider` 中处理 `interface` 节点的展开状态
  - `interface` 节点使用 `Expanded` 折叠状态
  - 其子节点（`→ props` / `← emits`）也使用 `Expanded`

## Phase 6: 测试验证

- [x] **T6.1** 更新 `example/vue3-composition-api/UserManager.vue` 模板区域
  - 确保 template 中包含：插值 `{{ }}`、`:attr` 绑定、`v-if`/`v-for`、`@click` 事件绑定
  - 确保至少一个 data/state 被引用多次
  - 确保至少一个方法被 `@event` 绑定

- [x] **T6.2** 构建并安装插件，验证引用计数
  - 验证 data/computed/state 成员节点的 description 中显示 `⟵ ×N`
  - 验证无引用的成员不显示引用信息
  - 验证 hover tooltip 显示具体引用位置

- [x] **T6.3** 验证方法事件绑定
  - 验证 methods 节点显示 `← @click (LN)` 格式
  - 验证多事件绑定的显示

- [x] **T6.4** 验证方法调用关系
  - 验证 tooltip 中显示 `调用:` 和 `被调用:` 信息

- [x] **T6.5** 验证组件接口概览
  - 验证 `interface` 节点出现在正确位置
  - 验证包含 `→ props (N)` 和 `← emits (N)` 子节点
  - 验证展开后显示具体成员
  - 验证对无 props/emits 的组件不显示 interface 节点

- [x] **T6.6** 验证光标同步对新节点的兼容性
  - 验证点击 interface 子节点可跳转到对应定义行
  - 验证引用信息不影响现有的光标同步功能

## Phase 7: 版本升级与发布

- [x] **T7.1** 更新 `package.json` 版本号至 `0.0.3`
- [x] **T7.2** 更新 `CHANGELOG.md` 记录本次变更
- [x] **T7.3** 构建最终 VSIX 包并安装验证
