[English](README.md) | [简体中文](README.zh-CN.md) | [日本語](README.ja.md)

# cockpit-filebrowser

一个现代化的 [Cockpit](https://cockpit-project.org/) Web 控制台文件浏览器插件。

基于 React 18、PatternFly v6 和 Monaco Editor 构建。

## 功能特性

- 浏览、创建、重命名、删除文件和目录
- 上传和下载文件（支持单个和批量操作）
- 剪切 / 复制 / 粘贴剪贴板操作
- 内置代码编辑器（Monaco），支持语法高亮
- Markdown 预览，支持分屏视图
- 网格视图和表格视图两种模式
- 文件搜索
- 书签和快速访问侧边栏
- 文件属性面板（权限、所有者、大小等）
- 响应式布局，适配手机和平板
- 触摸设备支持（双击导航）
- 国际化支持（已包含中文翻译）

## 截图

*（即将添加）*

## 系统要求

- Cockpit >= 137
- Node.js >= 16（用于构建）

## 安装

### 通过 .deb 包安装

```bash
sudo dpkg -i cockpit-filebrowser_*.deb
```

### 从源码安装

```bash
git clone https://github.com/tetrisKun/cockpit-filebrowser.git
cd cockpit-filebrowser
npm install
npm run build
sudo make install
```

安装后在 Cockpit 控制台中导航至 **工具 > File Browser** 即可使用。

## 开发

```bash
npm install
npm run watch        # 监听模式，自动重新构建
make devel-install   # 将 dist/ 软链接到 ~/.local/share/cockpit/filebrowser
```

在浏览器中打开 `https://localhost:9090/cockpit/@localhost/filebrowser/index.html`。

## 构建

```bash
npm run build        # 生产环境构建，输出到 dist/
```

## 项目结构

```
src/
  api/            Cockpit 文件系统 API 封装
  store/          React Context + useReducer 状态管理
  components/
    FileBrowser/  文件表格和网格视图
    FileEditor/   基于 Monaco 的代码编辑器
    Toolbar/      导航和操作工具栏
    Sidebar/      快速访问和书签侧边栏
    Properties/   文件属性面板
    Search/       文件搜索
    Upload/       拖拽上传区域
    ContextMenu/  右键上下文菜单
    Dialogs/      创建、重命名、删除对话框
po/               翻译文件（.po）
dist/             构建输出（不提交到仓库）
```

## 技术栈

- **React 18** + TypeScript
- **PatternFly v6**（UI 组件库）
- **Monaco Editor**（代码编辑器，本地加载以符合 CSP 策略）
- **esbuild**（打包工具）
- **Cockpit APIs**（cockpit.spawn、cockpit.file、cockpit.gettext）

## 国际化

所有用户界面字符串使用 `cockpit.gettext`，翻译文件位于 `po/*.po`。

```bash
make pot             # 生成/更新 .pot 模板
make update-po       # 将 .pot 合并到现有 .po 文件
```

## 许可证

[LGPL-2.1](LICENSE)
