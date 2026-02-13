import React, { createContext, useContext, useReducer, useCallback, useEffect, useRef } from 'react';
import cockpit from 'cockpit';
import { fileBrowserReducer, initialState } from './reducer';
import { FileBrowserState, Action, Bookmark } from './actions';
import { listDirectory } from '../api/cockpit-fs';

interface FileBrowserContextType {
    state: FileBrowserState;
    dispatch: React.Dispatch<Action>;
    navigate: (path: string) => void;
    refresh: () => void;
}

const FileBrowserContext = createContext<FileBrowserContextType | null>(null);

const BOOKMARKS_PATH = '~/.config/cockpit-filebrowser/bookmarks.json';

export const FileBrowserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [state, dispatch] = useReducer(fileBrowserReducer, initialState);
    const mountedRef = useRef(true);

    // Navigate to a directory
    const navigate = useCallback((path: string) => {
        dispatch({ type: 'SET_PATH', path });
    }, []);

    // Refresh the current directory listing
    const refresh = useCallback(() => {
        const currentPath = state.currentPath;
        const showHidden = state.showHidden;

        dispatch({ type: 'SET_LOADING', loading: true });

        listDirectory(currentPath, showHidden)
            .then(entries => {
                if (mountedRef.current) {
                    dispatch({ type: 'SET_ENTRIES', entries });
                    dispatch({ type: 'SET_LOADING', loading: false });
                }
            })
            .catch(err => {
                if (mountedRef.current) {
                    dispatch({
                        type: 'SET_ERROR',
                        error: err?.message || String(err),
                    });
                }
            });
    }, [state.currentPath, state.showHidden]);

    // Auto-load directory when path or showHidden changes
    useEffect(() => {
        dispatch({ type: 'SET_LOADING', loading: true });

        listDirectory(state.currentPath, state.showHidden)
            .then(entries => {
                if (mountedRef.current) {
                    dispatch({ type: 'SET_ENTRIES', entries });
                    dispatch({ type: 'SET_LOADING', loading: false });
                }
            })
            .catch(err => {
                if (mountedRef.current) {
                    dispatch({
                        type: 'SET_ERROR',
                        error: err?.message || String(err),
                    });
                }
            });
    }, [state.currentPath, state.showHidden]);

    // Set initial path to user's home directory
    useEffect(() => {
        try {
            const info = cockpit.info as any;
            if (info && info.home) {
                dispatch({ type: 'SET_PATH', path: info.home });
            }
        } catch {
            // If cockpit.info is not available, stay at /
        }
    }, []);

    // Load bookmarks on mount
    useEffect(() => {
        const handle = cockpit.file(BOOKMARKS_PATH, { superuser: "try" as const });
        handle.read()
            .then((content: string) => {
                if (content && mountedRef.current) {
                    try {
                        const bookmarks: Bookmark[] = JSON.parse(content);
                        dispatch({ type: 'SET_BOOKMARKS', bookmarks });
                    } catch {
                        // Invalid JSON, ignore
                    }
                }
            })
            .catch(() => {
                // File doesn't exist yet, that's fine
            })
            .finally(() => {
                handle.close();
            });
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            mountedRef.current = false;
        };
    }, []);

    const contextValue: FileBrowserContextType = {
        state,
        dispatch,
        navigate,
        refresh,
    };

    return (
        <FileBrowserContext.Provider value={contextValue}>
            {children}
        </FileBrowserContext.Provider>
    );
};

/**
 * Hook to access the file browser context.
 * Must be used within a FileBrowserProvider.
 */
export function useFileBrowser(): FileBrowserContextType {
    const context = useContext(FileBrowserContext);
    if (!context) {
        throw new Error('useFileBrowser must be used within a FileBrowserProvider');
    }
    return context;
}
