import React, { useMemo, useCallback } from 'react';
import cockpit from 'cockpit';
import {
    Table,
    Thead,
    Tbody,
    Tr,
    Th,
    Td,
} from "@patternfly/react-table/dist/esm/components/Table/index.js";
import { SortByDirection } from "@patternfly/react-table/dist/esm/components/Table/SortColumn.js";
import {
    EmptyState,
    EmptyStateBody,
} from "@patternfly/react-core/dist/esm/components/EmptyState/index.js";
import { FolderOpenIcon } from "@patternfly/react-icons/dist/esm/icons/folder-open-icon.js";
import { useFileBrowser } from '../../store/FileBrowserContext';
import { FileIcon } from './FileIcon';
import { FileEntry } from '../../api/types';
import { SortField, SortDirection } from '../../store/actions';

const _ = cockpit.gettext;

/**
 * Format bytes to human-readable size string.
 */
function formatSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const k = 1024;
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const idx = Math.min(i, units.length - 1);
    const value = bytes / Math.pow(k, idx);
    return `${value.toFixed(idx === 0 ? 0 : 1)} ${units[idx]}`;
}

/**
 * Format date string to locale date.
 */
function formatDate(dateStr: string): string {
    if (!dateStr) return '';
    try {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) {
            // Try parsing the full-iso format directly: "2024-01-15 10:30:45.123456789"
            return dateStr.split('.')[0] || dateStr;
        }
        return date.toLocaleString();
    } catch {
        return dateStr;
    }
}

// Column names (localized)
const columnNames = (): string[] => [_("Name"), _("Size"), _("Modified"), _("Permissions"), _("Owner")];

export const FileTable: React.FC = () => {
    const { state, dispatch, navigate } = useFileBrowser();

    // Map our sort field to column index
    const sortFieldToIndex = (field: SortField): number => {
        const map: Record<SortField, number> = { name: 0, size: 1, modified: 2, type: 3, owner: 4 };
        return map[field];
    };

    const activeSortIndex = sortFieldToIndex(state.sortField);
    const activeSortDirection = state.sortDirection === 'asc' ? SortByDirection.asc : SortByDirection.desc;

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

    const handleSort = useCallback((_event: React.MouseEvent, columnIndex: number, direction: SortByDirection) => {
        const fields: SortField[] = ['name', 'size', 'modified', 'type', 'owner'];
        const field = fields[columnIndex];
        const dir: SortDirection = direction === SortByDirection.asc ? 'asc' : 'desc';
        dispatch({ type: 'SET_SORT', field, direction: dir });
    }, [dispatch]);

    const handleRowClick = useCallback((event: React.MouseEvent, entry: FileEntry) => {
        event.preventDefault();
        const multi = event.ctrlKey || event.metaKey;
        dispatch({ type: 'SELECT_ENTRY', path: entry.path, multi });
    }, [dispatch]);

    const handleRowDoubleClick = useCallback((event: React.MouseEvent, entry: FileEntry) => {
        event.preventDefault();
        if (entry.type === 'directory') {
            navigate(entry.path);
        } else {
            dispatch({ type: 'OPEN_EDITOR', path: entry.path });
        }
    }, [navigate, dispatch]);

    const handleContextMenu = useCallback((event: React.MouseEvent) => {
        event.preventDefault();
        // Placeholder for future context menu
    }, []);

    const isSelected = useCallback((entry: FileEntry): boolean => {
        return state.selectedEntries.has(entry.path);
    }, [state.selectedEntries]);

    const handleSelectAll = useCallback((event: React.FormEvent<HTMLInputElement>, checked: boolean) => {
        if (checked) {
            dispatch({ type: 'SELECT_ALL' });
        } else {
            dispatch({ type: 'CLEAR_SELECTION' });
        }
    }, [dispatch]);

    const handleRowCheckbox = useCallback((event: React.FormEvent<HTMLInputElement>, entry: FileEntry) => {
        event.stopPropagation();
        dispatch({ type: 'SELECT_ENTRY', path: entry.path, multi: true });
    }, [dispatch]);

    const names = columnNames();

    if (sortedEntries.length === 0 && !state.loading) {
        return (
            <EmptyState
                titleText={_("No files")}
                headingLevel="h4"
                icon={FolderOpenIcon}
            >
                <EmptyStateBody>
                    {_("This directory is empty.")}
                </EmptyStateBody>
            </EmptyState>
        );
    }

    const allSelected = sortedEntries.length > 0 && state.selectedEntries.size === sortedEntries.length;

    return (
        <Table aria-label={_("File listing")} variant="compact">
            <Thead>
                <Tr>
                    <Th
                        select={{
                            onSelect: handleSelectAll,
                            isSelected: allSelected,
                        }}
                        aria-label={_("Select all")}
                    />
                    {names.map((name, index) => (
                        <Th
                            key={index}
                            sort={{
                                sortBy: {
                                    index: activeSortIndex,
                                    direction: activeSortDirection,
                                },
                                onSort: handleSort,
                                columnIndex: index,
                            }}
                        >
                            {name}
                        </Th>
                    ))}
                </Tr>
            </Thead>
            <Tbody>
                {sortedEntries.map((entry) => {
                    const selected = isSelected(entry);
                    return (
                        <Tr
                            key={entry.path}
                            className={`file-table-row${selected ? ' file-table-row--selected' : ''}`}
                            isClickable
                            isRowSelected={selected}
                            onClick={(event) => handleRowClick(event, entry)}
                            onDoubleClick={(event) => handleRowDoubleClick(event, entry)}
                            onContextMenu={handleContextMenu}
                        >
                            <Td
                                select={{
                                    rowIndex: 0,
                                    onSelect: (event) => handleRowCheckbox(event, entry),
                                    isSelected: selected,
                                }}
                            />
                            <Td dataLabel={names[0]}>
                                <span className="file-name-cell">
                                    <FileIcon type={entry.type} name={entry.name} className="file-icon" />
                                    <span className="file-name">{entry.name}</span>
                                    {entry.linkTarget && (
                                        <span className="file-link-target"> &rarr; {entry.linkTarget}</span>
                                    )}
                                </span>
                            </Td>
                            <Td dataLabel={names[1]}>
                                {entry.type === 'directory' ? '-' : formatSize(entry.size)}
                            </Td>
                            <Td dataLabel={names[2]}>
                                {formatDate(entry.modified)}
                            </Td>
                            <Td dataLabel={names[3]}>
                                {entry.modeOctal}
                            </Td>
                            <Td dataLabel={names[4]}>
                                {entry.owner}{entry.group ? `:${entry.group}` : ''}
                            </Td>
                        </Tr>
                    );
                })}
            </Tbody>
        </Table>
    );
};
