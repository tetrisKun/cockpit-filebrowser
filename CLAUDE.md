# cockpit-filebrowser

## Project Overview
A modern file browser plugin for the Cockpit web console, built with React + PatternFly v6.

## Tech Stack
- React 18 + TypeScript
- PatternFly v6 (UI components)
- Monaco Editor (code editing)
- esbuild (bundling)
- Cockpit APIs (cockpit.spawn, cockpit.file, cockpit.gettext)

## Build
```
npm install
npm run build        # Production build to dist/
npm run watch        # Development watch mode
```

## Install for Development
```
make devel-install   # Symlink dist/ to ~/.local/share/cockpit/filebrowser
```

## i18n
- All strings use cockpit.gettext (_())
- Generate POT: make pot
- Translations in po/*.po
- PO files compiled to dist/po.*.js during build

## Project Structure
- src/api/ — Cockpit filesystem API wrapper
- src/store/ — React Context + useReducer state management
- src/components/ — All React UI components
- po/ — Translation files
- dist/ — Build output (not committed)
