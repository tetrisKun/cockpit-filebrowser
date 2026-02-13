import React, { useState, useRef, useCallback } from 'react';
import cockpit from 'cockpit';
import { Alert } from "@patternfly/react-core/dist/esm/components/Alert/index.js";
import { Progress } from "@patternfly/react-core/dist/esm/components/Progress/index.js";
import { UploadIcon } from "@patternfly/react-icons/dist/esm/icons/upload-icon.js";
import { useFileBrowser } from '../../store/FileBrowserContext';
import './upload.scss';

const _ = cockpit.gettext;

interface UploadZoneProps {
    children: React.ReactNode;
}

/**
 * Upload files to the current directory using base64 encoding via cockpit.spawn.
 */
export async function uploadFiles(
    files: FileList | File[],
    currentPath: string,
    onProgress?: (completed: number, total: number) => void,
): Promise<void> {
    const fileArray = Array.from(files);
    const total = fileArray.length;

    for (let i = 0; i < fileArray.length; i++) {
        const file = fileArray[i];
        const destPath = currentPath + '/' + file.name;

        const base64Data = await readFileAsBase64(file);
        await cockpit.spawn(
            ['bash', '-c', 'base64 -d > ' + shellEscape(destPath)],
            { superuser: "try" as const, err: "message" as const }
        ).input(base64Data);

        if (onProgress) {
            onProgress(i + 1, total);
        }
    }
}

function readFileAsBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const arrayBuffer = reader.result as ArrayBuffer;
            const bytes = new Uint8Array(arrayBuffer);
            let binary = '';
            for (let i = 0; i < bytes.length; i++) {
                binary += String.fromCharCode(bytes[i]);
            }
            resolve(btoa(binary));
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsArrayBuffer(file);
    });
}

function shellEscape(s: string): string {
    return "'" + s.replace(/'/g, "'\\''") + "'";
}

export const UploadZone: React.FC<UploadZoneProps> = ({ children }) => {
    const { state, refresh } = useFileBrowser();
    const [isDragging, setIsDragging] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState({ completed: 0, total: 0 });
    const [error, setError] = useState<string | null>(null);
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

        const files = e.dataTransfer.files;
        if (files.length === 0) return;

        setUploading(true);
        setError(null);
        setProgress({ completed: 0, total: files.length });

        try {
            await uploadFiles(files, state.currentPath, (completed, total) => {
                setProgress({ completed, total });
            });
            refresh();
        } catch (err: any) {
            setError(err?.message || String(err));
        } finally {
            setUploading(false);
        }
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
                            {_("Drop files here to upload")}
                        </p>
                    </div>
                </div>
            )}

            {uploading && (
                <div className="upload-zone__progress">
                    <Progress
                        value={(progress.completed / progress.total) * 100}
                        title={cockpit.format(_("Uploading $0 of $1 files..."), progress.completed, progress.total)}
                        label={cockpit.format(_("$0 of $1"), progress.completed, progress.total)}
                    />
                </div>
            )}

            {error && (
                <div className="upload-zone__error">
                    <Alert
                        variant="danger"
                        title={_("Upload failed")}
                        isInline
                        actionClose={
                            <button
                                className="pf-v6-c-button pf-m-plain"
                                onClick={() => setError(null)}
                                aria-label={_("Close")}
                            >
                                &times;
                            </button>
                        }
                    >
                        {error}
                    </Alert>
                </div>
            )}
        </div>
    );
};
