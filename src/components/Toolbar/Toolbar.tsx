import React, { useCallback, useRef } from 'react';
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
import { TerminalIcon } from "@patternfly/react-icons/dist/esm/icons/terminal-icon.js";
import { EyeIcon } from "@patternfly/react-icons/dist/esm/icons/eye-icon.js";
import { EyeSlashIcon } from "@patternfly/react-icons/dist/esm/icons/eye-slash-icon.js";
import { BarsIcon } from "@patternfly/react-icons/dist/esm/icons/bars-icon.js";
import { TrashIcon } from "@patternfly/react-icons/dist/esm/icons/trash-icon.js";
import { CompressIcon } from "@patternfly/react-icons/dist/esm/icons/compress-icon.js";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "@patternfly/react-core/dist/esm/components/Modal/index.js";
import { ExclamationTriangleIcon } from "@patternfly/react-icons/dist/esm/icons/exclamation-triangle-icon.js";
import { useFileBrowser } from '../../store/FileBrowserContext';
import { PathBar } from './PathBar';
import { CreateDialog } from '../Dialogs/CreateDialog';
import { uploadManager } from '../Upload/upload-manager';
import { archiveManager } from '../Archive/archive-manager';
import { CompressDialog } from '../Archive/CompressDialog';
import * as fs from '../../api/cockpit-fs';

const _ = cockpit.gettext;

export interface ToolbarProps {
    onSearchOpen?: () => void;
    onTerminalOpen?: () => void;
    sidebarOpen?: boolean;
    onToggleSidebar?: () => void;
    showSidebarToggle?: boolean;
}

