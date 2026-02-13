import React, { useMemo, useCallback, useState } from 'react';
import cockpit from 'cockpit';
import {
    EmptyState,
    EmptyStateBody,
} from "@patternfly/react-core/dist/esm/components/EmptyState/index.js";
import { FolderOpenIcon } from "@patternfly/react-icons/dist/esm/icons/folder-open-icon.js";
import { useFileBrowser } from '../../store/FileBrowserContext';
import { FileIcon } from './FileIcon';
import { FileEntry } from '../../api/types';
import { SortField } from '../../store/actions';
import { ContextMenu } from '../ContextMenu/ContextMenu';
import { CreateDialog } from '../Dialogs/CreateDialog';
import { DeleteDialog } from '../Dialogs/DeleteDialog';
import { RenameDialog } from '../Dialogs/RenameDialog';
import './file-grid.scss';

const _ = cockpit.gettext;

interface ContextMenuState {
    x: number;
    y: number;
    entry: FileEntry | null;
}

export const FileGrid: React.FC = () => {
    const { state, dispatch, navigate } = useFileBrowser();

    // Context menu state
    const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

    // Dialog states
    const [createDialogType, setCreateDialogType] = useState<'file' | 'directory' | 'link' | null>(null);
    const [renameEntry, setRenameEntry] = useState<FileEntry | null>(null);
    const [deleteEntry, setDeleteEntry] = useState<FileEntry | null>(null);

    // Sort entries: directories first, then by sortField
    const sortedEntries = useMemo(() => {
        const entries = [...state.entries];

        entries.sort((a, b) => {
            // Directories always come first
            const aIsDir = a.type === 'directory' ? 0 : 1;
            const bIsDir = b.type === 'directory' ? 0 : 1;
            if (aIsDir !== bIsDir) return aIsDir - bIsDir;

            let cmp = 0;
            switch (state.sortField) {
                case 'name':
                    cmp = a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
                    break;
                case 'size':
                    cmp = a.size - b.size;
                    break;
                case 'modified':
                    cmp = a.modified.localeCompare(b.modified);
                    break;
                case 'owner':
                    cmp = a.owner.localeCompare(b.owner);
                    break;
                case 'type':
                    cmp = a.type.localeCompare(b.type);
                    break;
                default:
                    cmp = 0;
            }

            return state.sortDirection === 'asc' ? cmp : -cmp;
        });

        return entries;
    }, [state.entries, state.sortField, state.sortDirection]);

    const handleClick = useCallback((event: React.MouseEvent, entry: FileEntry) => {
        event.preventDefault();
        const multi = event.ctrlKey || event.metaKey;
        dispatch({ type: 'SELECT_ENTRY', path: entry.path, multi });
    }, [dispatch]);

    const handleDoubleClick = useCallback((event: React.MouseEvent, entry: FileEntry) => {
        event.preventDefault();
        if (entry.type === 'directory') {
            navigate(entry.path);
        } else {
            dispatch({ type: 'OPEN_EDITOR', path: entry.path });
        }
    }, [navigate, dispatch]);

    const handleContextMenu = useCallback((event: React.MouseEvent, entry: FileEntry) => {
        event.preventDefault();
        event.stopPropagation();
        setContextMenu({ x: event.clientX, y: event.clientY, entry });
    }, []);

    const handleEmptyContextMenu = useCallback((event: React.MouseEvent) => {
        event.preventDefault();
        setContextMenu({ x: event.clientX, y: event.clientY, entry: null });
    }, []);

    const handleCloseContextMenu = useCallback(() => {
        setContextMenu(null);
    }, []);

    const handleCreateDialog = useCallback((type: 'file' | 'directory' | 'link') => {
        setCreateDialogType(type);
    }, []);

    const handleRenameDialog = useCallback((entry: FileEntry) => {
        setRenameEntry(entry);
    }, []);

    const handleDeleteDialog = useCallback((entry: FileEntry) => {
        setDeleteEntry(entry);
    }, []);

    const isSelected = useCallback((entry: FileEntry): boolean => {
        return state.selectedEntries.has(entry.path);
    }, [state.selectedEntries]);

    if (sortedEntries.length === 0 && !state.loading) {
        return (
            <div onContextMenu={handleEmptyContextMenu}>
                <EmptyState
                    titleText={_("No files")}
                    headingLevel="h4"
                    icon={FolderOpenIcon}
                >
                    <EmptyStateBody>
                        {_("This directory is empty.")}
                    </EmptyStateBody>
                </EmptyState>

                {contextMenu && (
                    <ContextMenu
                        x={contextMenu.x}
                        y={contextMenu.y}
                        entry={contextMenu.entry}
                        onClose={handleCloseContextMenu}
                        onCreateDialog={handleCreateDialog}
                        onRenameDialog={handleRenameDialog}
                        onDeleteDialog={handleDeleteDialog}
                    />
                )}

                {createDialogType && (
                    <CreateDialog
                        type={createDialogType}
                        isOpen={true}
                        onClose={() => setCreateDialogType(null)}
                    />
                )}
            </div>
        );
    }

    return (
        <div className="file-grid" onContextMenu={handleEmptyContextMenu}>
            {sortedEntries.map((entry) => {
                const selected = isSelected(entry);
                return (
                    <div
                        key={entry.path}
                        className={`file-grid__card${selected ? ' file-grid__card--selected' : ''}`}
                        onClick={(event) => handleClick(event, entry)}
                        onDoubleClick={(event) => handleDoubleClick(event, entry)}
                        onContextMenu={(event) => handleContextMenu(event, entry)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                if (entry.type === 'directory') {
                                    navigate(entry.path);
                                } else {
                                    dispatch({ type: 'OPEN_EDITOR', path: entry.path });
                                }
                            }
                        }}
                    >
                        <div className="file-grid__icon">
                            <FileIcon type={entry.type} name={entry.name} className="file-grid__icon-svg" />
                        </div>
                        <div className="file-grid__name" title={entry.name}>
                            {entry.name}
                        </div>
                    </div>
                );
            })}

            {/* Context menu */}
            {contextMenu && (
                <ContextMenu
                    x={contextMenu.x}
                    y={contextMenu.y}
                    entry={contextMenu.entry}
                    onClose={handleCloseContextMenu}
                    onCreateDialog={handleCreateDialog}
                    onRenameDialog={handleRenameDialog}
                    onDeleteDialog={handleDeleteDialog}
                />
            )}

            {/* Dialogs */}
            {createDialogType && (
                <CreateDialog
                    type={createDialogType}
                    isOpen={true}
                    onClose={() => setCreateDialogType(null)}
                />
            )}
            {renameEntry && (
                <RenameDialog
                    entry={renameEntry}
                    isOpen={true}
                    onClose={() => setRenameEntry(null)}
                />
            )}
            {deleteEntry && (
                <DeleteDialog
                    entry={deleteEntry}
                    isOpen={true}
                    onClose={() => setDeleteEntry(null)}
                />
            )}
        </div>
    );
};
