# cockpit-filebrowser Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a modern Cockpit file browser plugin with React + PatternFly, featuring file management, code editing, Markdown preview, permissions, search, and i18n.

**Architecture:** Based on Cockpit starter-kit scaffold (esbuild + Cockpit plugins). React 18 with PatternFly v6 components. State managed via React Context + useReducer. Backend via cockpit.spawn()/cockpit.file() APIs. GNU gettext i18n from day one.

**Tech Stack:** React 18, PatternFly v6, TypeScript, esbuild, Monaco Editor, react-markdown, mermaid, cockpit.js APIs

**Working Directory:** `/Users/kun/Workspace/cockpit-filebrowser`

---

### Task 1: Project Scaffold — Cockpit Starter-Kit Foundation

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `build.js`
- Create: `Makefile`
- Create: `.gitignore`
- Create: `.eslintrc.json`
- Create: `src/manifest.json`
- Create: `src/index.html`
- Create: `src/index.tsx`
- Create: `src/app.tsx`
- Create: `src/app.scss`

**Step 1: Create package.json**

```json
{
  "name": "cockpit-filebrowser",
  "version": "0.1.0",
  "description": "A modern file browser for Cockpit",
  "type": "module",
  "main": "index.js",
  "license": "LGPL-2.1",
  "engines": { "node": ">= 16" },
  "scripts": {
    "watch": "ESBUILD_WATCH='true' ./build.js",
    "build": "./build.js",
    "eslint": "eslint src/",
    "eslint:fix": "eslint --fix src/",
    "stylelint": "stylelint src/*.{css,scss}",
    "stylelint:fix": "stylelint --fix src/*.{css,scss}"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "@patternfly/patternfly": "^6.1.0",
    "@patternfly/react-core": "^6.1.0",
    "@patternfly/react-icons": "^6.1.0",
    "@patternfly/react-table": "^6.1.0",
    "@patternfly/react-styles": "^6.4.0",
    "@patternfly/react-code-editor": "^6.1.0",
    "@monaco-editor/react": "^4.7.0",
    "react-markdown": "^9.0.1",
    "remark-gfm": "^4.0.0",
    "mermaid": "^11.4.0",
    "esbuild": "^0.27.0",
    "esbuild-sass-plugin": "^3.6.0",
    "argparse": "^2.0.1",
    "gettext-parser": "^9.0.0"
  },
  "devDependencies": {
    "typescript": "^5.9.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "eslint": "^8.57.0",
    "eslint-plugin-react": "^7.37.0",
    "eslint-plugin-react-hooks": "^4.6.0",
    "stylelint": "^17.1.0"
  }
}
```

**Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "allowJs": true,
    "checkJs": true,
    "jsx": "react",
    "lib": ["dom", "es2020"],
    "paths": { "*": ["./pkg/lib/*"] },
    "moduleResolution": "bundler",
    "noEmit": true,
    "strict": true,
    "target": "es2020"
  },
  "include": ["src/**/*"]
}
```

**Step 3: Create build.js**

Adapt from Cockpit starter-kit. This is the esbuild config that:
- Bundles src/index.tsx → dist/index.js
- Compiles SCSS → dist/index.css
- Copies src/index.html and src/manifest.json to dist/
- Integrates cockpit-po-plugin for i18n
- Supports watch mode via `-w` flag or `ESBUILD_WATCH=true`

The script should:
1. Import esbuild, sassPlugin, and cockpit plugins from `pkg/lib/`
2. Define entry points as `["./src/index.tsx"]`
3. Output to `dist/`
4. Enable JSX for React
5. Include cockpit-po-plugin, sass-plugin, and copy plugin for static files

**Step 4: Create Makefile**

Adapt from Cockpit starter-kit with these targets:
- `all` (default): runs `./build.js`
- `install`: copies dist/ to `$(DESTDIR)/usr/share/cockpit/filebrowser`
- `devel-install`: symlinks dist/ to `~/.local/share/cockpit/filebrowser`
- `clean`: removes dist/ and node_modules/
- `pot`: extracts translatable strings via xgettext
- `po2js`: compiles PO files (handled by esbuild cockpit-po-plugin during build)

**Step 5: Create .gitignore**

```
node_modules/
dist/
pkg/
package-lock.json
*.pyc
.cache
```

**Step 6: Create .eslintrc.json**

```json
{
  "env": { "browser": true, "es2021": true },
  "extends": ["eslint:recommended", "plugin:react/recommended", "plugin:react-hooks/recommended"],
  "parserOptions": { "ecmaVersion": 2021, "sourceType": "module", "ecmaFeatures": { "jsx": true } },
  "plugins": ["react", "react-hooks"],
  "rules": { "indent": ["error", 4], "react/react-in-jsx-scope": "off" },
  "settings": { "react": { "version": "detect" } }
}
```

**Step 7: Create src/manifest.json**

```json
{
  "requires": { "cockpit": "137" },
  "tools": {
    "index": {
      "label": "File Browser"
    }
  }
}
```

**Step 8: Create src/index.html**

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <title translate>File Browser</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link rel="stylesheet" href="index.css">
    <link href="../../static/branding.css" rel="stylesheet" />
    <script type="text/javascript" src="index.js"></script>
    <script type="text/javascript" src="po.js"></script>
</head>
<body>
    <div id="app"></div>
</body>
</html>
```

**Step 9: Create src/index.tsx**

```tsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import "cockpit-dark-theme";
import { Application } from './app';
import "patternfly/patternfly-6-cockpit.scss";
import './app.scss';

document.addEventListener("DOMContentLoaded", () => {
    createRoot(document.getElementById("app")!).render(<Application />);
});
```

