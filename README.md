[English](README.md) | [简体中文](README.zh-CN.md) | [日本語](README.ja.md)

# cockpit-filebrowser

A modern file browser plugin for the [Cockpit](https://cockpit-project.org/) web console.

Built with React 18, PatternFly v6, and Monaco Editor.

## Features

- Browse, create, rename, delete files and directories
- Upload and download files (single and batch)
- Cut / Copy / Paste with clipboard support
- Built-in code editor (Monaco) with syntax highlighting
- Markdown preview with split view
- Grid and table view modes
- File search
- Bookmarks and quick access sidebar
- File properties panel (permissions, owner, size, etc.)
- Responsive layout for mobile and tablet
- Touch device support (double-tap navigation)
- i18n support (Chinese included)

## Screenshots

*(coming soon)*

## Requirements

- Cockpit >= 137
- Node.js >= 16 (for building)

## Install

### From .deb package

```bash
sudo dpkg -i cockpit-filebrowser_*.deb
```

### From source

```bash
git clone https://github.com/tetrisKun/cockpit-filebrowser.git
cd cockpit-filebrowser
npm install
npm run build
sudo make install
```

Then navigate to **Tools > File Browser** in your Cockpit web console.

## Development

```bash
npm install
npm run watch        # Watch mode with auto-rebuild
make devel-install   # Symlink dist/ to ~/.local/share/cockpit/filebrowser
```

Open `https://localhost:9090/cockpit/@localhost/filebrowser/index.html` in your browser.

## Build

```bash
npm run build        # Production build to dist/
```

## Project Structure

```
src/
  api/            Cockpit filesystem API wrapper
  store/          React Context + useReducer state management
  components/
    FileBrowser/  File table and grid views
    FileEditor/   Monaco-based code editor
    Toolbar/      Navigation and action toolbar
    Sidebar/      Quick access and bookmarks
    Properties/   File properties panel
    Search/       File search
    Upload/       Drag-and-drop upload zone
    ContextMenu/  Right-click context menu
    Dialogs/      Create, rename, delete dialogs
po/               Translation files (.po)
dist/             Build output (not committed)
```

## Tech Stack

- **React 18** + TypeScript
- **PatternFly v6** (UI components)
- **Monaco Editor** (code editing, loaded locally for CSP compliance)
- **esbuild** (bundling)
- **Cockpit APIs** (cockpit.spawn, cockpit.file, cockpit.gettext)

## i18n

All user-facing strings use `cockpit.gettext`. Translations live in `po/*.po`.

```bash
make pot             # Generate/update .pot template
make update-po       # Merge .pot into existing .po files
```

## License

[LGPL-2.1](LICENSE)
