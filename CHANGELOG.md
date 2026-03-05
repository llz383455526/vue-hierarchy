# Changelog

## [1.0.0] - 2026-03-05

### 🎉 First Stable Release

Vue Hierarchy 首个正式版本，提供完整的 Vue 组件逻辑结构可视化。

### Features
- **Options API & Composition API** 双模式解析（`<script setup>` / `<script>`）
- **组件结构树**: template/script/style 块、props/data/computed/methods/watch/lifecycle 等分类
- **数据流可视化**: 模板引用计数、事件绑定来源、方法调用链
- **组件接口概览**: `interface` 节点聚合 props 输入和 emits 输出
- **双向光标同步**: 编辑器光标 ↔ 树视图节点联动
- **分类过滤**: Filter 按钮多选显示/隐藏分类
- **快速跳转**: Search 按钮模糊搜索成员名
- **Focus Category**: 聚焦单个分类，折叠其他
- **折叠/展开 Toggle**: 一键切换所有分类折叠状态（workspaceState 持久化）
- **右键跳转到引用**: Go to Reference 直达模板中的使用位置

## [0.0.4] - 2026-03-05

### Added
- **分类过滤**: 标题栏 Filter 按钮，QuickPick 多选显示/隐藏分类，切换文件自动重置
- **快速跳转**: 标题栏 Search 按钮，模糊搜索成员名直接跳转到定义行
- **智能折叠**: 记忆用户折叠状态（workspaceState 持久化），跨文件切换时恢复
  - Expand All 按钮一键展开所有分类
  - Focus Category 命令聚焦单个分类（其他折叠）
  - 手动折叠/展开自动保存状态

## [0.0.3] - 2026-03-05

### Added
- **数据流可视化**: 在树节点中展示模板引用计数和引用位置
  - data/computed/props/state 节点右侧显示 `⟵ ×N` 引用次数
  - Hover tooltip 显示每个引用的行号和类型 (插值/v-bind/v-if/v-for/v-model 等)
- **方法调用关系**: 方法节点显示事件绑定来源 `← @click (LN)` 和调用链
  - tooltip 展示 `调用:` 和 `被调用:` 关系
- **组件接口概览**: 新增 `interface` 聚合节点，一目了然展示 props 输入和 emits 输出
  - `→ props (N)` / `← emits (N)` 子节点可展开查看具体成员
  - 原有独立的 props/emits 分类节点合并到 interface 中，避免重复
- **右键跳转到引用**: 在有模板引用的节点上右键 → "Go to Reference"
  - 单个引用直接跳转到模板中的使用位置
  - 多个引用弹出 QuickPick 选择列表

## [0.0.2] - 2026-03-05

### Added
- **Composition API 支持**: 解析 `<script setup>` 中的 ref/reactive/computed/watch/composables/defineProps/defineEmits
- **光标同步**: 编辑器光标位置与树视图双向联动

## [0.0.1] - 2026-03-05

### Added
- 初始版本：Vue 文件结构树视图 (Options API)
- 支持 template/script/style 块检测
- 支持 props/data/computed/methods/watch/lifecycle/components/directives/mixins 解析
- 点击节点跳转到对应代码行