**Step 10: Create src/app.tsx — minimal hello-world**

```tsx
import React from 'react';
import { Page, PageSection } from "@patternfly/react-core/dist/esm/components/Page/index.js";
import { Card, CardBody, CardTitle } from "@patternfly/react-core/dist/esm/components/Card/index.js";
import cockpit from 'cockpit';

const _ = cockpit.gettext;

export const Application = () => {
    return (
        <Page>
            <PageSection>
                <Card>
                    <CardTitle>{_("File Browser")}</CardTitle>
                    <CardBody>{_("Loading...")}</CardBody>
                </Card>
            </PageSection>
        </Page>
    );
};
```

**Step 11: Create src/app.scss**

```scss
@use "page.scss";
```

**Step 12: Fetch Cockpit libraries and install dependencies**

Run:
```bash
make
```

This triggers the Makefile which fetches Cockpit's `pkg/lib/` (cockpit-po-plugin, cockpit.d.ts, etc.) and `tools/` from the Cockpit repository, then runs npm install and build.js.

If Cockpit libraries can't be fetched automatically, manually obtain the required files:
- `pkg/lib/cockpit-po-plugin.js`
- `pkg/lib/cockpit-rsync-plugin.js`
- `pkg/lib/esbuild-cleanup-plugin.js`
- `pkg/lib/esbuild-compress-plugin.js`

**Step 13: Verify build produces dist/ with all files**

Run: `ls dist/`
Expected: `index.html  index.css  index.js  manifest.json  po.js`

**Step 14: Commit**

```bash
git add -A
git commit -m "feat: initialize project scaffold from Cockpit starter-kit"
```

---

### Task 2: Backend API Layer (cockpit-fs.ts)

**Files:**
- Create: `src/api/cockpit-fs.ts`
- Create: `src/api/types.ts`

**Step 1: Create type definitions**

Create `src/api/types.ts`:

```typescript
export interface FileEntry {
    name: string;
    path: string;
    type: "file" | "directory" | "link" | "special";
    size: number;
    modified: string;   // ISO timestamp
    owner: string;
    group: string;
    mode: string;       // e.g. "rwxr-xr-x"
    modeOctal: string;  // e.g. "755"
    linkTarget?: string;
}

export interface FileStats {
    name: string;
    path: string;
    type: string;
    size: number;
    modified: string;
    accessed: string;
    created: string;
    owner: string;
    group: string;
    mode: string;
    modeOctal: string;
    linkTarget?: string;
    inode: number;
}
```

**Step 2: Create cockpit-fs.ts**

Create `src/api/cockpit-fs.ts` with all filesystem operations:

```typescript
import cockpit from "cockpit";
import type { FileEntry, FileStats } from "./types";

const spawnOpts = { superuser: "try" as const, err: "message" as const };

export async function listDirectory(path: string, showHidden: boolean): Promise<FileEntry[]> {
    const args = ["ls", "-lAp", "--time-style=full-iso", path];
    if (!showHidden) args.splice(1, 1, "-lp", "--time-style=full-iso");
    const result = await cockpit.spawn(args, spawnOpts);
    return parseLsOutput(result, path);
}

function parseLsOutput(output: string, basePath: string): FileEntry[] {
    const lines = output.split("\n").filter(l => l && !l.startsWith("total"));
    return lines.map(line => {
        const parts = line.split(/\s+/);
        const mode = parts[0];
        const owner = parts[2];
        const group = parts[3];
        const size = parseInt(parts[4], 10);
        // full-iso format: "2024-01-15 12:30:00.000000000 +0000"
        const modified = parts[5] + "T" + parts[6];
        let name = parts.slice(8).join(" ");
        let linkTarget: string | undefined;
        const linkIdx = name.indexOf(" -> ");
        if (linkIdx !== -1) {
            linkTarget = name.substring(linkIdx + 4);
            name = name.substring(0, linkIdx);
        }
        // Remove trailing / from directory names
        if (name.endsWith("/")) name = name.slice(0, -1);

        const type = mode.startsWith("d") ? "directory"
            : mode.startsWith("l") ? "link"
            : mode.startsWith("-") ? "file"
            : "special";

        const modeOctal = modeStringToOctal(mode.slice(1));
        const fullPath = basePath === "/" ? "/" + name : basePath + "/" + name;

        return { name, path: fullPath, type, size, modified, owner, group, mode: mode.slice(1), modeOctal, linkTarget };
    }).filter(e => e.name && e.name !== "." && e.name !== "..");
}

function modeStringToOctal(mode: string): string {
    let octal = 0;
    for (let i = 0; i < 9; i++) {
        if (mode[i] !== "-") {
            octal += 1 << (8 - i);
        }
    }
    // Handle setuid/setgid/sticky
    if (mode[2] === "s" || mode[2] === "S") octal += 0o4000;
    if (mode[5] === "s" || mode[5] === "S") octal += 0o2000;
    if (mode[8] === "t" || mode[8] === "T") octal += 0o1000;
    return octal.toString(8).padStart(3, "0");
}

export async function stat(path: string): Promise<FileStats> {
    const fmt = "%n|%F|%s|%Y|%X|%W|%U|%G|%a|%f|%i";
    const result = await cockpit.spawn(["stat", "--printf", fmt, path], spawnOpts);
    const parts = result.split("|");
    const name = parts[0].split("/").pop() || parts[0];
    return {
        name,
        path,
        type: parts[1],
        size: parseInt(parts[2], 10),
        modified: new Date(parseInt(parts[3], 10) * 1000).toISOString(),
        accessed: new Date(parseInt(parts[4], 10) * 1000).toISOString(),
        created: parts[5] !== "0" ? new Date(parseInt(parts[5], 10) * 1000).toISOString() : "",
        owner: parts[6],
        group: parts[7],
        modeOctal: parts[8],
        mode: "", // filled from listing
        inode: parseInt(parts[10], 10),
    };
}

export async function readFile(path: string): Promise<string> {
    return cockpit.file(path, { superuser: "try" }).read();
}

export async function writeFile(path: string, content: string): Promise<void> {
    await cockpit.file(path, { superuser: "try" }).replace(content);
}

export async function createFile(path: string): Promise<void> {
    await cockpit.spawn(["touch", path], spawnOpts);
}

export async function createDirectory(path: string): Promise<void> {
    await cockpit.spawn(["mkdir", "-p", path], spawnOpts);
}

export async function createSymlink(target: string, linkPath: string): Promise<void> {
    await cockpit.spawn(["ln", "-s", target, linkPath], spawnOpts);
}

export async function deleteEntry(path: string): Promise<void> {
    await cockpit.spawn(["rm", "-rf", path], spawnOpts);
}

export async function moveEntry(src: string, dest: string): Promise<void> {
    await cockpit.spawn(["mv", src, dest], spawnOpts);
}

export async function copyEntry(src: string, dest: string): Promise<void> {
    await cockpit.spawn(["cp", "-r", src, dest], spawnOpts);
}

export async function rename(oldPath: string, newName: string): Promise<void> {
    const dir = oldPath.substring(0, oldPath.lastIndexOf("/"));
    const newPath = dir + "/" + newName;
    await cockpit.spawn(["mv", oldPath, newPath], spawnOpts);
}

export async function chmod(path: string, mode: string): Promise<void> {
    await cockpit.spawn(["chmod", mode, path], spawnOpts);
}

export async function chown(path: string, owner: string, group: string): Promise<void> {
    await cockpit.spawn(["chown", `${owner}:${group}`, path], spawnOpts);
}

export async function searchFiles(dir: string, pattern: string): Promise<string[]> {
    const result = await cockpit.spawn(
        ["find", dir, "-maxdepth", "5", "-iname", pattern, "-not", "-path", "*/\\.*"],
        { ...spawnOpts, err: "ignore" }
    );
    return result.trim().split("\n").filter(Boolean);
}

export async function grepSearch(dir: string, pattern: string): Promise<string[]> {
    const result = await cockpit.spawn(
        ["grep", "-rl", "--include=*", "-m", "1", pattern, dir],
        { ...spawnOpts, err: "ignore" }
    );
    return result.trim().split("\n").filter(Boolean);
}

export async function downloadArchive(path: string): Promise<void> {
    const name = path.split("/").pop() || "archive";
    const parentDir = path.substring(0, path.lastIndexOf("/")) || "/";
    const result = await cockpit.spawn(
        ["tar", "czf", "-", "-C", parentDir, name],
        { ...spawnOpts, binary: true }
    );
    const blob = new Blob([result], { type: "application/gzip" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name + ".tar.gz";
    a.click();
    URL.revokeObjectURL(url);
}
```

