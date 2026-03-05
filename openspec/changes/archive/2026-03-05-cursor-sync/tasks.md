# 任务清单

## 光标同步

- [x] VueTreeProvider 添加 cachedRootItems、cachedChildItems、flatItemsByLine 缓存字段
- [x] 实现 rebuildCache() 在每次解析后重建缓存
- [x] 实现 clearCache() 清除缓存
- [x] 改造 getChildren() 返回缓存引用而非新建实例
- [x] 实现 findItemAtLine() 二分查找光标对应节点
- [x] 实现 getParent() 供 TreeView.reveal() 使用
- [x] extension.ts 监听 onDidChangeTextEditorSelection 事件
- [x] 添加 150ms 防抖的光标同步函数
- [x] 添加 isNavigatingFromTree / isRevealingFromCursor 防循环标志
- [x] 仅在 TreeView 可见时触发同步
- [x] 验证光标移动时树面板正确高亮对应节点
