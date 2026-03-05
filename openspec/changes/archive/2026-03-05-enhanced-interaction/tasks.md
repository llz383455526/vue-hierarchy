# 增强交互 — 实施任务

## Phase 1: 分类过滤

- [x] **T1.1** 在 `package.json` 中注册新命令
  - `vueHierarchy.filterCategories` — "Filter Categories"，图标 `$(filter)`
  - `vueHierarchy.gotoMember` — "Go to Member"，图标 `$(search)`
  - `vueHierarchy.expandAll` — "Expand All"，图标 `$(expand-all)`
  - `vueHierarchy.focusCategory` — "Focus Category"
  - 将 filter 和 search 添加到 `view/title` 菜单的 navigation 组

- [x] **T1.2** 在 `VueTreeProvider` 中添加过滤状态管理
  - 添加 `activeFilter: Set<string> | null` 属性（null = 显示全部）
  - 添加 `setFilter(categories: string[] | null)` 方法
  - 修改 `getChildren(undefined)` — 根节点返回时过滤掉不在 activeFilter 中的分类
  - 修改 `rebuildCache()` — 重建缓存时应用过滤

- [x] **T1.3** 在 `extension.ts` 中实现 `filterCategories` 命令
  - 从 treeProvider 获取当前文件所有分类名
  - 弹出 `vscode.window.showQuickPick` 多选列表（`canPickMany: true`）
  - 已选中的分类设为过滤条件
  - 调用 `treeProvider.setFilter()` 并刷新树

- [x] **T1.4** 在 `VueTreeProvider` 中添加 `getAvailableCategories()` 方法
  - 返回当前解析结果中所有分类的 label 数组

- [x] **T1.5** 切换文件时重置过滤
  - 在 `refresh()` 中当 filePath 变化时调用 `setFilter(null)`

## Phase 2: 快速跳转

- [x] **T2.1** 在 `VueTreeProvider` 中添加 `getAllMembers()` 方法
  - 遍历所有分类节点的子节点
  - 返回 `{ label: string, category: string, line: number, column: number }[]`

- [x] **T2.2** 在 `extension.ts` 中实现 `gotoMember` 命令
  - 从 treeProvider 获取所有成员列表
  - 构建 QuickPick items：label=成员名, description=分类名
  - 用户选中后跳转到定义行
  - 在树视图中 reveal 对应节点

- [x] **T2.3** 无成员时的空状态处理
  - 如果成员列表为空，显示 "No members found in current file"

## Phase 3: 智能折叠

- [x] **T3.1** 在 `VueTreeProvider` 中添加折叠状态存储
  - 添加 `collapseState: Map<string, Map<string, boolean>>` — filePath → (categoryLabel → isCollapsed)
  - 注入 `vscode.ExtensionContext` 以访问 `workspaceState`
  - 添加 `saveCollapseState()` 和 `loadCollapseState()` 方法

- [x] **T3.2** 修改 `VueHierarchyItem` 构造函数
  - 接受可选的 `isCollapsed` 参数
  - 如果 isCollapsed 为 true，使用 `Collapsed` 而非 `Expanded` 折叠状态

- [x] **T3.3** 在 `rebuildCache()` 中应用保存的折叠状态
  - 创建根节点时查询 collapseState 决定初始折叠状态
  - 首次打开的文件使用默认全展开

- [x] **T3.4** 监听 TreeView 折叠/展开事件
  - 注册 `treeView.onDidCollapseElement` 和 `treeView.onDidExpandElement`
  - 更新 collapseState 并持久化到 workspaceState

- [x] **T3.5** 实现 `expandAll` 命令
  - 清除当前文件的所有折叠状态
  - 刷新树（所有节点默认展开）

- [x] **T3.6** 实现 `focusCategory` 命令
  - 弹出 QuickPick 选择一个分类
  - 将该分类设为展开，其他分类设为折叠
  - 刷新树

## Phase 4: 过滤状态与光标同步兼容

- [x] **T4.1** 修改 `findItemAtLine()` 兼容过滤
  - 仅在过滤后可见的 flatItemsByLine 中搜索
  - 如果匹配到被过滤掉的节点，返回 null

## Phase 5: 测试验证

- [x] **T5.1** 构建并安装插件
- [ ] **T5.2** 验证分类过滤功能
  - 验证 filter 按钮显示在标题栏
  - 验证多选过滤后树视图正确隐藏/显示分类
  - 验证切换文件后过滤重置
- [ ] **T5.3** 验证快速跳转功能
  - 验证 search 按钮弹出 QuickPick
  - 验证模糊搜索和跳转
- [ ] **T5.4** 验证折叠记忆
  - 验证折叠后刷新保持状态
  - 验证切换文件再切回保持状态
- [ ] **T5.5** 验证过滤与光标同步兼容

## Phase 6: 版本升级

- [x] **T6.1** 更新 `package.json` 版本号至 `0.0.4`
- [x] **T6.2** 更新 `CHANGELOG.md`
- [x] **T6.3** 构建最终 VSIX 包并安装