**Step 3: Commit**

```bash
git add src/api/
git commit -m "feat: add cockpit filesystem API layer"
```

---

### Task 3: State Management (Context + Reducer)

**Files:**
- Create: `src/store/FileBrowserContext.tsx`
- Create: `src/store/reducer.ts`
- Create: `src/store/actions.ts`

**Step 1: Create reducer with all action types**

Create `src/store/actions.ts`:

```typescript
import type { FileEntry } from "../api/types";

export type SortField = "name" | "size" | "modified" | "owner" | "mode";
export type SortDirection = "asc" | "desc";
export type ViewMode = "table" | "grid";

export interface FileBrowserState {
    currentPath: string;
    entries: FileEntry[];
    loading: boolean;
    error: string | null;
    selectedEntries: Set<string>;
    viewMode: ViewMode;
    clipboard: { entries: FileEntry[]; operation: "copy" | "cut" } | null;
    bookmarks: string[];
    showHidden: boolean;
    sortBy: { field: SortField; direction: SortDirection };
    editorFile: string | null;
    propertiesFile: string | null;
    history: string[];
    historyIndex: number;
}

export type Action =
    | { type: "SET_PATH"; path: string }
    | { type: "SET_ENTRIES"; entries: FileEntry[] }
    | { type: "SET_LOADING"; loading: boolean }
    | { type: "SET_ERROR"; error: string | null }
    | { type: "SELECT_ENTRY"; name: string; multi?: boolean }
    | { type: "SELECT_ALL" }
    | { type: "CLEAR_SELECTION" }
    | { type: "SET_VIEW_MODE"; mode: ViewMode }
    | { type: "SET_CLIPBOARD"; entries: FileEntry[]; operation: "copy" | "cut" }
    | { type: "CLEAR_CLIPBOARD" }
    | { type: "ADD_BOOKMARK"; path: string }
    | { type: "REMOVE_BOOKMARK"; path: string }
    | { type: "SET_BOOKMARKS"; bookmarks: string[] }
    | { type: "TOGGLE_HIDDEN" }
    | { type: "SET_SORT"; field: SortField; direction: SortDirection }
    | { type: "OPEN_EDITOR"; path: string }
    | { type: "CLOSE_EDITOR" }
    | { type: "OPEN_PROPERTIES"; path: string }
    | { type: "CLOSE_PROPERTIES" }
    | { type: "NAVIGATE_BACK" }
    | { type: "NAVIGATE_FORWARD" };
```

Create `src/store/reducer.ts`:

