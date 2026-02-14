import React, { useState, useEffect, useRef, useCallback } from 'react';
import cockpit from 'cockpit';
import { Button } from "@patternfly/react-core/dist/esm/components/Button/index.js";
import { Progress } from "@patternfly/react-core/dist/esm/components/Progress/index.js";
import { TimesIcon } from "@patternfly/react-icons/dist/esm/icons/times-icon.js";
import { WindowMinimizeIcon } from "@patternfly/react-icons/dist/esm/icons/window-minimize-icon.js";
import { WindowRestoreIcon } from "@patternfly/react-icons/dist/esm/icons/window-restore-icon.js";
import { CheckCircleIcon } from "@patternfly/react-icons/dist/esm/icons/check-circle-icon.js";
import { ExclamationCircleIcon } from "@patternfly/react-icons/dist/esm/icons/exclamation-circle-icon.js";
import { UploadIcon } from "@patternfly/react-icons/dist/esm/icons/upload-icon.js";
import { SyncAltIcon } from "@patternfly/react-icons/dist/esm/icons/sync-alt-icon.js";
import { uploadManager } from './upload-manager';
import type { UploadState, UploadFileInfo } from './upload-manager';
import './upload.scss';

const _ = cockpit.gettext;

const WIDGET_ID = 'filebrowser-upload-progress';

/**
 * Try to create a floating progress widget in the Cockpit parent shell frame.
 * This allows progress to remain visible even when the user navigates away
 * from the file browser plugin to another Cockpit page.
 * Falls back silently if parent document is inaccessible (sandbox/cross-origin).
 */
function createGlobalProgressWidget(): boolean {
    try {
        const parentDoc = window.parent.document;
        if (!parentDoc || parentDoc === document) return false;
        if (parentDoc.getElementById(WIDGET_ID)) return true; // already exists

        const widget = parentDoc.createElement('div');
        widget.id = WIDGET_ID;
        Object.assign(widget.style, {
            position: 'fixed',
            bottom: '16px',
            right: '16px',
            zIndex: '99999',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 14px',
            borderRadius: '8px',
            background: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            color: '#fff',
            fontSize: '13px',
            fontWeight: '600',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.25)',
            transition: 'opacity 0.3s ease',
            userSelect: 'none',
        } as CSSStyleDeclaration);

        widget.addEventListener('click', () => {
            try {
                (window.parent as any).cockpit?.location?.go('/filebrowser');
            } catch (_) { /* ignore */ }
        });

        parentDoc.body.appendChild(widget);
        return true;
    } catch (_) {
        return false;
    }
}

/**
 * Check if our plugin iframe is currently visible (active in Cockpit).
 * Cockpit hides inactive plugin iframes with display:none.
 */
function isIframeVisible(): boolean {
    try {
        const frame = window.frameElement as HTMLElement;
        if (!frame) return true;
        return frame.offsetHeight > 0;
    } catch (_) {
        return true;
    }
}

function updateGlobalProgressWidget(percent: number, filesDone: number, totalFiles: number): void {
    try {
        const parentDoc = window.parent.document;
        const widget = parentDoc?.getElementById(WIDGET_ID);
        if (!widget) return;
        widget.textContent = `↑ ${percent}% · ${filesDone}/${totalFiles}`;
        // Only show when our iframe is hidden (user switched to another Cockpit app)
        widget.style.display = isIframeVisible() ? 'none' : 'flex';
    } catch (_) { /* ignore */ }
}

function removeGlobalProgressWidget(delay = 3000): void {
    try {
        const parentDoc = window.parent.document;
        const widget = parentDoc?.getElementById(WIDGET_ID);
        if (!widget) return;
        setTimeout(() => {
            try {
                widget.style.opacity = '0';
                setTimeout(() => {
                    try { widget.remove(); } catch (_) { /* ignore */ }
                }, 300);
            } catch (_) { /* ignore */ }
        }, delay);
    } catch (_) { /* ignore */ }
}

export function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const k = 1024;
    const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), units.length - 1);
    const value = bytes / Math.pow(k, i);
    return i === 0 ? `${bytes} B` : `${value.toFixed(1)} ${units[i]}`;
}

export function formatProgress(uploaded: number, total: number): string {
    return `${formatBytes(uploaded)} / ${formatBytes(total)}`;
}

/**
 * Hook to subscribe to UploadManager state changes via its event system.
 */
