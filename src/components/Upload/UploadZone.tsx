import React, { useState, useRef, useCallback } from 'react';
import cockpit from 'cockpit';
import { UploadIcon } from "@patternfly/react-icons/dist/esm/icons/upload-icon.js";
import { useFileBrowser } from '../../store/FileBrowserContext';
import { uploadManager } from './upload-manager';
import './upload.scss';

const _ = cockpit.gettext;

interface UploadZoneProps {
    children: React.ReactNode;
}

export const UploadZone: React.FC<UploadZoneProps> = ({ children }) => {
    const { state, refresh } = useFileBrowser();
    const [isDragging, setIsDragging] = useState(false);
    const dragCounter = useRef(0);

    const handleDragEnter = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter.current++;
        if (e.dataTransfer.types.includes('Files')) {
            setIsDragging(true);
        }
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter.current--;
        if (dragCounter.current === 0) {
            setIsDragging(false);
        }
    }, []);

    const handleDrop = useCallback(async (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter.current = 0;
        setIsDragging(false);

        const items = e.dataTransfer.items;
        if (!items || items.length === 0) return;

        // Use addEntries for directory support via webkitGetAsEntry
        uploadManager.onQueueDone(() => refresh());
        await uploadManager.addEntries(items, state.currentPath);
    }, [state.currentPath, refresh]);

    return (
        <div
            className="upload-zone"
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            {children}

            {isDragging && (
                <div className="upload-zone__overlay">
                    <div className="upload-zone__overlay-content">
                        <UploadIcon className="upload-zone__overlay-icon" />
                        <p className="upload-zone__overlay-text">
                            {_("Drop files or folders here to upload")}
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};