```typescript
import type { FileBrowserState, Action } from "./actions";

export const initialState: FileBrowserState = {
    currentPath: "/",
    entries: [],
    loading: false,
    error: null,
    selectedEntries: new Set(),
    viewMode: "table",
    clipboard: null,
    bookmarks: [],
    showHidden: false,
    sortBy: { field: "name", direction: "asc" },
    editorFile: null,
    propertiesFile: null,
    history: ["/"],
    historyIndex: 0,
};

export function fileBrowserReducer(state: FileBrowserState, action: Action): FileBrowserState {
    switch (action.type) {
        case "SET_PATH": {
            const newHistory = state.history.slice(0, state.historyIndex + 1);
            newHistory.push(action.path);
            return { ...state, currentPath: action.path, selectedEntries: new Set(), history: newHistory, historyIndex: newHistory.length - 1 };
        }
        case "SET_ENTRIES":
            return { ...state, entries: action.entries, loading: false };
        case "SET_LOADING":
            return { ...state, loading: action.loading };
        case "SET_ERROR":
            return { ...state, error: action.error, loading: false };
        case "SELECT_ENTRY": {
            const next = new Set(action.multi ? state.selectedEntries : []);
            if (next.has(action.name)) next.delete(action.name);
            else next.add(action.name);
            return { ...state, selectedEntries: next };
        }
        case "SELECT_ALL":
            return { ...state, selectedEntries: new Set(state.entries.map(e => e.name)) };
        case "CLEAR_SELECTION":
            return { ...state, selectedEntries: new Set() };
        case "SET_VIEW_MODE":
            return { ...state, viewMode: action.mode };
        case "SET_CLIPBOARD":
            return { ...state, clipboard: { entries: action.entries, operation: action.operation } };
        case "CLEAR_CLIPBOARD":
            return { ...state, clipboard: null };
        case "ADD_BOOKMARK":
            return { ...state, bookmarks: [...state.bookmarks.filter(b => b !== action.path), action.path] };
        case "REMOVE_BOOKMARK":
            return { ...state, bookmarks: state.bookmarks.filter(b => b !== action.path) };
        case "SET_BOOKMARKS":
            return { ...state, bookmarks: action.bookmarks };
        case "TOGGLE_HIDDEN":
            return { ...state, showHidden: !state.showHidden };
        case "SET_SORT":
            return { ...state, sortBy: { field: action.field, direction: action.direction } };
        case "OPEN_EDITOR":
            return { ...state, editorFile: action.path };
        case "CLOSE_EDITOR":
            return { ...state, editorFile: null };
        case "OPEN_PROPERTIES":
            return { ...state, propertiesFile: action.path };
        case "CLOSE_PROPERTIES":
            return { ...state, propertiesFile: null };
        case "NAVIGATE_BACK": {
            if (state.historyIndex <= 0) return state;
            const idx = state.historyIndex - 1;
            return { ...state, currentPath: state.history[idx], historyIndex: idx, selectedEntries: new Set() };
        }
        case "NAVIGATE_FORWARD": {
            if (state.historyIndex >= state.history.length - 1) return state;
            const idx = state.historyIndex + 1;
            return { ...state, currentPath: state.history[idx], historyIndex: idx, selectedEntries: new Set() };
        }
        default:
            return state;
    }
}
```

**Step 2: Create Context provider**

Create `src/store/FileBrowserContext.tsx`:

```tsx
import React, { createContext, useContext, useReducer, useCallback, useEffect } from "react";
import { fileBrowserReducer, initialState } from "./reducer";
import type { FileBrowserState, Action } from "./actions";
import * as fs from "../api/cockpit-fs";
import cockpit from "cockpit";

interface FileBrowserContextType {
    state: FileBrowserState;
    dispatch: React.Dispatch<Action>;
    navigate: (path: string) => void;
    refresh: () => void;
}

const FileBrowserContext = createContext<FileBrowserContextType | null>(null);

export function FileBrowserProvider({ children }: { children: React.ReactNode }) {
    const [state, dispatch] = useReducer(fileBrowserReducer, initialState);

    const loadDirectory = useCallback(async (path: string) => {
        dispatch({ type: "SET_LOADING", loading: true });
        dispatch({ type: "SET_ERROR", error: null });
        try {
            const entries = await fs.listDirectory(path, state.showHidden);
            dispatch({ type: "SET_ENTRIES", entries });
        } catch (err: any) {
            dispatch({ type: "SET_ERROR", error: err.message || String(err) });
        }
    }, [state.showHidden]);

    const navigate = useCallback((path: string) => {
        dispatch({ type: "SET_PATH", path });
    }, []);

    const refresh = useCallback(() => {
        loadDirectory(state.currentPath);
    }, [loadDirectory, state.currentPath]);

    // Load directory when path or showHidden changes
    useEffect(() => {
        loadDirectory(state.currentPath);
    }, [state.currentPath, state.showHidden, loadDirectory]);

    // Load bookmarks from config file
    useEffect(() => {
        cockpit.file("~/.config/cockpit-filebrowser/bookmarks.json", { superuser: "try" })
            .read()
            .then((content: string) => {
                if (content) {
                    try {
                        dispatch({ type: "SET_BOOKMARKS", bookmarks: JSON.parse(content) });
                    } catch { /* ignore parse errors */ }
                }
            })
            .catch(() => { /* file doesn't exist yet */ });
    }, []);

    // Initialize to user's home directory
    useEffect(() => {
        const home = cockpit.info?.home || "/root";
        navigate(home);
    }, [navigate]);

    return (
        <FileBrowserContext.Provider value={{ state, dispatch, navigate, refresh }}>
            {children}
        </FileBrowserContext.Provider>
    );
}

export function useFileBrowser() {
    const ctx = useContext(FileBrowserContext);
    if (!ctx) throw new Error("useFileBrowser must be used within FileBrowserProvider");
    return ctx;
}
```

