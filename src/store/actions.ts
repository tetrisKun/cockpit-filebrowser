import { FileEntry } from '../api/types';

export type SortField = 'name' | 'size' | 'modified' | 'owner' | 'type';
export type SortDirection = 'asc' | 'desc';
export type ViewMode = 'table' | 'grid';

export interface ClipboardData {
    entries: FileEntry[];
    operation: 'copy' | 'cut';
}

export interface Bookmark {
    name: string;
    path: string;
}

export interface FileBrowserState {
    currentPath: string;
    entries: FileEntry[];
    loading: boolean;
    error: string | null;

    // Selection
    selectedEntries: Set<string>;

    // View
    viewMode: ViewMode;
    showHidden: boolean;
    sortField: SortField;
    sortDirection: SortDirection;

    // Clipboard
    clipboard: ClipboardData | null;

    // Bookmarks
    bookmarks: Bookmark[];

    // Navigation history
    history: string[];
    historyIndex: number;

    // Editor
    editorOpen: boolean;
    editorFile: string | null;

    // Properties panel
    propertiesOpen: boolean;
    propertiesFile: string | null;
}

export type Action =
    | { type: 'SET_PATH'; path: string }
    | { type: 'SET_ENTRIES'; entries: FileEntry[] }
    | { type: 'SET_LOADING'; loading: boolean }
    | { type: 'SET_ERROR'; error: string | null }
    | { type: 'SELECT_ENTRY'; path: string; multi: boolean }
    | { type: 'SELECT_ALL' }
    | { type: 'CLEAR_SELECTION' }
    | { type: 'SET_VIEW_MODE'; mode: ViewMode }
    | { type: 'SET_CLIPBOARD'; clipboard: ClipboardData }
    | { type: 'CLEAR_CLIPBOARD' }
    | { type: 'ADD_BOOKMARK'; bookmark: Bookmark }
    | { type: 'REMOVE_BOOKMARK'; path: string }
    | { type: 'SET_BOOKMARKS'; bookmarks: Bookmark[] }
    | { type: 'TOGGLE_HIDDEN' }
    | { type: 'SET_SORT'; field: SortField; direction: SortDirection }
    | { type: 'OPEN_EDITOR'; path: string }
    | { type: 'CLOSE_EDITOR' }
    | { type: 'OPEN_PROPERTIES'; path: string }
    | { type: 'CLOSE_PROPERTIES' }
    | { type: 'NAVIGATE_BACK' }
    | { type: 'NAVIGATE_FORWARD' };
