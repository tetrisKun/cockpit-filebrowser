import { FileBrowserState, Action } from './actions';

export const initialState: FileBrowserState = {
    currentPath: '/',
    entries: [],
    loading: false,
    error: null,

    selectedEntries: new Set<string>(),

    viewMode: 'table',
    showHidden: false,
    sortField: 'name',
    sortDirection: 'asc',

    clipboard: null,

    bookmarks: [],

    history: ['/'],
    historyIndex: 0,

    editorOpen: false,
    editorFile: null,

    propertiesOpen: false,
    propertiesFile: null,
};

export function fileBrowserReducer(state: FileBrowserState, action: Action): FileBrowserState {
    switch (action.type) {
        case 'SET_PATH': {
            // Push to history (truncate any forward history)
            const newHistory = state.history.slice(0, state.historyIndex + 1);
            newHistory.push(action.path);

            return {
                ...state,
                currentPath: action.path,
                selectedEntries: new Set(),
                history: newHistory,
                historyIndex: newHistory.length - 1,
                error: null,
            };
        }

        case 'SET_ENTRIES':
            return {
                ...state,
                entries: action.entries,
            };

        case 'SET_LOADING':
            return {
                ...state,
                loading: action.loading,
            };

        case 'SET_ERROR':
            return {
                ...state,
                error: action.error,
                loading: false,
            };

        case 'SELECT_ENTRY': {
            const newSelection = new Set(action.multi ? state.selectedEntries : []);
            if (newSelection.has(action.path)) {
                newSelection.delete(action.path);
            } else {
                newSelection.add(action.path);
            }
            return {
                ...state,
                selectedEntries: newSelection,
            };
        }

        case 'SELECT_ALL': {
            const allPaths = new Set(state.entries.map(e => e.path));
            return {
                ...state,
                selectedEntries: allPaths,
            };
        }

        case 'CLEAR_SELECTION':
            return {
                ...state,
                selectedEntries: new Set(),
            };

        case 'SET_VIEW_MODE':
            return {
                ...state,
                viewMode: action.mode,
            };

        case 'SET_CLIPBOARD':
            return {
                ...state,
                clipboard: action.clipboard,
            };

        case 'CLEAR_CLIPBOARD':
            return {
                ...state,
                clipboard: null,
            };

        case 'ADD_BOOKMARK': {
            // Avoid duplicate bookmarks
            if (state.bookmarks.some(b => b.path === action.bookmark.path)) {
                return state;
            }
            return {
                ...state,
                bookmarks: [...state.bookmarks, action.bookmark],
            };
        }

        case 'REMOVE_BOOKMARK':
            return {
                ...state,
                bookmarks: state.bookmarks.filter(b => b.path !== action.path),
            };

        case 'SET_BOOKMARKS':
            return {
                ...state,
                bookmarks: action.bookmarks,
            };

        case 'TOGGLE_HIDDEN':
            return {
                ...state,
                showHidden: !state.showHidden,
            };

        case 'SET_SORT':
            return {
                ...state,
                sortField: action.field,
                sortDirection: action.direction,
            };

        case 'OPEN_EDITOR':
            return {
                ...state,
                editorOpen: true,
                editorFile: action.path,
            };

        case 'CLOSE_EDITOR':
            return {
                ...state,
                editorOpen: false,
                editorFile: null,
            };

        case 'OPEN_PROPERTIES':
            return {
                ...state,
                propertiesOpen: true,
                propertiesFile: action.path,
            };

        case 'CLOSE_PROPERTIES':
            return {
                ...state,
                propertiesOpen: false,
                propertiesFile: null,
            };

        case 'NAVIGATE_BACK': {
            if (state.historyIndex <= 0) return state;
            const newIndex = state.historyIndex - 1;
            return {
                ...state,
                currentPath: state.history[newIndex],
                historyIndex: newIndex,
                selectedEntries: new Set(),
                error: null,
            };
        }

        case 'NAVIGATE_FORWARD': {
            if (state.historyIndex >= state.history.length - 1) return state;
            const newIndex = state.historyIndex + 1;
            return {
                ...state,
                currentPath: state.history[newIndex],
                historyIndex: newIndex,
                selectedEntries: new Set(),
                error: null,
            };
        }

        default:
            return state;
    }
}
