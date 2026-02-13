import React, { useCallback, useRef, useState } from 'react';
import cockpit from 'cockpit';
import {
    Toolbar as PFToolbar,
    ToolbarContent,
    ToolbarGroup,
    ToolbarItem,
} from "@patternfly/react-core/dist/esm/components/Toolbar/index.js";
import { Button } from "@patternfly/react-core/dist/esm/components/Button/index.js";
import { Tooltip } from "@patternfly/react-core/dist/esm/components/Tooltip/index.js";
import { ToggleGroup, ToggleGroupItem } from "@patternfly/react-core/dist/esm/components/ToggleGroup/index.js";
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
import { CutIcon } from "@patternfly/react-icons/dist/esm/icons/cut-icon.js";
import { CopyIcon } from "@patternfly/react-icons/dist/esm/icons/copy-icon.js";
import { PasteIcon } from "@patternfly/react-icons/dist/esm/icons/paste-icon.js";
import { SearchIcon } from "@patternfly/react-icons/dist/esm/icons/search-icon.js";
import { EyeIcon } from "@patternfly/react-icons/dist/esm/icons/eye-icon.js";
import { EyeSlashIcon } from "@patternfly/react-icons/dist/esm/icons/eye-slash-icon.js";
import { BarsIcon } from "@patternfly/react-icons/dist/esm/icons/bars-icon.js";
import { useFileBrowser } from '../../store/FileBrowserContext';
import { PathBar } from './PathBar';
import { CreateDialog } from '../Dialogs/CreateDialog';
import { uploadFiles } from '../Upload/UploadZone';
import * as fs from '../../api/cockpit-fs';

const _ = cockpit.gettext;

export interface ToolbarProps {
    onSearchOpen?: () => void;
    sidebarOpen?: boolean;
    onToggleSidebar?: () => void;
    showSidebarToggle?: boolean;
}

