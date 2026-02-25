## Why

在开发 Vue 项目时，组件文件（尤其是 Options API 风格）随着业务增长变得越来越长，开发者需要频繁上下滚动来查找 props、methods、computed 等不同选项块。VSCode 自带的 Outline 面板只能按 JavaScript 语法结构展示，无法按 Vue 的概念分类（props / data / methods / lifecycle 等）呈现，定位效率低。

我们需要一个 VSCode 扩展，在侧边栏提供一个专属的 Vue 组件结构视图，让开发者一目了然地看到组件的完整骨架，并能快速跳转。

## What Changes

- 新建一个完整的 VSCode 扩展项目（TypeScript）
- 在 VSCode 左侧活动栏注册一个 "Vue Hierarchy" 视图容器
- 使用 `@vue/compiler-sfc` + `@babel/parser` 解析当前激活的 `.vue` 文件
- 以树形结构展示 Options API 的所有选项：props、data、computed、watch、methods、lifecycle hooks、components、emits、mixins、directives、provide/inject、filters
- 支持点击树节点跳转到源码对应行
- 支持编辑文件时自动刷新（300ms 防抖）
- 支持切换文件时自动刷新
- 利用 VSCode 内置 TreeView 搜索（Ctrl+F）进行过滤

## Capabilities

### New Capabilities

- `vue-file-parsing`: 使用 @vue/compiler-sfc 和 @babel/parser 解析 .vue 文件的 Options API 结构，提取各选项块及其子成员，并记录源码行列位置
- `tree-view-panel`: 在 VSCode 左侧活动栏注册视图容器和 TreeView，实现 TreeDataProvider 以树形结构展示解析结果，支持展开/收缩、图标区分、数量标注
- `editor-integration`: 点击节点跳转到源码位置、编辑时防抖自动刷新、切换文件自动刷新、仅对当前激活的 .vue 文件生效

### Modified Capabilities

<!-- 无现有 specs，此为全新项目 -->

## Impact

- **新增依赖**: `@vue/compiler-sfc`, `@babel/parser`, `@babel/traverse`, `@babel/types`（运行时）；`@types/vscode`, `typescript`, `esbuild`（开发时）
- **项目结构**: 在仓库根目录新建完整的 VSCode 扩展项目骨架（src/、package.json、tsconfig.json 等）
- **构建产物**: 扩展需通过 esbuild 打包为单文件，最终可发布到 VSCode Marketplace
- **兼容性**: 目标 VSCode 引擎版本 ^1.74.0（支持 TreeView 内置搜索）