function useUploadState(): UploadState {
    const [state, setState] = useState<UploadState>(() => uploadManager.getState());

    useEffect(() => {
        const handler = () => setState(uploadManager.getState());
        uploadManager.on('state-changed', handler);
        return () => { uploadManager.off('state-changed', handler); };
    }, []);

    return state;
}

export const UploadPanel: React.FC = () => {
    const state = useUploadState();
    const [minimized, setMinimized] = useState(false);
    const [visible, setVisible] = useState(false);
    const [dismissed, setDismissed] = useState(false);
    const originalTitleRef = useRef(document.title);
    const autoHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const prevStatusRef = useRef(state.status);

    const isUploading = state.status === 'uploading';
    const hasFiles = state.files.length > 0;
    const activeFiles = state.files.filter(f => f.status !== 'cancelled');
    const doneCount = activeFiles.filter(f => f.status === 'done').length;
    const errorCount = activeFiles.filter(f => f.status === 'error').length;
    const totalCount = activeFiles.length;
    const allDone = hasFiles && !isUploading && totalCount > 0 && doneCount + errorCount === totalCount;
    const allSuccess = allDone && errorCount === 0;
    const percent = state.totalBytes > 0 ? Math.round((state.uploadedBytes / state.totalBytes) * 100) : 0;

    // Show panel when upload starts, reset dismissed
    useEffect(() => {
        if (isUploading && prevStatusRef.current !== 'uploading') {
            setVisible(true);
            setDismissed(false);
            setMinimized(false);
        }
        prevStatusRef.current = state.status;
    }, [isUploading, state.status]);

    // Also show when files appear
    useEffect(() => {
        if (hasFiles && !dismissed) {
            setVisible(true);
        }
    }, [hasFiles, dismissed]);

    // Update document.title + parent frame global progress widget
    useEffect(() => {
        if (isUploading) {
            document.title = `↑ ${percent}% - ${originalTitleRef.current}`;
            createGlobalProgressWidget();
            updateGlobalProgressWidget(percent, doneCount, totalCount);
        } else {
            document.title = originalTitleRef.current;
        }
        return () => {
            document.title = originalTitleRef.current;
        };
    }, [isUploading, percent, doneCount, totalCount]);

    // Toggle global widget visibility when iframe visibility changes
    // (Cockpit hides inactive plugin iframes via display:none)
    useEffect(() => {
        if (!isUploading) return;
        const frame = window.frameElement as HTMLElement | null;
        if (!frame) return;

        const observer = new MutationObserver(() => {
            updateGlobalProgressWidget(percent, doneCount, totalCount);
        });

        // Watch for style/class changes on our iframe (Cockpit toggles display)
        observer.observe(frame, { attributes: true, attributeFilter: ['style', 'class'] });
        // Also watch parent container in case Cockpit hides the wrapper
        if (frame.parentElement) {
            observer.observe(frame.parentElement, { attributes: true, attributeFilter: ['style', 'class', 'hidden'] });
        }

        return () => observer.disconnect();
    }, [isUploading, percent, doneCount, totalCount]);

    // Auto-hide after all success, desktop notification on complete
    useEffect(() => {
        if (autoHideTimerRef.current) {
            clearTimeout(autoHideTimerRef.current);
            autoHideTimerRef.current = null;
        }

        if (allDone) {
            // Remove parent frame global progress widget
            removeGlobalProgressWidget(allSuccess ? 2000 : 5000);

            // Desktop notification
            const notifyBody = cockpit.format(_("$0 of $1 files uploaded successfully"), doneCount, totalCount);
            const notifyTitle = allSuccess ? _("Upload complete") : _("Upload finished with errors");

            if (typeof Notification !== 'undefined') {
                if (Notification.permission === 'granted') {
                    new Notification(notifyTitle, { body: notifyBody });
                } else if (Notification.permission !== 'denied') {
                    Notification.requestPermission().then(perm => {
                        if (perm === 'granted') {
                            new Notification(notifyTitle, { body: notifyBody });
                        }
                    });
                }
            }

            // Auto-hide only when all succeeded
            if (allSuccess) {
                autoHideTimerRef.current = setTimeout(() => {
                    setVisible(false);
                    setDismissed(true);
                }, 3000);
            }
        }

        return () => {
            if (autoHideTimerRef.current) {
                clearTimeout(autoHideTimerRef.current);
            }
        };
    }, [allDone, allSuccess, doneCount, totalCount]);

    const handleClose = useCallback(() => {
        setVisible(false);
        setDismissed(true);
    }, []);

    const handleToggleMinimize = useCallback(() => {
        setMinimized(prev => !prev);
    }, []);

    const handleRetry = useCallback((fileId: string) => {
        // Re-add file for upload via manager (manager handles re-queuing)
        const file = state.files.find(f => f.id === fileId);
        if (file) {
            uploadManager.addFilesWithPaths([{ file: file.file, destPath: file.destPath }]);
        }
    }, [state.files]);

    if (!visible || !hasFiles) return null;

    // Minimized state
    if (minimized) {
        return (
            <div className="upload-panel upload-panel--minimized" onClick={handleToggleMinimize}>
                <UploadIcon className="upload-panel__icon" />
                {isUploading ? (
                    <span className="upload-panel__mini-text">
                        ↑ {percent}% &nbsp; {cockpit.format(_("$0/$1 files"), doneCount, totalCount)}
                    </span>
                ) : allSuccess ? (
                    <span className="upload-panel__mini-text">
                        <CheckCircleIcon className="upload-panel__status-icon--done" /> {_("Upload complete")}
                    </span>
                ) : (
                    <span className="upload-panel__mini-text">
                        {cockpit.format(_("$0/$1 files"), doneCount, totalCount)}
                        {errorCount > 0 && (
                            <> &middot; <ExclamationCircleIcon className="upload-panel__status-icon--error" /> {errorCount}</>
                        )}
                    </span>
                )}
                <Button variant="plain" size="sm" aria-label={_("Expand")} onClick={e => { e.stopPropagation(); handleToggleMinimize(); }}>
                    <WindowRestoreIcon />
                </Button>
            </div>
        );
    }

    // Expanded state
    return (
        <div className="upload-panel">
            {/* Header */}
            <div className="upload-panel__header">
                <span className="upload-panel__header-title">
                    <UploadIcon className="upload-panel__icon" />
                    {isUploading
                        ? cockpit.format(_("Uploading $0/$1 files"), doneCount, totalCount)
                        : allSuccess
                            ? _("Upload complete")
                            : cockpit.format(_("Uploaded $0/$1 files"), doneCount, totalCount)
                    }
                </span>
                <div className="upload-panel__header-actions">
                    <Button variant="plain" size="sm" aria-label={_("Minimize")} onClick={handleToggleMinimize}>
                        <WindowMinimizeIcon />
                    </Button>
                    <Button variant="plain" size="sm" aria-label={_("Close")} onClick={handleClose}>
                        <TimesIcon />
                    </Button>
                </div>
            </div>

            {/* File list */}
            <div className="upload-panel__file-list">
                {activeFiles.map(file => (
                    <UploadFileRow key={file.id} file={file} onRetry={handleRetry} />
                ))}
            </div>

            {/* Footer */}
            <div className="upload-panel__footer">
                <Progress
                    value={percent}
                    className="upload-panel__total-progress"
                    aria-label={_("Total upload progress")}
                />
                <div className="upload-panel__footer-info">
                    <span className="upload-panel__footer-size">
                        {formatProgress(state.uploadedBytes, state.totalBytes)}
                    </span>
                    {isUploading && (
                        <Button variant="link" size="sm" isDanger onClick={() => uploadManager.cancelAll()}>
                            {_("Cancel all")}
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
};

const UploadFileRow: React.FC<{ file: UploadFileInfo; onRetry: (id: string) => void }> = ({ file, onRetry }) => {
    const percent = file.size > 0 ? Math.round((file.uploadedBytes / file.size) * 100) : 0;

    return (
        <div className="upload-panel__file-row">
            <div className="upload-panel__file-info">
                <span className="upload-panel__file-name" title={file.name}>{file.name}</span>
                <span className="upload-panel__file-status">
                    {file.status === 'uploading' && <span className="upload-panel__percent">{percent}%</span>}
                    {file.status === 'done' && <CheckCircleIcon className="upload-panel__status-icon--done" />}
                    {file.status === 'error' && (
                        <Button variant="link" size="sm" isDanger onClick={() => onRetry(file.id)}>
                            <SyncAltIcon /> {_("Retry")}
                        </Button>
                    )}
                    {file.status === 'pending' && <span className="upload-panel__pending-text">{_("Pending")}</span>}
                </span>
            </div>
            {file.status === 'uploading' && (
                <Progress
                    value={percent}
                    className="upload-panel__file-progress"
                    aria-label={cockpit.format(_("Upload progress for $0"), file.name)}
                />
            )}
        </div>
    );
};
