import React, { useEffect, useCallback, useRef, useState } from 'react';
import cockpit from 'cockpit';
import { Menu, MenuContent, MenuList, MenuItem } from "@patternfly/react-core/dist/esm/components/Menu/index.js";
import { Divider } from "@patternfly/react-core/dist/esm/components/Divider/index.js";
import { FileEntry } from '../../api/types';
import { useFileBrowser } from '../../store/FileBrowserContext';
import * as fs from '../../api/cockpit-fs';
import './context-menu.scss';

const _ = cockpit.gettext;

export interface ContextMenuProps {
    x: number;
    y: number;
    entry: FileEntry | null;
    onClose: () => void;
    onCreateDialog: (type: 'file' | 'directory' | 'link') => void;
    onRenameDialog: (entry: FileEntry) => void;
    onDeleteDialog: (entry: FileEntry) => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
    x, y, entry, onClose, onCreateDialog, onRenameDialog, onDeleteDialog,
}) => {
    const { state, dispatch, refresh } = useFileBrowser();

    // Close on click outside (any mouse button) or Escape
    useEffect(() => {
        const handleMouseDown = (event: MouseEvent) => {
            // Don't close if clicking inside the menu
            if (menuRef.current && menuRef.current.contains(event.target as Node)) {
                return;
            }
            onClose();
        };

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        // Delay adding mousedown listener to avoid catching the same right-click event
        const timer = setTimeout(() => {
            document.addEventListener('mousedown', handleMouseDown);
        }, 0);
        document.addEventListener('keydown', handleKeyDown);

        return () => {
            clearTimeout(timer);
            document.removeEventListener('mousedown', handleMouseDown);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [onClose]);

    const handleOpen = useCallback(() => {
        if (entry) {
            dispatch({ type: 'OPEN_EDITOR', path: entry.path });
        }
        onClose();
    }, [entry, dispatch, onClose]);

    const handleCut = useCallback(() => {
        if (entry) {
            dispatch({
                type: 'SET_CLIPBOARD',
                clipboard: { entries: [entry], operation: 'cut' },
            });
        }
        onClose();
    }, [entry, dispatch, onClose]);

    const handleCopy = useCallback(() => {
        if (entry) {
            dispatch({
                type: 'SET_CLIPBOARD',
                clipboard: { entries: [entry], operation: 'copy' },
            });
        }
        onClose();
    }, [entry, dispatch, onClose]);

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
        onClose();
    }, [state.clipboard, state.currentPath, dispatch, refresh, onClose]);

    const handleDownload = useCallback(async () => {
        if (entry && entry.type === 'file') {
            try {
                await fs.downloadFile(entry.path);
            } catch (err: any) {
                console.error('Download error:', err);
            }
        }
        onClose();
    }, [entry, onClose]);

    const handleDownloadArchive = useCallback(async () => {
        if (entry && entry.type === 'directory') {
            try {
                await fs.downloadArchive(entry.path);
            } catch (err: any) {
                console.error('Download archive error:', err);
            }
        }
        onClose();
    }, [entry, onClose]);

    const handleProperties = useCallback(() => {
        if (entry) {
            dispatch({ type: 'OPEN_PROPERTIES', path: entry.path });
        }
        onClose();
    }, [entry, dispatch, onClose]);

    const handleBookmarkFolder = useCallback(() => {
        if (entry && entry.type === 'directory') {
            const name = entry.name || entry.path;
            dispatch({ type: 'ADD_BOOKMARK', bookmark: { name, path: entry.path } });
        }
        onClose();
    }, [entry, dispatch, onClose]);

    const handleNewFile = useCallback(() => {
        onCreateDialog('file');
        onClose();
    }, [onCreateDialog, onClose]);

    const handleNewDirectory = useCallback(() => {
        onCreateDialog('directory');
        onClose();
    }, [onCreateDialog, onClose]);

    const handleNewSymlink = useCallback(() => {
        onCreateDialog('link');
        onClose();
    }, [onCreateDialog, onClose]);

    const handleRename = useCallback(() => {
        if (entry) {
            onRenameDialog(entry);
        }
        onClose();
    }, [entry, onRenameDialog, onClose]);

    const handleDelete = useCallback(() => {
        if (entry) {
            onDeleteDialog(entry);
        }
        onClose();
    }, [entry, onDeleteDialog, onClose]);

    const isFile = entry?.type === 'file';
    const isDirectory = entry?.type === 'directory';
    const hasClipboard = state.clipboard !== null;

    const menuRef = useRef<HTMLDivElement>(null);
    const [pos, setPos] = useState({ left: x, top: y });

    useEffect(() => {
        const el = menuRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        let newLeft = x;
        let newTop = y;
        if (x + rect.width > vw) newLeft = x - rect.width;
        if (y + rect.height > vh) newTop = y - rect.height;
        if (newLeft < 0) newLeft = 4;
        if (newTop < 0) newTop = 4;
        if (newLeft !== pos.left || newTop !== pos.top) {
            setPos({ left: newLeft, top: newTop });
        }
    }, [x, y]);

    return (
        <div
            ref={menuRef}
            className="context-menu-overlay"
            style={{ position: 'fixed', left: pos.left, top: pos.top, zIndex: 9999 }}
        >
            <Menu className="context-menu">
                <MenuContent>
                    <MenuList>
                        {/* Open/Edit for files */}
                        {isFile && (
                            <>
                                <MenuItem onClick={handleOpen}>{_("Open")}</MenuItem>
                                <MenuItem onClick={handleOpen}>{_("Edit")}</MenuItem>
                                <Divider component="li" />
                            </>
                        )}

                        {/* New items */}
                        <MenuItem onClick={handleNewFile}>{_("New File")}</MenuItem>
                        <MenuItem onClick={handleNewDirectory}>{_("New Directory")}</MenuItem>
                        <MenuItem onClick={handleNewSymlink}>{_("New Symlink")}</MenuItem>
                        <Divider component="li" />

                        {/* Clipboard operations */}
                        {entry && (
                            <>
                                <MenuItem onClick={handleCut}>{_("Cut")}</MenuItem>
                                <MenuItem onClick={handleCopy}>{_("Copy")}</MenuItem>
                            </>
                        )}
                        {hasClipboard && (
                            <MenuItem onClick={handlePaste}>{_("Paste")}</MenuItem>
                        )}
                        {(entry || hasClipboard) && <Divider component="li" />}

                        {/* Rename/Delete for entries */}
                        {entry && (
                            <>
                                <MenuItem onClick={handleRename}>{_("Rename")}</MenuItem>
                                <MenuItem onClick={handleDelete}>{_("Delete")}</MenuItem>
                                <Divider component="li" />
                            </>
                        )}

                        {/* Download */}
                        {isFile && (
                            <>
                                <MenuItem onClick={handleDownload}>{_("Download")}</MenuItem>
                                <Divider component="li" />
                            </>
                        )}
                        {isDirectory && (
                            <>
                                <MenuItem onClick={handleDownloadArchive}>{_("Download as Archive")}</MenuItem>
                                <Divider component="li" />
                            </>
                        )}

                        {/* Properties and Bookmark */}
                        {entry && (
                            <MenuItem onClick={handleProperties}>{_("Properties")}</MenuItem>
                        )}
                        {isDirectory && (
                            <MenuItem onClick={handleBookmarkFolder}>{_("Bookmark This Folder")}</MenuItem>
                        )}
                    </MenuList>
                </MenuContent>
            </Menu>
        </div>
    );
};
