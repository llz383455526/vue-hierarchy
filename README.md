<p align="center">
  <strong>🌿</strong>
</p>

<h1 align="center">Vue Hierarchy</h1>

<p align="center">
  <strong>在 VS Code 侧边栏中一览 Vue 组件的完整结构</strong>
</p>

<p align="center">
  <a href="#功能特性">功能特性</a> •
  <a href="#快速开始">快速开始</a> •
  <a href="#使用方式">使用方式</a> •
  <a href="#支持的选项">支持的选项</a> •
  <a href="#开发指南">开发指南</a> •
  <a href="#license">License</a>
</p>

---

## ✨ 功能特性

Vue Hierarchy 是一个 VS Code 扩展，为 Vue **Options API** 组件提供直观的层级结构视图，帮助你快速浏览和导航大型 Vue 文件。

- 🌲 **树形结构展示** — 在侧边栏以分类树形式展示 `props`、`data`、`methods`、`computed`、`watch`、生命周期钩子等
- 🎯 **点击跳转** — 点击任意节点，光标直接定位到源码对应位置
- ⚡ **实时刷新** — 编辑文件时自动更新，切换文件时自动切换
- 🔍 **搜索过滤** — 支持 VS Code 内置的 TreeView 搜索（`Ctrl+F`）
- 📦 **零配置** — 安装即用，打开 `.vue` 文件自动激活
- 🚀 **极速解析** — 基于 AST 解析，毫秒级响应

## 📸 预览

打开任意 `.vue` 文件后，左侧 Activity Bar 会出现 Vue Hierarchy 图标：

```
📁 Vue Hierarchy
└── 🏗 Structure
    ├── 📄 template
    ├── 🔹 props
    │   ├── title        String
    │   ├── count        Number
    │   └── disabled     Boolean
    ├── 📊 data
    │   ├── message
    │   ├── loading
    │   └── items
    ├── 🔧 computed
    │   ├── fullName
    │   └── itemCount
    ├── ⚙️ methods
    │   ├── fetchData
    │   ├── handleClick
    │   └── reset
    ├── 👁 watch
    │   └── count
    ├── 🕐 lifecycle
    │   ├── created
    │   ├── mounted
    │   └── beforeDestroy
    └── 🎨 style (scoped)
```

## 🚀 快速开始

### 从 VSIX 安装

1. 下载最新的 `.vsix` 文件
2. 在 VS Code 中按 `Ctrl+Shift+P`，输入 **Extensions: Install from VSIX...**
3. 选择下载的 `.vsix` 文件
4. 重新加载 VS Code

或通过命令行安装：

```bash
code --install-extension vue-hierarchy-0.0.1.vsix
```

### 从源码构建安装

```bash
git clone https://github.com/your-username/vue-hierarchy.git
cd vue-hierarchy
npm install
npm run build
npx @vscode/vsce package --allow-missing-repository
code --install-extension vue-hierarchy-0.0.1.vsix
```

## 📖 使用方式

1. **打开 Vue 文件** — 在 VS Code 中打开任意 `.vue` 文件
2. **查看结构** — 左侧 Activity Bar 出现 Vue Hierarchy 图标（六边形），点击展开侧边栏
3. **浏览导航** — 展开/折叠分类节点，点击成员节点跳转到源码
4. **搜索过滤** — 在树形视图中按 `Ctrl+F` 搜索节点名称
5. **手动刷新** — 点击视图标题栏的 🔄 刷新按钮

### 命令

| 命令                              | 快捷操作       | 说明           |
| --------------------------------- | -------------- | -------------- |
| `Vue Hierarchy: Refresh`          | 标题栏刷新按钮 | 手动刷新结构树 |
| `Vue Hierarchy: Go to Definition` | 点击树节点     | 跳转到源码位置 |

## 📋 支持的选项

Vue Hierarchy 支持 Vue 2 和 Vue 3 的 **Options API** 所有常用选项：

| 分类         | 图标 | 说明                                        |
| ------------ | ---- | ------------------------------------------- |
| `template`   | 📄   | `<template>` 块位置                         |
| `props`      | 🔹   | 组件属性（支持数组/对象语法，显示类型信息） |
| `data`       | 📊   | 响应式数据（支持函数/箭头函数/对象形式）    |
| `computed`   | 🔧   | 计算属性（标注 get/set）                    |
| `methods`    | ⚙️   | 方法                                        |
| `watch`      | 👁   | 侦听器                                      |
| `lifecycle`  | 🕐   | 生命周期钩子（Vue 2 + Vue 3 全部钩子）      |
| `components` | 📦   | 注册的子组件                                |
| `directives` | 🏷   | 自定义指令                                  |
| `mixins`     | 🔀   | 混入                                        |
| `provide`    | ⬆️   | 依赖提供（支持函数/对象形式）               |
| `inject`     | ⬇️   | 依赖注入                                    |
| `emits`      | 📡   | 事件声明                                    |
| `filters`    | 🔽   | 过滤器（Vue 2）                             |
| `style`      | 🎨   | `<style>` 块（标注 scoped）                 |

