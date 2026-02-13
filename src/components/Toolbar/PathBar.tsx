import React, { useState, useCallback, useRef, useEffect } from 'react';
import cockpit from 'cockpit';
import { Breadcrumb, BreadcrumbItem } from "@patternfly/react-core/dist/esm/components/Breadcrumb/index.js";
import { Button } from "@patternfly/react-core/dist/esm/components/Button/index.js";
import { TextInput } from "@patternfly/react-core/dist/esm/components/TextInput/index.js";
import { PencilAltIcon } from "@patternfly/react-icons/dist/esm/icons/pencil-alt-icon.js";
import { useFileBrowser } from '../../store/FileBrowserContext';

const _ = cockpit.gettext;

export const PathBar: React.FC = () => {
    const { state, navigate } = useFileBrowser();
    const [editing, setEditing] = useState(false);
    const [editPath, setEditPath] = useState(state.currentPath);
    const inputRef = useRef<HTMLInputElement>(null);

    // Update editPath when currentPath changes
    useEffect(() => {
        setEditPath(state.currentPath);
    }, [state.currentPath]);

    // Focus the input when entering edit mode
    useEffect(() => {
        if (editing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [editing]);

    const handleToggleEdit = useCallback(() => {
        setEditing(prev => !prev);
        setEditPath(state.currentPath);
    }, [state.currentPath]);

    const handleEditKeyDown = useCallback((event: React.KeyboardEvent) => {
        if (event.key === 'Enter') {
            const path = editPath.trim() || '/';
            navigate(path);
            setEditing(false);
        } else if (event.key === 'Escape') {
            setEditing(false);
            setEditPath(state.currentPath);
        }
    }, [editPath, navigate, state.currentPath]);

    const handleEditBlur = useCallback(() => {
        setEditing(false);
        setEditPath(state.currentPath);
    }, [state.currentPath]);

    // Build breadcrumb segments from path
    const segments = state.currentPath.split('/').filter(Boolean);

    const handleSegmentClick = useCallback((index: number) => {
        const path = '/' + segments.slice(0, index + 1).join('/');
        navigate(path);
    }, [segments, navigate]);

    const handleRootClick = useCallback(() => {
        navigate('/');
    }, [navigate]);

    if (editing) {
        return (
            <div className="path-bar path-bar--editing" style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                <TextInput
                    ref={inputRef}
                    value={editPath}
                    onChange={(_event, value) => setEditPath(value)}
                    onKeyDown={handleEditKeyDown}
                    onBlur={handleEditBlur}
                    aria-label={_("Path input")}
                    style={{ flex: 1 }}
                />
                <Button
                    variant="plain"
                    onClick={handleToggleEdit}
                    aria-label={_("Cancel editing")}
                    size="sm"
                >
                    <PencilAltIcon />
                </Button>
            </div>
        );
    }

    return (
        <div className="path-bar" style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
            <Breadcrumb style={{ flex: 1 }}>
                <BreadcrumbItem
                    to="#"
                    onClick={(e) => { e.preventDefault(); handleRootClick(); }}
                    isActive={segments.length === 0}
                >
                    /
                </BreadcrumbItem>
                {segments.map((segment, index) => (
                    <BreadcrumbItem
                        key={index}
                        to="#"
                        onClick={(e) => { e.preventDefault(); handleSegmentClick(index); }}
                        isActive={index === segments.length - 1}
                    >
                        {segment}
                    </BreadcrumbItem>
                ))}
            </Breadcrumb>
            <Button
                variant="plain"
                onClick={handleToggleEdit}
                aria-label={_("Edit path")}
                size="sm"
            >
                <PencilAltIcon />
            </Button>
        </div>
    );
};