**Step 3: Commit**

```bash
git add src/store/
git commit -m "feat: add state management with React Context + useReducer"
```

---

### Task 4: Main Layout + Toolbar

**Files:**
- Modify: `src/app.tsx` — replace placeholder with full layout
- Create: `src/components/Toolbar/Toolbar.tsx`
- Create: `src/components/Toolbar/PathBar.tsx`

**Step 1: Create PathBar — breadcrumb + editable path input**

Create `src/components/Toolbar/PathBar.tsx`:

A component that shows the current path as a PatternFly Breadcrumb. Clicking on a segment navigates to that directory. Has a toggle to switch to an editable text input for direct path entry.

Key PatternFly components: `Breadcrumb`, `BreadcrumbItem`, `TextInput`, `Button`.

**Step 2: Create Toolbar**

Create `src/components/Toolbar/Toolbar.tsx`:

Contains: Back/Forward/Up/Refresh buttons, PathBar, view mode toggle (table/grid), hidden files toggle, and action buttons (New File, New Dir, Upload).

Key PatternFly components: `Toolbar`, `ToolbarContent`, `ToolbarGroup`, `ToolbarItem`, `Button`, `ToggleGroup`, `ToggleGroupItem`.

All labels wrapped with `_()` for i18n.

**Step 3: Update app.tsx to use layout**

Replace the placeholder in `src/app.tsx` with:
- `FileBrowserProvider` wrapping everything
- PatternFly `Page` with `PageSection` for toolbar and main content area
- Import and render `Toolbar`
- Placeholder div for file list area

**Step 4: Build and verify**

Run: `npm run build`
Expected: No errors, dist/ updated

**Step 5: Commit**

```bash
git add src/
git commit -m "feat: add main layout with toolbar and path navigation"
```

---

### Task 5: File Browser — Table View

**Files:**
- Create: `src/components/FileBrowser/FileBrowser.tsx`
- Create: `src/components/FileBrowser/FileTable.tsx`
- Create: `src/components/FileBrowser/FileIcon.tsx`
- Create: `src/components/FileBrowser/file-browser.scss`

**Step 1: Create FileIcon helper**

Maps file type/extension to PatternFly icons:
- Directory → `FolderIcon` / `FolderOpenIcon`
- Symlink → `LinkIcon`
- Images → `FileImageIcon`
- Code → `FileCodeIcon`
- Default → `FileIcon`

**Step 2: Create FileTable**

PatternFly `Table` with:
- Sortable columns: Name (with icon), Size, Modified, Permissions, Owner
- Row selection via checkbox
- Double-click on directory → navigate into it
- Double-click on file → open in editor
- Single-click → select
- Ctrl+click → multi-select
- Right-click → context menu (Task 7)

Use `@patternfly/react-table`: `Table`, `Thead`, `Tbody`, `Tr`, `Th`, `Td`.

Sort logic: sort entries by `state.sortBy` field/direction. Directories always before files.

**Step 3: Create FileBrowser container**

Renders `FileTable` (or `FileGrid` later) based on `state.viewMode`.
Shows loading spinner when `state.loading`.
Shows error alert when `state.error`.

**Step 4: Wire into app.tsx**

Add `<FileBrowser />` to the main content area.

**Step 5: Build and verify**

Run: `npm run build`

**Step 6: Commit**

```bash
git add src/
git commit -m "feat: add file browser with sortable table view"
```

---

### Task 6: Sidebar — Bookmarks + Quick Access

**Files:**
- Create: `src/components/Sidebar/Sidebar.tsx`
- Create: `src/components/Sidebar/sidebar.scss`
- Modify: `src/app.tsx` — add sidebar to Page layout

**Step 1: Create Sidebar**

Two sections:
1. **Quick Access** — hardcoded paths: Home (`~`), Root (`/`), `/tmp`, `/etc`, `/var/log`
2. **Bookmarks** — from `state.bookmarks`, with remove (x) button per item

Use PatternFly `Nav`, `NavList`, `NavItem` for the sidebar menu.
Add a "Bookmark current" button (star icon) in the sidebar header.

Saving bookmarks: when `state.bookmarks` changes, write to `~/.config/cockpit-filebrowser/bookmarks.json` via `cockpit.file().replace()`.

**Step 2: Wire sidebar into Page layout**

Update `src/app.tsx` to pass sidebar as the `sidebar` prop of PatternFly `Page`:

```tsx
<Page sidebar={<PageSidebar><PageSidebarBody><Sidebar /></PageSidebarBody></PageSidebar>}>
```

**Step 3: Build and verify**

**Step 4: Commit**

```bash
git add src/
git commit -m "feat: add sidebar with bookmarks and quick access"
```

---

### Task 7: Context Menu + File Operations

**Files:**
- Create: `src/components/ContextMenu/ContextMenu.tsx`
- Create: `src/components/Dialogs/CreateDialog.tsx`
- Create: `src/components/Dialogs/DeleteDialog.tsx`
- Create: `src/components/Dialogs/RenameDialog.tsx`
- Modify: `src/components/FileBrowser/FileTable.tsx` — wire context menu

**Step 1: Create ContextMenu**

A PatternFly `Menu` that appears on right-click over the file table. Actions:
- Open / Edit (file only)
- New File / New Directory / New Symlink
- Cut / Copy / Paste
- Rename
- Delete
- Download (file) / Download as Archive (directory)
- Properties
- Bookmark This Folder (directory only)

Use absolute positioning based on mouse event coordinates.

**Step 2: Create CreateDialog**

