import React, { useState, useCallback, useRef } from 'react';
import cockpit from 'cockpit';
import { SearchInput } from "@patternfly/react-core/dist/esm/components/SearchInput/index.js";
import { ToggleGroup, ToggleGroupItem } from "@patternfly/react-core/dist/esm/components/ToggleGroup/index.js";
import { Button } from "@patternfly/react-core/dist/esm/components/Button/index.js";
import { Spinner } from "@patternfly/react-core/dist/esm/components/Spinner/index.js";
import {
    EmptyState,
    EmptyStateBody,
} from "@patternfly/react-core/dist/esm/components/EmptyState/index.js";
import { TimesIcon } from "@patternfly/react-icons/dist/esm/icons/times-icon.js";
import { SearchIcon } from "@patternfly/react-icons/dist/esm/icons/search-icon.js";
import { useFileBrowser } from '../../store/FileBrowserContext';
import { FileIcon } from '../FileBrowser/FileIcon';
import * as fs from '../../api/cockpit-fs';
import './search.scss';

const _ = cockpit.gettext;

type SearchMode = 'filename' | 'content';

interface SearchResult {
    path: string;
    name: string;
    type: 'file' | 'directory' | 'unknown';
}

export interface SearchPanelProps {
    initialQuery: string;
    onClose: () => void;
}

export const SearchPanel: React.FC<SearchPanelProps> = ({ initialQuery, onClose }) => {
    const { navigate, dispatch } = useFileBrowser();
    const { state } = useFileBrowser();

    const [mode, setMode] = useState<SearchMode>('filename');
    const [query, setQuery] = useState(initialQuery);
    const [results, setResults] = useState<SearchResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);
    const searchRef = useRef<number>(0);

    const performSearch = useCallback(async (searchQuery: string) => {
        if (!searchQuery.trim()) return;

        const searchId = ++searchRef.current;
        setLoading(true);
        setSearched(true);
        setResults([]);

        try {
            let paths: string[];
            if (mode === 'filename') {
                paths = await fs.searchFiles(state.currentPath, searchQuery.trim());
            } else {
                paths = await fs.grepSearch(state.currentPath, searchQuery.trim());
            }

            // Only update if this is still the most recent search
            if (searchId !== searchRef.current) return;

            const searchResults: SearchResult[] = paths.slice(0, 200).map(p => {
                const name = p.split('/').pop() || p;
                // Determine type from path ending
                const type: SearchResult['type'] = p.endsWith('/') ? 'directory' : 'file';
                return { path: p.replace(/\/$/, ''), name, type };
            });

            setResults(searchResults);
        } catch (err: any) {
            console.error('Search error:', err);
            if (searchId === searchRef.current) {
                setResults([]);
            }
        } finally {
            if (searchId === searchRef.current) {
                setLoading(false);
            }
        }
    }, [mode, state.currentPath]);

    const handleSearch = useCallback(() => {
        performSearch(query);
    }, [query, performSearch]);

    const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
        if (event.key === 'Enter') {
            performSearch(query);
        }
    }, [query, performSearch]);

    const handleResultClick = useCallback((result: SearchResult) => {
        // Navigate to the containing directory
        const parts = result.path.split('/');
        parts.pop();
        const dir = parts.join('/') || '/';
        navigate(dir);

        // Select the file after navigation
        dispatch({ type: 'CLEAR_SELECTION' });
        dispatch({ type: 'SELECT_ENTRY', path: result.path, multi: false });
    }, [navigate, dispatch]);

    const handleModeChange = useCallback((newMode: SearchMode) => {
        setMode(newMode);
    }, []);

    return (
        <div className="search-panel">
            <div className="search-panel__header">
                <div className="search-panel__controls">
                    <ToggleGroup aria-label={_("Search mode")}>
                        <ToggleGroupItem
                            text={_("Filename")}
                            isSelected={mode === 'filename'}
                            onChange={() => handleModeChange('filename')}
                        />
                        <ToggleGroupItem
                            text={_("Content")}
                            isSelected={mode === 'content'}
                            onChange={() => handleModeChange('content')}
                        />
                    </ToggleGroup>

                    <div className="search-panel__input">
                        <SearchInput
                            placeholder={mode === 'filename' ? _("Search by filename...") : _("Search file contents...")}
                            value={query}
                            onChange={(_event, value) => setQuery(value)}
                            onSearch={handleSearch}
                            onKeyDown={handleKeyDown}
                            onClear={() => { setQuery(''); setResults([]); setSearched(false); }}
                            aria-label={_("Search")}
                        />
                    </div>
                </div>

                <Button
                    variant="plain"
                    onClick={onClose}
                    aria-label={_("Close search")}
                    className="search-panel__close"
                >
                    <TimesIcon />
                </Button>
            </div>

            <div className="search-panel__results">
                {loading && (
                    <div className="search-panel__loading">
                        <Spinner size="md" aria-label={_("Searching")} />
                        <span>{_("Searching...")}</span>
                    </div>
                )}

                {!loading && searched && results.length === 0 && (
                    <EmptyState
                        titleText={_("No results found")}
                        headingLevel="h4"
                        icon={SearchIcon}
                        variant="sm"
                    >
                        <EmptyStateBody>
                            {_("No files matched your search query.")}
                        </EmptyStateBody>
                    </EmptyState>
                )}

                {!loading && results.length > 0 && (
                    <div className="search-panel__list">
                        <div className="search-panel__count">
                            {results.length >= 200
                                ? _("Showing first 200 results")
                                : cockpit.format(_("$0 results"), results.length.toString())
                            }
                        </div>
                        {results.map((result, index) => (
                            <div
                                key={`${result.path}-${index}`}
                                className="search-panel__result"
                                onClick={() => handleResultClick(result)}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        handleResultClick(result);
                                    }
                                }}
                            >
                                <FileIcon
                                    type={result.type}
                                    name={result.name}
                                    className="search-panel__result-icon"
                                />
                                <span className="search-panel__result-path" title={result.path}>
                                    {result.path}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
