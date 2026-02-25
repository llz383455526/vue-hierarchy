## 1. 项目脚手架搭建

- [x] 1.1 初始化 package.json，配置扩展元信息（name、displayName、description、engines、activationEvents、contributes）
- [x] 1.2 配置 tsconfig.json（strict 模式、ES2020 target、Node module resolution）
- [x] 1.3 配置 esbuild 构建脚本（打包 src/extension.ts 为单文件，external vscode）
- [x] 1.4 创建 .vscode/launch.json 调试配置（Extension Development Host）
- [x] 1.5 安装依赖：@vue/compiler-sfc、@babel/parser（运行时）；@types/vscode、typescript、esbuild（开发时）
- [x] 1.6 创建 .vscodeignore 文件排除不需要打包的文件
- [x] 1.7 创建活动栏图标 resources/icon.svg

## 2. package.json contributes 配置

- [x] 2.1 注册 viewsContainers.activitybar：vue-hierarchy 视图容器，关联图标
- [x] 2.2 注册 views.vue-hierarchy：vueHierarchyView TreeView
- [x] 2.3 注册 commands：vueHierarchy.refresh（刷新按钮）、vueHierarchy.gotoLine（跳转命令）
- [x] 2.4 配置 menus.view/title：将 refresh 命令绑定到 TreeView 标题栏导航区
- [x] 2.5 配置 activationEvents：onLanguage:vue（打开 .vue 文件时激活）

## 3. 类型定义

- [x] 3.1 创建 src/types.ts，定义 VueNodeType 枚举（props、data、computed、watch、methods、lifecycle、components、emits、mixins、directives、filters、provide、inject）
- [x] 3.2 定义 VueHierarchyNode 接口（label、type、line、column、children、detail）
- [x] 3.3 定义 ParseResult 接口（componentName、nodes 数组）

## 4. Vue 文件解析器核心

- [x] 4.1 创建 src/VueFileParser.ts，实现 parse(text: string): ParseResult 主方法
- [x] 4.2 实现 SFC 块提取：使用 @vue/compiler-sfc parse() 提取 script 块内容、lang、起始行偏移
- [x] 4.3 实现 AST 解析：使用 @babel/parser 解析 script 内容，根据 lang 切换 typescript 插件
- [x] 4.4 实现导出对象定位：查找 ExportDefaultDeclaration，支持直接对象字面量和 defineComponent() 包裹
- [x] 4.5 实现 props 提取：支持数组语法、对象简写语法、对象完整语法（type/default/required）
- [x] 4.6 实现 data 提取：支持 data() 函数、箭头函数、纯对象三种形式，提取 return 对象属性
- [x] 4.7 实现 methods 提取：遍历 methods 对象属性，标注 async
- [x] 4.8 实现 computed 提取：支持函数语法和 getter/setter 对象语法
- [x] 4.9 实现 watch 提取：支持函数语法、对象语法（deep/immediate 标记）、字符串路径 key
- [x] 4.10 实现 lifecycle hooks 提取：预定义 Vue 2 + Vue 3 全部生命周期钩子名称列表，从选项对象中匹配
- [x] 4.11 实现 components 提取：遍历 components 对象属性名
- [x] 4.12 实现其他选项提取：emits（数组/对象）、mixins（数组）、directives（对象）、filters（对象）、provide、inject
- [x] 4.13 实现行号偏移计算：将 AST loc 行号加上 script 标签起始行偏移，输出 .vue 文件中的绝对行号
- [x] 4.14 实现解析错误兜底：try-catch 包裹，语法错误时返回空结果不崩溃

## 5. TreeDataProvider 实现

- [x] 5.1 创建 src/VueTreeProvider.ts，实现 vscode.TreeDataProvider<VueHierarchyNode> 接口
- [x] 5.2 实现 getTreeItem()：将 VueHierarchyNode 转为 vscode.TreeItem，设置 label、description、icon、collapsibleState、command
- [x] 5.3 实现 getChildren()：根节点返回分类节点列表，分类节点返回其 children
- [x] 5.4 实现 refresh()：触发 onDidChangeTreeData 事件，接受新的文件文本参数并重新解析
- [x] 5.5 为分类节点设置图标映射：使用 vscode.ThemeIcon 对应不同 VueNodeType
- [ ] 5.6 为分类节点 label 添加数量标注（如 "props (3)"）
- [x] 5.7 为成员节点设置 command（vueHierarchy.gotoLine），传入 line 和 column 参数
- [x] 5.8 分类节点默认 collapsibleState 为 Expanded
- [ ] 5.9 无内容时显示空状态提示 message

## 6. 扩展入口与事件绑定

- [x] 6.1 创建 src/extension.ts，实现 activate() 函数
- [x] 6.2 注册 VueTreeProvider 到 vueHierarchyView
- [x] 6.3 注册 vueHierarchy.refresh 命令，绑定手动刷新
- [x] 6.4 注册 vueHierarchy.gotoLine 命令，实现光标跳转（revealRange + CursorMove）
- [x] 6.5 监听 onDidChangeActiveTextEditor 事件，切换文件时刷新（检查 .vue 后缀）
- [x] 6.6 监听 onDidChangeTextDocument 事件，编辑时防抖 300ms 后刷新
- [x] 6.7 实现防抖工具函数 debounce(fn, delay)
- [x] 6.8 activate() 中立即解析当前激活的 .vue 文件（如有）
- [x] 6.9 实现 deactivate() 清理资源（dispose subscriptions、清除 timer）

## 7. 测试与验证

- [ ] 7.1 创建示例 .vue 文件（覆盖所有 Options API 选项），用于手动测试
- [ ] 7.2 F5 启动 Extension Development Host，验证活动栏图标显示
- [ ] 7.3 验证打开 .vue 文件后 TreeView 正确展示所有分类和成员
- [ ] 7.4 验证点击成员节点跳转到正确行列
- [ ] 7.5 验证编辑文件后 TreeView 自动刷新
- [ ] 7.6 验证切换文件后 TreeView 自动切换
- [ ] 7.7 验证 Ctrl+F 搜索过滤功能
- [ ] 7.8 验证非 .vue 文件时显示空状态
- [ ] 7.9 验证包含语法错误的 .vue 文件不崩溃
