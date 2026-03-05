## ADDED Requirements

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

#### Scenario: 面板恢复可见

- **WHEN** 用户切换回 Vue Hierarchy 面板
- **THEN** 下次光标移动时恢复正常同步

### Requirement: 树项缓存一致性

系统 SHALL 确保 `getChildren()` 返回的树项对象引用与 `findItemAtLine()` 返回的对象引用一致，以满足 `TreeView.reveal()` 的要求。

#### Scenario: reveal 使用缓存引用

- **WHEN** 光标同步找到匹配节点并调用 `treeView.reveal(item)`
- **THEN** 该 item 是 `getChildren()` 返回的同一对象实例，reveal 操作成功执行
