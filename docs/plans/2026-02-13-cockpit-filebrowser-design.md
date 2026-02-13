# cockpit-filebrowser 设计文档

**日期**: 2026-02-13
**状态**: 已批准

## 概述

cockpit-filebrowser 是一个全新的 Cockpit 文件浏览器插件，使用 React + PatternFly v5 构建，从第一天起内置 i18n 支持。它不是 cockpit-navigator 的 fork，而是一个独立的全新产品。

## 技术栈

| 层面 | 技术 |
|------|------|
| 框架 | React 18 + JSX |
| UI | PatternFly v5 (@patternfly/react-core) |
| 代码编辑器 | Monaco Editor (@patternfly/react-code-editor) |
| Markdown | react-markdown + remark-gfm + mermaid |
| 状态管理 | React Context + useReducer |
| 后端通信 | cockpit.spawn() / cockpit.file() |
| 构建 | esbuild (Cockpit starter-kit 标准) |
| i18n | cockpit.gettext (GNU gettext) |
| 打包 | RPM + deb (Cockpit 标准) |

## 项目结构

```
cockpit-filebrowser/
├── src/
│   ├── index.html              # Cockpit 入口 HTML
│   ├── index.jsx               # React 挂载点
│   ├── App.jsx                 # 主布局 (PatternFly Page)
│   ├── api/
│   │   └── cockpit-fs.js      # 后端通信层
│   ├── components/
│   │   ├── FileBrowser/        # 文件列表 (表格+网格视图)
│   │   ├── FileEditor/         # Monaco 编辑器封装
│   │   ├── MarkdownViewer/     # Markdown 预览 + Mermaid
│   │   ├── Sidebar/            # 书签 + 快速访问
│   │   ├── Toolbar/            # 导航栏 + 搜索 + 操作按钮
│   │   ├── Properties/         # 属性面板 + 权限编辑
│   │   └── Search/             # 搜索面板
│   ├── hooks/                  # 自定义 React hooks
│   ├── store/                  # 状态管理 (Context)
│   └── i18n.js                 # gettext 封装
├── po/                         # 翻译文件
├── packaging/                  # RPM/deb 打包
├── build.js                    # esbuild 配置
├── Makefile
└── package.json
```

## 核心模块

### 1. 文件浏览器 (FileBrowser)

- **双视图**: 表格视图 (PatternFly Table，排序列：名称/大小/修改时间/权限/所有者) + 网格视图 (图标卡片)
- **导航**: 面包屑路径栏 + 前进/后退/上级按钮，地址栏可直接输入路径
- **基础操作**: 新建文件/目录/符号链接、重命名 (行内编辑)、删除 (确认对话框)、复制/剪切/粘贴
- **拖拽上传**: 支持文件和文件夹拖拽上传，显示进度条
- **右键菜单**: PatternFly Dropdown 实现上下文菜单
- **文件夹打包下载**: 右键选中文件夹 → 后端 `tar czf` 打包 → 浏览器下载

### 2. 侧边栏 (Sidebar)

- **收藏夹**: 用户可收藏常用路径，存储在 `~/.config/cockpit-filebrowser/bookmarks.json`
- **快速访问**: 预置 Home、Root (/)、/tmp、/etc

### 3. 文件编辑器 (FileEditor)

- **Monaco Editor**: 通过 `@patternfly/react-code-editor` 集成
- 语法高亮 (自动识别语言)、行号、搜索替换
- 保存通过 `cockpit.file(path).replace(content)` 写回

### 4. Markdown 预览 (MarkdownViewer)

- **编辑+预览分栏**: 左侧 Monaco 编辑、右侧实时预览
- react-markdown + remark-gfm (表格/任务列表等)
- **Mermaid 图表**: 自定义 code block 渲染器，检测 ```mermaid 块后调用 mermaid.render()

### 5. 权限管理 (Properties)

- **属性面板**: 文件名/路径/大小/时间戳/类型
- **权限编辑**: 9 个 checkbox (rwx × owner/group/other) + 八进制显示
- **所有者/组**: 输入框修改，通过 `cockpit.spawn(["chown", ...])` 执行

### 6. 搜索 (Search)

- **文件名搜索**: `find` 命令，支持通配符
- **内容搜索**: `grep -r` 全文检索
- 结果列表可点击直接定位到文件

## 后端 API 层 (cockpit-fs.js)

统一封装所有文件系统操作：

```javascript
listDirectory(path)        // cockpit.spawn(["ls", ...])
readFile(path)             // cockpit.file(path).read()
writeFile(path, content)   // cockpit.file(path).replace(content)
createDirectory(path)      // cockpit.spawn(["mkdir", "-p", path])
deleteEntry(path)          // cockpit.spawn(["rm", "-rf", path])
moveEntry(src, dest)       // cockpit.spawn(["mv", src, dest])
copyEntry(src, dest)       // cockpit.spawn(["cp", "-r", src, dest])
chmod(path, mode)          // cockpit.spawn(["chmod", mode, path])
chown(path, owner, group)  // cockpit.spawn(["chown", ...])
search(path, pattern)      // cockpit.spawn(["find", ...])
grepSearch(path, pattern)  // cockpit.spawn(["grep", "-r", ...])
downloadArchive(path)      // cockpit.spawn(["tar", ...])
stat(path)                 // cockpit.spawn(["stat", ...])
```

所有 spawn 调用使用 `{superuser: "try", err: "out"}` 支持权限提升。

## i18n 方案

- 所有用户可见字符串从第一天起使用 `cockpit.gettext()` / `_()` 包装
- HTML 使用 `translate="yes"` 属性
- `cockpit.translate()` 在应用初始化时调用
- PO 文件在 `po/` 目录，构建时编译为 `dist/po.*.js`
- 内置 zh_CN 简体中文翻译

## 状态管理

React Context + useReducer 管理全局状态：

```javascript
{
  currentPath: string,
  entries: Entry[],
  selectedEntries: Set<string>,
  viewMode: "table" | "grid",
  clipboard: { entries: Entry[], operation: "copy" | "cut" } | null,
  bookmarks: string[],
  showHidden: boolean,
  sortBy: { field: string, direction: "asc" | "desc" },
  searchQuery: string,
  editorFile: string | null,
  propertiesFile: string | null
}
```
