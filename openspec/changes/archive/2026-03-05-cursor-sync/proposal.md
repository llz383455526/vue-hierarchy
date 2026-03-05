# 光标同步 (Cursor Sync)

## 概述

实现编辑器光标位置与 Vue Hierarchy 树面板的双向联动：当用户在编辑器中移动光标时，树面板自动高亮对应的结构节点。

## 动机

开发者在阅读大型 Vue 文件时，需要快速了解当前光标所在位置属于哪个结构区域（如某个 computed、某个 watch 等）。光标同步让树面板成为一个实时的"你在哪里"指示器。

## 设计要点

### 缓存机制

TreeView.reveal() 要求传入与 getChildren() 返回的完全相同的对象引用。因此需要：
- 在 `rebuildCache()` 中构建并缓存所有 VueHierarchyItem 实例
- `getChildren()` 改为返回缓存引用而非每次创建新实例
- 维护 `flatItemsByLine` 排序数组用于二分查找

### 防循环机制

- `isNavigatingFromTree`：点击树节点跳转编辑器时，不触发反向的光标同步
- `isRevealingFromCursor`：光标触发 reveal 时，不再处理 selection 事件

### 性能优化

- 使用 150ms 防抖避免快速滚动时频繁查找
- 使用二分查找（O(log n)）定位光标所在节点
- 仅在 TreeView 可见时触发同步

## 影响的文件

- `src/VueTreeProvider.ts` — 新增缓存、findItemAtLine()、getParent()
- `src/extension.ts` — 新增 onDidChangeTextEditorSelection 监听