## 🏗 项目结构

```
vue-hierarchy/
├── src/
│   ├── extension.ts        # 扩展入口，注册命令和事件监听
│   ├── VueFileParser.ts    # 核心解析器（SFC + AST）
│   ├── VueTreeProvider.ts  # TreeView 数据提供者
│   └── types.ts            # 类型定义
├── resources/
│   └── icon.svg            # Activity Bar 图标
├── dist/                   # 构建输出（esbuild bundle）
├── package.json            # 扩展清单
├── tsconfig.json           # TypeScript 配置
├── esbuild.js              # 构建脚本
└── .vscodeignore           # 打包排除规则
```

## 🔧 开发指南

### 环境要求

- **Node.js** >= 16
- **VS Code** >= 1.74.0

### 安装依赖

```bash
npm install
```

### 开发调试

```bash
# 监听模式构建（代码修改自动重新编译）
npm run watch
```

然后在 VS Code 中按 **F5** 启动 Extension Development Host：

1. 自动打开一个新的 VS Code 窗口
2. 在新窗口中打开包含 `.vue` 文件的项目
3. 左侧 Activity Bar 出现 Vue Hierarchy 图标
4. 修改 `src/` 中的代码后，在新窗口中按 `Ctrl+Shift+P` → **Developer: Reload Window** 重载

### 构建

```bash
# 开发构建（含 sourcemap）
npm run build

# 生产构建（压缩）
node esbuild.js --production

# TypeScript 类型检查
npx tsc --noEmit
```

## 🛠 技术栈

| 技术                                                           | 用途                                   |
| -------------------------------------------------------------- | -------------------------------------- |
| [**@vue/compiler-sfc**](https://github.com/vuejs/core)         | 解析 Vue SFC，提取 `<script>` 块       |
| [**@babel/parser**](https://babeljs.io/docs/babel-parser)      | 解析 JavaScript/TypeScript AST         |
| [**VS Code Extension API**](https://code.visualstudio.com/api) | TreeDataProvider、命令注册、编辑器交互 |
| [**esbuild**](https://esbuild.github.io/)                      | 极速打包构建                           |
| [**TypeScript**](https://www.typescriptlang.org/)              | 类型安全开发                           |

## 🗺 效果演示

<!-- [演示效果](./screen_capture.mp4) -->
[演示效果](https://private-user-images.githubusercontent.com/788738/558611398-97d6b41f-676e-44b2-bdb0-112c588d3316.mp4?jwt=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJnaXRodWIuY29tIiwiYXVkIjoicmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbSIsImtleSI6ImtleTUiLCJleHAiOjE3NzI3MDQxOTksIm5iZiI6MTc3MjcwMzg5OSwicGF0aCI6Ii83ODg3MzgvNTU4NjExMzk4LTk3ZDZiNDFmLTY3NmUtNDRiMi1iZGIwLTExMmM1ODhkMzMxNi5tcDQ_WC1BbXotQWxnb3JpdGhtPUFXUzQtSE1BQy1TSEEyNTYmWC1BbXotQ3JlZGVudGlhbD1BS0lBVkNPRFlMU0E1M1BRSzRaQSUyRjIwMjYwMzA1JTJGdXMtZWFzdC0xJTJGczMlMkZhd3M0X3JlcXVlc3QmWC1BbXotRGF0ZT0yMDI2MDMwNVQwOTQ0NTlaJlgtQW16LUV4cGlyZXM9MzAwJlgtQW16LVNpZ25hdHVyZT1lYjM3MDE3ZmIxODRhYzBiNTIzYWNiOTMxNjQ1NjM4NTZjZjU1NTUwNDQzMjY0YjcxNjQxOTAyZTMxOTkwOTJiJlgtQW16LVNpZ25lZEhlYWRlcnM9aG9zdCJ9._cSMSXs0UPu1rPTFzImz-lKl5A2Hb4u411C04ZC9ANY)

## License

[MIT](LICENSE) © Vue Hierarchy Contributors