export const Toolbar: React.FC<ToolbarProps> = ({ onSearchOpen, onTerminalOpen, sidebarOpen, onToggleSidebar, showSidebarToggle = true }) => {
    const { state, dispatch, navigate, refresh } = useFileBrowser();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const folderInputRef = useRef<HTMLInputElement>(null);
    const [downloading, setDownloading] = React.useState(false);
    const [createDialogType, setCreateDialogType] = React.useState<'file' | 'directory' | null>(null);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);
    const [isDeleting, setIsDeleting] = React.useState(false);
    const [compressDialogOpen, setCompressDialogOpen] = React.useState(false);
    const [archiveToolsReady, setArchiveToolsReady] = React.useState(false);

    React.useEffect(() => {
        archiveManager.detectTools().then(() => setArchiveToolsReady(true));
    }, []);

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

    const handleUploadFiles = useCallback(() => {
        fileInputRef.current?.click();
    }, []);

    const handleUploadFolder = useCallback(() => {
        folderInputRef.current?.click();
    }, []);

    const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        uploadManager.onQueueDone(() => refresh());
        uploadManager.addFiles(files, state.currentPath);

        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    }, [state.currentPath, refresh]);

    const handleFolderInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        // Files from webkitdirectory have webkitRelativePath set
        const filesWithPaths = Array.from(files).map(file => ({
            file,
            destPath: state.currentPath + '/' + (file.webkitRelativePath || file.name),
        }));

        uploadManager.onQueueDone(() => refresh());
        uploadManager.addFilesWithPaths(filesWithPaths);

        if (folderInputRef.current) {
            folderInputRef.current.value = '';
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

    const handleDelete = useCallback(() => {
        setDeleteConfirmOpen(true);
    }, []);

    const handleCompress = useCallback(() => {
        setCompressDialogOpen(true);
    }, []);

    const handleDeleteConfirm = useCallback(async () => {
        setIsDeleting(true);
        try {
            const selectedPaths = Array.from(state.selectedEntries);
            for (const path of selectedPaths) {
                await fs.deleteEntry(path);
            }
            dispatch({ type: 'CLEAR_SELECTION' });
            refresh();
            setDeleteConfirmOpen(false);
        } catch (err: any) {
            console.error('Delete error:', err);
        } finally {
            setIsDeleting(false);
        }
    }, [state.selectedEntries, dispatch, refresh]);

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
            <input
                type="file"
                ref={folderInputRef}
                style={{ display: 'none' }}
                onChange={handleFolderInputChange}
                {...{ webkitdirectory: '', directory: '' } as any}
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
                        <Tooltip content={_("New File")}>
                            <Button variant="plain" onClick={handleNewFile} aria-label={_("New File")} size="sm">
                                <PlusIcon />
                            </Button>
                        </Tooltip>
                    </ToolbarItem>
                    <ToolbarItem>
                        <Tooltip content={_("New Folder")}>
                            <Button variant="plain" onClick={handleNewDir} aria-label={_("New Folder")} size="sm">
                                <FolderOpenIcon />
                            </Button>
                        </Tooltip>
                    </ToolbarItem>
                    <ToolbarItem>
                        <Tooltip content={_("Upload Files")}>
                            <Button
                                variant="plain"
                                onClick={handleUploadFiles}
                                aria-label={_("Upload Files")}
                                size="sm"
                            >
                                <UploadIcon />
                            </Button>
                        </Tooltip>
                    </ToolbarItem>
                    <ToolbarItem>
                        <Tooltip content={_("Upload Folder")}>
                            <Button
                                variant="plain"
                                onClick={handleUploadFolder}
                                aria-label={_("Upload Folder")}
                                size="sm"
                            >
                                <FolderOpenIcon style={{ position: 'relative' }} />
                            </Button>
                        </Tooltip>
                    </ToolbarItem>
                    {hasSelection && (
                        <>
                            <ToolbarItem>
                                <Tooltip content={downloading ? _("Downloading...") : _("Download")}>
                                    <Button
                                        variant="plain"
                                        onClick={handleDownload}
                                        isDisabled={downloading}
                                        isLoading={downloading}
                                        aria-label={_("Download")}
                                        size="sm"
                                    >
                                        <DownloadIcon />
                                    </Button>
                                </Tooltip>
                            </ToolbarItem>
                            <ToolbarItem>
                                <Tooltip content={_("Cut")}>
                                    <Button variant="plain" onClick={handleCut} aria-label={_("Cut")} size="sm">
                                        <CutIcon />
                                    </Button>
                                </Tooltip>
                            </ToolbarItem>
                            <ToolbarItem>
                                <Tooltip content={_("Copy")}>
                                    <Button variant="plain" onClick={handleCopy} aria-label={_("Copy")} size="sm">
                                        <CopyIcon />
                                    </Button>
                                </Tooltip>
                            </ToolbarItem>
                            <ToolbarItem>
                                <Tooltip content={_("Delete")}>
                                    <Button variant="plain" onClick={handleDelete} aria-label={_("Delete")} size="sm">
                                        <TrashIcon />
                                    </Button>
                                </Tooltip>
                            </ToolbarItem>
                            {archiveToolsReady && archiveManager.getCompressFormats().length > 0 && (
                                <ToolbarItem>
                                    <Tooltip content={_("Compress")}>
                                        <Button variant="plain" onClick={handleCompress} aria-label={_("Compress")} size="sm">
                                            <CompressIcon />
                                        </Button>
                                    </Tooltip>
                                </ToolbarItem>
                            )}
                        </>
                    )}
                    {hasClipboard && (
                        <ToolbarItem>
                            <Tooltip content={_("Paste")}>
                                <Button variant="plain" onClick={handlePaste} aria-label={_("Paste")} size="sm">
                                    <PasteIcon />
                                </Button>
                            </Tooltip>
                        </ToolbarItem>
                    )}
                </ToolbarGroup>

                <ToolbarGroup align={{ default: 'alignEnd' }}>
                    <ToolbarItem>
                        <Tooltip content={_("Terminal")}>
                            <Button variant="plain" onClick={onTerminalOpen} aria-label={_("Terminal")} size="sm">
                                <TerminalIcon />
                            </Button>
                        </Tooltip>
                    </ToolbarItem>
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
            {compressDialogOpen && (
                <CompressDialog
                    isOpen={compressDialogOpen}
                    onClose={() => {
                        setCompressDialogOpen(false);
                        archiveManager.onQueueDone(() => refresh());
                    }}
                    paths={Array.from(state.selectedEntries)}
                    parentDir={state.currentPath}
                />
            )}
            <Modal
                isOpen={deleteConfirmOpen}
                onClose={() => setDeleteConfirmOpen(false)}
                variant="small"
            >
                <ModalHeader title={_("Delete")} />
                <ModalBody>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                        <ExclamationTriangleIcon
                            style={{ color: 'var(--pf-t--global--icon--color--status--warning--default, #f0ab00)', fontSize: '1.5rem', flexShrink: 0 }}
                        />
                        <p>
                            {state.selectedEntries.size === 1
                                ? cockpit.format(_("Are you sure you want to delete $0?"),
                                    state.entries.find(e => e.path === Array.from(state.selectedEntries)[0])?.name || '')
                                : cockpit.format(_("Are you sure you want to delete $0 items?"), state.selectedEntries.size)
                            }
                        </p>
                    </div>
                </ModalBody>
                <ModalFooter>
                    <Button variant="danger" onClick={handleDeleteConfirm} isDisabled={isDeleting} isLoading={isDeleting}>
                        {_("Delete")}
                    </Button>
                    <Button variant="link" onClick={() => setDeleteConfirmOpen(false)}>
                        {_("Cancel")}
                    </Button>
                </ModalFooter>
            </Modal>
        </PFToolbar>
    );
};