PatternFly `Modal` with `TextInput` for name. Type selector (file/directory/symlink). For symlink, additional TextInput for target path.

Calls `fs.createFile()`, `fs.createDirectory()`, or `fs.createSymlink()`, then `refresh()`.

**Step 3: Create DeleteDialog**

Confirmation `Modal`. Shows file/folder name(s). Warning for non-empty directories. Calls `fs.deleteEntry()` then `refresh()`.

**Step 4: Create RenameDialog**

`Modal` with `TextInput` pre-filled with current name. Calls `fs.rename()` then `refresh()`.

**Step 5: Wire context menu into FileTable**

Add `onContextMenu` handler to table rows. Track menu position + target entry in local state. Close menu on click outside or Escape.

**Step 6: Implement Cut/Copy/Paste**

- Cut: `dispatch({ type: "SET_CLIPBOARD", entries, operation: "cut" })`
- Copy: `dispatch({ type: "SET_CLIPBOARD", entries, operation: "copy" })`
- Paste: if cut → `fs.moveEntry()`, if copy → `fs.copyEntry()`, then `refresh()` + `dispatch({ type: "CLEAR_CLIPBOARD" })`

**Step 7: Build and verify**

**Step 8: Commit**

```bash
git add src/
git commit -m "feat: add context menu and file operations (create, delete, rename, copy/paste)"
```

---

### Task 8: File Upload (Drag & Drop)

**Files:**
- Create: `src/components/Upload/UploadZone.tsx`
- Create: `src/components/Upload/upload.scss`
- Modify: `src/components/FileBrowser/FileBrowser.tsx` — wrap with upload zone

**Step 1: Create UploadZone**

A wrapper component that:
- Listens for `dragenter`, `dragover`, `dragleave`, `drop` events
- Shows visual overlay when dragging over
- On drop, reads files from `DataTransfer`
- Uploads each file via `cockpit.spawn(["cp", ...])` or writes via `cockpit.file().replace()`
- Shows PatternFly `Progress` bar during upload
- Handles multiple files, shows count + progress per file

For large files, use cockpit.spawn with `cat > target` piped from stdin:
```typescript
const proc = cockpit.spawn(["tee", destPath], { ...spawnOpts, binary: true });
proc.input(fileContent);
```

**Step 2: Also add Upload button in Toolbar**

Clicking the Upload button opens a file picker (`<input type="file">`) as an alternative to drag & drop.

**Step 3: Wire into FileBrowser**

Wrap the file list with `<UploadZone>` so dropping files anywhere in the main area triggers upload.

**Step 4: Commit**

```bash
git add src/
git commit -m "feat: add drag-and-drop file upload with progress"
```

---

### Task 9: File Editor (Monaco)

**Files:**
- Create: `src/components/FileEditor/FileEditor.tsx`
- Create: `src/components/FileEditor/file-editor.scss`
- Modify: `src/app.tsx` — show editor when editorFile is set

**Step 1: Create FileEditor**

A full-screen overlay or split-panel component:
- Uses `@patternfly/react-code-editor` (`CodeEditor` component)
- Loads file content via `fs.readFile(path)` when opened
- Auto-detects language from file extension (map extensions → Monaco language IDs)
- Save button calls `fs.writeFile(path, content)`
- Close button dispatches `CLOSE_EDITOR`
- Shows file path in header

```tsx
import { CodeEditor, Language } from "@patternfly/react-code-editor";
```

Language detection map:
```typescript
const LANG_MAP: Record<string, string> = {
    js: "javascript", ts: "typescript", jsx: "javascript", tsx: "typescript",
    py: "python", rb: "ruby", go: "go", rs: "rust",
    json: "json", yaml: "yaml", yml: "yaml",
    xml: "xml", html: "html", css: "css", scss: "scss",
    sh: "shell", bash: "shell", zsh: "shell",
    md: "markdown", sql: "sql", conf: "ini", ini: "ini",
};
```

**Step 2: Wire into app.tsx**

When `state.editorFile` is set, show `<FileEditor path={state.editorFile} />` as a full-page overlay above the file browser.

**Step 3: Commit**

```bash
git add src/
git commit -m "feat: add Monaco-based file editor with syntax highlighting"
```

---

### Task 10: Markdown Viewer + Mermaid

**Files:**
- Create: `src/components/MarkdownViewer/MarkdownViewer.tsx`
- Create: `src/components/MarkdownViewer/MermaidBlock.tsx`
- Create: `src/components/MarkdownViewer/markdown-viewer.scss`
- Modify: `src/components/FileEditor/FileEditor.tsx` — detect .md files and show split view

**Step 1: Create MermaidBlock**

A React component that renders a mermaid diagram from a code string:

```tsx
import React, { useEffect, useRef } from "react";
import mermaid from "mermaid";

mermaid.initialize({ startOnLoad: false, theme: "default" });

export const MermaidBlock = ({ code }: { code: string }) => {
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (ref.current) {
            const id = "mermaid-" + Math.random().toString(36).slice(2);
            mermaid.render(id, code).then(({ svg }) => {
                if (ref.current) ref.current.innerHTML = svg;
            }).catch(() => {
                if (ref.current) ref.current.textContent = code;
            });
        }
    }, [code]);
    return <div ref={ref} className="mermaid-block" />;
};
```

**Step 2: Create MarkdownViewer**

```tsx
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { MermaidBlock } from "./MermaidBlock";

export const MarkdownViewer = ({ content }: { content: string }) => {
    return (
        <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
                code({ className, children, ...props }) {
                    const lang = className?.replace("language-", "");
                    const code = String(children).replace(/\n$/, "");
                    if (lang === "mermaid") return <MermaidBlock code={code} />;
                    return <code className={className} {...props}>{children}</code>;
                }
            }}
        >
            {content}
        </ReactMarkdown>
    );
};
```