export const Toolbar: React.FC<ToolbarProps> = ({ onSearchOpen, sidebarOpen, onToggleSidebar, showSidebarToggle = true }) => {
    const { state, dispatch, navigate, refresh } = useFileBrowser();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploadingFromButton, setUploadingFromButton] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const [createDialogType, setCreateDialogType] = useState<'file' | 'directory' | null>(null);

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

    const handleToggleHidden = useCallback(() => {
        dispatch({ type: 'TOGGLE_HIDDEN' });
    }, [dispatch]);

    const handleNewFile = useCallback(() => {
        setCreateDialogType('file');
    }, []);

    const handleNewDir = useCallback(() => {
        setCreateDialogType('directory');
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
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    }, [state.currentPath, refresh]);

    const handleDownload = useCallback(async () => {
        const selectedPaths = Array.from(state.selectedEntries);
        if (selectedPaths.length === 0) return;

        setDownloading(true);
        try {
            if (selectedPaths.length === 1) {
                const entry = state.entries.find(e => e.path === selectedPaths[0]);
                if (entry) {
                    if (entry.type === 'directory') {
                        await fs.downloadArchive(entry.path);
                    } else {
                        await fs.downloadFile(entry.path);
                    }
                }
            } else {
                // Multiple selections: pack into a single tar.gz archive
                await fs.downloadMultipleAsArchive(selectedPaths, state.currentPath);
            }
        } catch (err: any) {
            console.error('Download error:', err);
        } finally {
            setDownloading(false);
        }
    }, [state.selectedEntries, state.entries, state.currentPath]);

    const handleCut = useCallback(() => {
        const selectedPaths = Array.from(state.selectedEntries);
        const entries = selectedPaths
            .map(p => state.entries.find(e => e.path === p))
            .filter(Boolean) as typeof state.entries;
        if (entries.length > 0) {
            dispatch({ type: 'SET_CLIPBOARD', clipboard: { entries, operation: 'cut' } });
        }
    }, [state.selectedEntries, state.entries, dispatch]);

    const handleCopy = useCallback(() => {
        const selectedPaths = Array.from(state.selectedEntries);
        const entries = selectedPaths
            .map(p => state.entries.find(e => e.path === p))
            .filter(Boolean) as typeof state.entries;
        if (entries.length > 0) {
            dispatch({ type: 'SET_CLIPBOARD', clipboard: { entries, operation: 'copy' } });
        }
    }, [state.selectedEntries, state.entries, dispatch]);

    const handlePaste = useCallback(async () => {
        if (!state.clipboard) return;
        try {
            for (const clipEntry of state.clipboard.entries) {
                const dest = state.currentPath + '/' + clipEntry.name;
                if (state.clipboard.operation === 'cut') {
                    await fs.moveEntry(clipEntry.path, dest);
                } else {
                    await fs.copyEntry(clipEntry.path, dest);
                }
            }
            dispatch({ type: 'CLEAR_CLIPBOARD' });
            refresh();
        } catch (err: any) {
            console.error('Paste error:', err);
        }
    }, [state.clipboard, state.currentPath, dispatch, refresh]);

    const canGoBack = state.historyIndex > 0;
    const canGoForward = state.historyIndex < state.history.length - 1;
    const canGoUp = state.currentPath !== '/';
    const hasSelection = state.selectedEntries.size > 0;
    const hasClipboard = state.clipboard !== null;

    return (
        <PFToolbar>
            <input
                type="file"
                multiple
                ref={fileInputRef}
                style={{ display: 'none' }}
                onChange={handleFileInputChange}
            />
            {/* Row 1: Sidebar toggle + Navigation + Path bar */}
            <ToolbarContent>
                <ToolbarGroup>
                    {showSidebarToggle && (
                        <ToolbarItem>
                            <Tooltip content={sidebarOpen ? _("Hide sidebar") : _("Show sidebar")}>
                                <Button variant="plain" onClick={onToggleSidebar} aria-label={_("Toggle sidebar")} size="sm">
                                    <BarsIcon />
                                </Button>
                            </Tooltip>
                        </ToolbarItem>
                    )}
                    <ToolbarItem>
                        <Button variant="plain" onClick={handleBack} isDisabled={!canGoBack} aria-label={_("Go back")} size="sm">
                            <ArrowLeftIcon />
                        </Button>
                    </ToolbarItem>
                    <ToolbarItem>
                        <Button variant="plain" onClick={handleForward} isDisabled={!canGoForward} aria-label={_("Go forward")} size="sm">
                            <ArrowRightIcon />
                        </Button>
                    </ToolbarItem>
                    <ToolbarItem>
                        <Button variant="plain" onClick={handleUp} isDisabled={!canGoUp} aria-label={_("Go up")} size="sm">
                            <ArrowUpIcon />
                        </Button>
                    </ToolbarItem>
                    <ToolbarItem>
                        <Button variant="plain" onClick={handleRefresh} aria-label={_("Refresh")} size="sm">
                            <SyncAltIcon />
                        </Button>
                    </ToolbarItem>
                </ToolbarGroup>

                <ToolbarItem style={{ flex: 1 }}>
                    <PathBar />
                </ToolbarItem>
            </ToolbarContent>

            {/* Row 2: Actions (left) + View controls (right) */}
            <ToolbarContent>
                <ToolbarGroup>
                    <ToolbarItem>
                        <Button variant="secondary" icon={<PlusIcon />} onClick={handleNewFile} size="sm">
                            {_("New File")}
                        </Button>
                    </ToolbarItem>
                    <ToolbarItem>
                        <Button variant="secondary" icon={<FolderOpenIcon />} onClick={handleNewDir} size="sm">
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
                    {hasSelection && (
                        <>
                            <ToolbarItem>
                                <Button variant="secondary" icon={<CutIcon />} onClick={handleCut} size="sm">
                                    {_("Cut")}
                                </Button>
                            </ToolbarItem>
                            <ToolbarItem>
                                <Button variant="secondary" icon={<CopyIcon />} onClick={handleCopy} size="sm">
                                    {_("Copy")}
                                </Button>
                            </ToolbarItem>
                        </>
                    )}
                    {hasClipboard && (
                        <ToolbarItem>
                            <Button variant="secondary" icon={<PasteIcon />} onClick={handlePaste} size="sm">
                                {_("Paste")}
                            </Button>
                        </ToolbarItem>
                    )}
                </ToolbarGroup>

                <ToolbarGroup align={{ default: 'alignEnd' }}>
                    <ToolbarItem>
                        <Tooltip content={_("Search files")}>
                            <Button variant="plain" onClick={onSearchOpen} aria-label={_("Search files")} size="sm">
                                <SearchIcon />
                            </Button>
                        </Tooltip>
                    </ToolbarItem>
                    <ToolbarItem>
                        <Tooltip content={_("Show hidden files")}>
                            <Button
                                variant={state.showHidden ? "secondary" : "plain"}
                                onClick={handleToggleHidden}
                                aria-label={_("Show hidden files")}
                                size="sm"
                            >
                                {state.showHidden ? <EyeIcon /> : <EyeSlashIcon />}
                            </Button>
                        </Tooltip>
                    </ToolbarItem>
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
            </ToolbarContent>

            {createDialogType && (
                <CreateDialog
                    type={createDialogType}
                    isOpen={true}
                    onClose={() => setCreateDialogType(null)}
                />
            )}
        </PFToolbar>
    );
};
