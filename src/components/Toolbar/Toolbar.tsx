import React, { useCallback, useRef, useState } from 'react';
import cockpit from 'cockpit';
import {
    Toolbar as PFToolbar,
    ToolbarContent,
    ToolbarGroup,
    ToolbarItem,
} from "@patternfly/react-core/dist/esm/components/Toolbar/index.js";
import { Button } from "@patternfly/react-core/dist/esm/components/Button/index.js";
import { Checkbox } from "@patternfly/react-core/dist/esm/components/Checkbox/index.js";
import { ToggleGroup, ToggleGroupItem } from "@patternfly/react-core/dist/esm/components/ToggleGroup/index.js";
import { SearchInput } from "@patternfly/react-core/dist/esm/components/SearchInput/index.js";
import { ArrowLeftIcon } from "@patternfly/react-icons/dist/esm/icons/arrow-left-icon.js";
import { ArrowRightIcon } from "@patternfly/react-icons/dist/esm/icons/arrow-right-icon.js";
import { ArrowUpIcon } from "@patternfly/react-icons/dist/esm/icons/arrow-up-icon.js";
import { SyncAltIcon } from "@patternfly/react-icons/dist/esm/icons/sync-alt-icon.js";
import { ListIcon } from "@patternfly/react-icons/dist/esm/icons/list-icon.js";
import { ThLargeIcon } from "@patternfly/react-icons/dist/esm/icons/th-large-icon.js";
import { PlusIcon } from "@patternfly/react-icons/dist/esm/icons/plus-icon.js";
import { FolderOpenIcon } from "@patternfly/react-icons/dist/esm/icons/folder-open-icon.js";
import { UploadIcon } from "@patternfly/react-icons/dist/esm/icons/upload-icon.js";
import { DownloadIcon } from "@patternfly/react-icons/dist/esm/icons/download-icon.js";
import { useFileBrowser } from '../../store/FileBrowserContext';
import { PathBar } from './PathBar';
import { uploadFiles } from '../Upload/UploadZone';
import * as fs from '../../api/cockpit-fs';

const _ = cockpit.gettext;

export interface ToolbarProps {
    onSearch?: (query: string) => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({ onSearch }) => {
    const { state, dispatch, navigate, refresh } = useFileBrowser();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploadingFromButton, setUploadingFromButton] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [downloading, setDownloading] = useState(false);

    const handleBack = useCallback(() => {
        dispatch({ type: 'NAVIGATE_BACK' });
    }, [dispatch]);

    const handleForward = useCallback(() => {
        dispatch({ type: 'NAVIGATE_FORWARD' });
    }, [dispatch]);

    const handleUp = useCallback(() => {
        const parts = state.currentPath.split('/').filter(Boolean);
        if (parts.length > 0) {
            parts.pop();
            const parentPath = '/' + parts.join('/');
            navigate(parentPath || '/');
        }
    }, [state.currentPath, navigate]);

    const handleRefresh = useCallback(() => {
        refresh();
    }, [refresh]);

    const handleViewModeChange = useCallback((mode: 'table' | 'grid') => {
        dispatch({ type: 'SET_VIEW_MODE', mode });
    }, [dispatch]);

    const handleToggleHidden = useCallback((_event: React.FormEvent<HTMLInputElement>, checked: boolean) => {
        dispatch({ type: 'TOGGLE_HIDDEN' });
    }, [dispatch]);

    const handleNewFile = useCallback(() => {
        // Placeholder for new file dialog
    }, []);

    const handleNewDir = useCallback(() => {
        // Placeholder for new directory dialog
    }, []);

    const handleUpload = useCallback(() => {
        fileInputRef.current?.click();
    }, []);