**Step 3: Modify FileEditor for Markdown split view**

When the file extension is `.md`, show a split-panel layout:
- Left: Monaco editor (full editing)
- Right: `<MarkdownViewer content={editorContent} />` (live preview)

Use PatternFly `Split`, `SplitItem` or CSS grid for the split layout.

**Step 4: Commit**

```bash
git add src/
git commit -m "feat: add Markdown preview with Mermaid diagram support"
```

---

### Task 11: Properties Panel + Permission Editor

**Files:**
- Create: `src/components/Properties/PropertiesPanel.tsx`
- Create: `src/components/Properties/PermissionEditor.tsx`
- Create: `src/components/Properties/properties.scss`
- Modify: `src/app.tsx` — show panel when propertiesFile is set

**Step 1: Create PermissionEditor**

A 3×3 grid of checkboxes (Read/Write/Execute × Owner/Group/Other) + octal text input.

- Reads current mode from `FileStats.modeOctal`
- Checkbox changes update octal value
- Octal input changes update checkboxes
- "Apply" button calls `fs.chmod(path, newMode)`

Use PatternFly `Checkbox`, `TextInput`, `Grid`, `GridItem`.

**Step 2: Create PropertiesPanel**

A slide-out `Drawer` or `Modal` showing:
- File name, full path, type, size, timestamps
- Owner/Group with editable `TextInput` + Apply button → `fs.chown()`
- `PermissionEditor` component
- Link target (for symlinks)

Use PatternFly `DescriptionList` for the info display.

**Step 3: Wire into app.tsx**

When `state.propertiesFile` is set, render `<PropertiesPanel path={state.propertiesFile} />` as a drawer panel.

**Step 4: Commit**

```bash
git add src/
git commit -m "feat: add properties panel with visual permission editor"
```

---

### Task 12: Search

**Files:**
- Create: `src/components/Search/SearchPanel.tsx`
- Create: `src/components/Search/search.scss`
- Modify: `src/components/Toolbar/Toolbar.tsx` — add search input

**Step 1: Create SearchPanel**

Two search modes:
1. **Filename search**: uses `fs.searchFiles(dir, pattern)` (find command)
2. **Content search**: uses `fs.grepSearch(dir, pattern)` (grep command)

Results displayed in a PatternFly `DataList` or `Table` with:
- File path (clickable → navigates to containing directory and selects file)
- File type icon

Mode toggle: "Filename" / "Content" tabs.

Include a `SearchInput` component from PatternFly in the toolbar. When user types and hits Enter, the SearchPanel opens below the toolbar showing results.

**Step 2: Wire search into Toolbar**

Add `SearchInput` to the toolbar's right side. On search submit, open SearchPanel as a slide-down panel or replace the file list temporarily.

**Step 3: Commit**

```bash
git add src/
git commit -m "feat: add filename and content search"
```

---

### Task 13: Grid View

**Files:**
- Create: `src/components/FileBrowser/FileGrid.tsx`
- Create: `src/components/FileBrowser/file-grid.scss`
- Modify: `src/components/FileBrowser/FileBrowser.tsx` — toggle between table/grid

**Step 1: Create FileGrid**

A card-based grid layout where each file/directory is rendered as:
- Large icon (based on file type)
- File name below
- Click to select, double-click to open
- Right-click for context menu

Use CSS Grid layout. Each card is a simple div with icon + name.

PatternFly `Gallery`, `GalleryItem` or custom CSS grid.

**Step 2: Wire view toggle**

In FileBrowser, render `<FileTable>` when `viewMode === "table"`, `<FileGrid>` when `viewMode === "grid"`.

The toggle in Toolbar already dispatches `SET_VIEW_MODE`.

**Step 3: Commit**

```bash
git add src/
git commit -m "feat: add grid view for file browser"
```

---

### Task 14: Download as Archive

**Files:**
- Modify: `src/api/cockpit-fs.ts` — already has `downloadArchive()`
- Modify: `src/components/ContextMenu/ContextMenu.tsx` — wire download actions

**Step 1: Wire single file download**

For files: create a cockpit channel to read binary content, create Blob, trigger download via invisible `<a>` tag.

```typescript
export async function downloadFile(path: string): Promise<void> {
    const name = path.split("/").pop() || "file";
    const result = await cockpit.file(path, { superuser: "try", binary: true }).read();
    const blob = new Blob([result], { type: "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
}
```

**Step 2: Wire context menu**

- "Download" on files → `downloadFile(path)`
- "Download as Archive" on directories → `downloadArchive(path)`

**Step 3: Commit**

```bash
git add src/
git commit -m "feat: add file and folder download support"
```

---

### Task 15: i18n — POT Generation + zh_CN Translation

**Files:**
- Create: `po/POTFILES`
- Create: `po/zh_CN.po`
- Modify: `Makefile` — add pot target

**Step 1: Create POTFILES**

List all source files containing translatable strings:

```
src/app.tsx
src/components/Toolbar/Toolbar.tsx
src/components/Toolbar/PathBar.tsx
src/components/FileBrowser/FileTable.tsx
src/components/FileBrowser/FileGrid.tsx
src/components/Sidebar/Sidebar.tsx
src/components/ContextMenu/ContextMenu.tsx
src/components/Dialogs/CreateDialog.tsx
src/components/Dialogs/DeleteDialog.tsx
src/components/Dialogs/RenameDialog.tsx
src/components/FileEditor/FileEditor.tsx
src/components/Properties/PropertiesPanel.tsx
src/components/Properties/PermissionEditor.tsx
src/components/Search/SearchPanel.tsx
src/components/Upload/UploadZone.tsx
```

**Step 2: Generate POT file**

Run:
```bash
make pot
```

This uses xgettext to extract all `_("...")` and `cockpit.gettext("...")` strings into `po/cockpit-filebrowser.pot`.

**Step 3: Create zh_CN.po**

Initialize from POT:
```bash
msginit --input=po/cockpit-filebrowser.pot --output=po/zh_CN.po --locale=zh_CN.UTF-8
```

Then translate all strings to Chinese. Key translations:
- "File Browser" → "文件浏览器"
- "Name" → "名称", "Size" → "大小", "Modified" → "修改时间"
- "New File" → "新建文件", "New Directory" → "新建目录"
- "Delete" → "删除", "Rename" → "重命名", "Copy" → "复制", "Cut" → "剪切", "Paste" → "粘贴"
- "Upload" → "上传", "Download" → "下载"
- "Properties" → "属性", "Permissions" → "权限"
- "Search" → "搜索", "Bookmarks" → "收藏夹"
- "Owner" → "所有者", "Group" → "群组"
- "Read" → "读取", "Write" → "写入", "Execute" → "执行"
- "Save" → "保存", "Cancel" → "取消", "OK" → "确定"
- (and all other UI strings)

**Step 4: Build and verify translations load**

Run `npm run build` and check that `dist/po.zh_CN.js` is generated.

**Step 5: Commit**

```bash
git add po/ Makefile
git commit -m "feat(i18n): add translation infrastructure and zh_CN translation"
```

---

### Task 16: Packaging (deb)

**Files:**
- Create: `packaging/debian/control`
- Create: `packaging/debian/rules`
- Create: `packaging/debian/changelog`
- Create: `packaging/debian/copyright`
- Create: `packaging/debian/source/format`
- Modify: `Makefile` — ensure install target works for deb

**Step 1: Create debian packaging files**

`packaging/debian/control`:
```
Source: cockpit-filebrowser
Section: admin
Priority: optional
Maintainer: Your Name <you@example.com>
Build-Depends: debhelper-compat (= 12), nodejs, npm, gettext, make
Standards-Version: 4.5.0

Package: cockpit-filebrowser
Architecture: all
Depends: cockpit
Description: A modern file browser for Cockpit
 cockpit-filebrowser provides a full-featured file browser for the
 Cockpit web console, featuring file management, code editing,
 Markdown preview, permission management, and search.
```

`packaging/debian/rules`:
```makefile
#!/usr/bin/make -f
export NAV_VERS := $(shell dpkg-parsechangelog | egrep '^Version:' | cut -f 2 -d ' ')
%:
	dh $@
override_dh_auto_build:
	npm ci
	NODE_ENV=production ./build.js
override_dh_auto_install:
	mkdir -p $(DESTDIR)/usr/share/cockpit/filebrowser
	cp -r dist/* $(DESTDIR)/usr/share/cockpit/filebrowser/
```

**Step 2: Create a quick-build deb script**

For local testing (macOS with dpkg-deb):
```bash
#!/bin/bash
npm ci && NODE_ENV=production ./build.js
mkdir -p /tmp/cockpit-filebrowser-deb/DEBIAN
mkdir -p /tmp/cockpit-filebrowser-deb/usr/share/cockpit/filebrowser
cp -r dist/* /tmp/cockpit-filebrowser-deb/usr/share/cockpit/filebrowser/
cat > /tmp/cockpit-filebrowser-deb/DEBIAN/control << EOF
Package: cockpit-filebrowser
Version: 0.1.0
Architecture: all
Depends: cockpit
Maintainer: dev
Description: Modern file browser for Cockpit
EOF
dpkg-deb --build --root-owner-group /tmp/cockpit-filebrowser-deb cockpit-filebrowser_0.1.0_all.deb
```

**Step 3: Commit**

```bash
git add packaging/ Makefile
git commit -m "feat: add deb packaging support"
```

---

### Task 17: Final Polish + README

**Files:**
- Create: `README.md`
- Create: `LICENSE`
- Review all components for i18n coverage
- Verify build produces complete dist/

**Step 1: Create LICENSE (LGPL-2.1)**

**Step 2: Create README.md**

Brief README with: project description, screenshot placeholder, installation instructions (deb/manual), development setup, building, i18n contribution guide.

**Step 3: Full build verification**

```bash
rm -rf dist/ node_modules/
npm ci
npm run build
ls dist/
```

Expected: `index.html index.js index.css manifest.json po.js po.zh_CN.js`

**Step 4: Final commit**

```bash
git add -A
git commit -m "docs: add README and LICENSE"
```

---

## Dependency Graph

```
Task 1 (Scaffold)
  ├── Task 2 (API Layer)
  │     └── Task 3 (State Management)
  │           ├── Task 4 (Layout + Toolbar)
  │           │     ├── Task 5 (Table View)
  │           │     │     ├── Task 7 (Context Menu + Ops)
  │           │     │     │     ├── Task 8 (Upload)
  │           │     │     │     └── Task 14 (Download)
  │           │     │     └── Task 13 (Grid View)
  │           │     └── Task 12 (Search)
  │           ├── Task 6 (Sidebar)
  │           ├── Task 9 (File Editor)
  │           │     └── Task 10 (Markdown + Mermaid)
  │           └── Task 11 (Properties + Permissions)
  └── Task 15 (i18n) — can run after all UI tasks
        └── Task 16 (Packaging)
              └── Task 17 (Polish)
```

Tasks 5–14 can be partially parallelized once Tasks 1–4 are complete.