    const handleFileInputChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setUploadingFromButton(true);
        try {
            await uploadFiles(files, state.currentPath);
            refresh();
        } catch (err: any) {
            console.error('Upload error:', err);
        } finally {
            setUploadingFromButton(false);
            // Reset input so re-selecting the same file triggers onChange
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    }, [state.currentPath, refresh]);

    const handleSearchSubmit = useCallback(() => {
        if (searchQuery.trim() && onSearch) {
            onSearch(searchQuery.trim());
        }
    }, [searchQuery, onSearch]);

    const handleSearchKeyDown = useCallback((event: React.KeyboardEvent) => {
        if (event.key === 'Enter' && searchQuery.trim() && onSearch) {
            onSearch(searchQuery.trim());
        }
    }, [searchQuery, onSearch]);

    const handleDownload = useCallback(async () => {
        const selectedPaths = Array.from(state.selectedEntries);
        if (selectedPaths.length === 0) return;

        setDownloading(true);
        try {
            if (selectedPaths.length === 1) {
                // Single selection: find the entry to determine type
                const entry = state.entries.find(e => e.path === selectedPaths[0]);
                if (entry) {
                    if (entry.type === 'directory') {
                        await fs.downloadArchive(entry.path);
                    } else {
                        await fs.downloadFile(entry.path);
                    }
                }
            } else {
                // Multiple selection: download each as archive
                for (const path of selectedPaths) {
                    const entry = state.entries.find(e => e.path === path);
                    if (entry) {
                        if (entry.type === 'directory') {
                            await fs.downloadArchive(entry.path);
                        } else {
                            await fs.downloadFile(entry.path);
                        }
                    }
                }
            }
        } catch (err: any) {
            console.error('Download error:', err);
        } finally {
            setDownloading(false);
        }
    }, [state.selectedEntries, state.entries]);

    const canGoBack = state.historyIndex > 0;
    const canGoForward = state.historyIndex < state.history.length - 1;
    const canGoUp = state.currentPath !== '/';
    const hasSelection = state.selectedEntries.size > 0;

    return (
        <PFToolbar>
            <input
                type="file"
                multiple
                ref={fileInputRef}
                style={{ display: 'none' }}
                onChange={handleFileInputChange}
            />
            <ToolbarContent>
                {/* Navigation buttons */}
                <ToolbarGroup>
                    <ToolbarItem>
                        <Button
                            variant="plain"
                            onClick={handleBack}
                            isDisabled={!canGoBack}
                            aria-label={_("Go back")}
                            size="sm"
                        >
                            <ArrowLeftIcon />
                        </Button>
                    </ToolbarItem>
                    <ToolbarItem>
                        <Button
                            variant="plain"
                            onClick={handleForward}
                            isDisabled={!canGoForward}
                            aria-label={_("Go forward")}
                            size="sm"
                        >
                            <ArrowRightIcon />
                        </Button>
                    </ToolbarItem>
                    <ToolbarItem>
                        <Button
                            variant="plain"
                            onClick={handleUp}
                            isDisabled={!canGoUp}
                            aria-label={_("Go up")}
                            size="sm"
                        >
                            <ArrowUpIcon />
                        </Button>
                    </ToolbarItem>
                    <ToolbarItem>
                        <Button
                            variant="plain"
                            onClick={handleRefresh}
                            aria-label={_("Refresh")}
                            size="sm"
                        >
                            <SyncAltIcon />
                        </Button>
                    </ToolbarItem>
                </ToolbarGroup>

                {/* Path bar */}
                <ToolbarItem style={{ flex: 1 }}>
                    <PathBar />
                </ToolbarItem>

                {/* View mode toggle */}
                <ToolbarGroup>
                    <ToolbarItem>
                        <ToggleGroup aria-label={_("View mode")}>
                            <ToggleGroupItem
                                icon={<ListIcon />}
                                aria-label={_("Table view")}
                                isSelected={state.viewMode === 'table'}
                                onChange={() => handleViewModeChange('table')}
                            />
                            <ToggleGroupItem
                                icon={<ThLargeIcon />}
                                aria-label={_("Grid view")}
                                isSelected={state.viewMode === 'grid'}
                                onChange={() => handleViewModeChange('grid')}
                            />
                        </ToggleGroup>
                    </ToolbarItem>
                </ToolbarGroup>

                {/* Hidden files toggle */}
                <ToolbarGroup>
                    <ToolbarItem>
                        <Checkbox
                            label={_("Show hidden files")}
                            id="show-hidden-files"
                            isChecked={state.showHidden}
                            onChange={handleToggleHidden}
                        />
                    </ToolbarItem>
                </ToolbarGroup>

                {/* Action buttons */}
                <ToolbarGroup>
                    <ToolbarItem>
                        <Button
                            variant="secondary"
                            icon={<PlusIcon />}
                            onClick={handleNewFile}
                            size="sm"
                        >
                            {_("New File")}
                        </Button>
                    </ToolbarItem>
                    <ToolbarItem>
                        <Button
                            variant="secondary"
                            icon={<FolderOpenIcon />}
                            onClick={handleNewDir}
                            size="sm"
                        >
                            {_("New Folder")}
                        </Button>
                    </ToolbarItem>
                    <ToolbarItem>
                        <Button
                            variant="secondary"
                            icon={<UploadIcon />}
                            onClick={handleUpload}
                            isDisabled={uploadingFromButton}
                            isLoading={uploadingFromButton}
                            size="sm"
                        >
                            {uploadingFromButton ? _("Uploading...") : _("Upload")}
                        </Button>
                    </ToolbarItem>
                    <ToolbarItem>
                        <Button
                            variant="secondary"
                            icon={<DownloadIcon />}
                            onClick={handleDownload}
                            isDisabled={!hasSelection || downloading}
                            isLoading={downloading}
                            size="sm"
                        >
                            {downloading ? _("Downloading...") : _("Download")}
                        </Button>
                    </ToolbarItem>
                </ToolbarGroup>

                {/* Search */}
                <ToolbarGroup align={{ default: 'alignEnd' }}>
                    <ToolbarItem>
                        <SearchInput
                            placeholder={_("Search files...")}
                            value={searchQuery}
                            onChange={(_event, value) => setSearchQuery(value)}
                            onSearch={handleSearchSubmit}
                            onKeyDown={handleSearchKeyDown}
                            onClear={() => setSearchQuery('')}
                            aria-label={_("Search files")}
                            style={{ maxWidth: '220px' }}
                        />
                    </ToolbarItem>
                </ToolbarGroup>
            </ToolbarContent>
        </PFToolbar>
    );
};
