import React, { useState, useEffect, useRef, useCallback } from 'react';
import cockpit from 'cockpit';
import { Button } from "@patternfly/react-core/dist/esm/components/Button/index.js";
import { Progress } from "@patternfly/react-core/dist/esm/components/Progress/index.js";
import { TimesIcon } from "@patternfly/react-icons/dist/esm/icons/times-icon.js";
import { WindowMinimizeIcon } from "@patternfly/react-icons/dist/esm/icons/window-minimize-icon.js";
import { WindowRestoreIcon } from "@patternfly/react-icons/dist/esm/icons/window-restore-icon.js";
import { CheckCircleIcon } from "@patternfly/react-icons/dist/esm/icons/check-circle-icon.js";
import { ExclamationCircleIcon } from "@patternfly/react-icons/dist/esm/icons/exclamation-circle-icon.js";
import { CompressIcon } from "@patternfly/react-icons/dist/esm/icons/compress-icon.js";
import { archiveManager } from './archive-manager';
import type { ArchiveState, ArchiveOperation } from './archive-manager';
import './archive.scss';

const _ = cockpit.gettext;

const WIDGET_ID = 'filebrowser-archive-progress';

function createGlobalArchiveWidget(): boolean {
    try {
        const parentDoc = window.parent.document;
        if (!parentDoc || parentDoc === document) return false;
        if (parentDoc.getElementById(WIDGET_ID)) return true;

        const widget = parentDoc.createElement('div');
        widget.id = WIDGET_ID;
        Object.assign(widget.style, {
            position: 'fixed',
            bottom: '16px',
            right: '180px',
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

function isIframeVisible(): boolean {
    try {
        const frame = window.frameElement as HTMLElement;
        if (!frame) return true;
        return frame.offsetHeight > 0;
    } catch (_) {
        return true;
    }
}

function updateGlobalArchiveWidget(percent: number, opsDone: number, totalOps: number): void {
    try {
        const parentDoc = window.parent.document;
        const widget = parentDoc?.getElementById(WIDGET_ID);
        if (!widget) return;
        widget.textContent = `\u2699 ${percent}% \u00b7 ${opsDone}/${totalOps}`;
        widget.style.display = isIframeVisible() ? 'none' : 'flex';
    } catch (_) { /* ignore */ }
}

function removeGlobalArchiveWidget(delay = 3000): void {
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

function useArchiveState(): ArchiveState {
    const [state, setState] = useState<ArchiveState>(() => archiveManager.getState());

    useEffect(() => {
        const handler = () => setState(archiveManager.getState());
        archiveManager.on('state-changed', handler);
        return () => { archiveManager.off('state-changed', handler); };
    }, []);

    return state;
}

export const ArchivePanel: React.FC = () => {
    const state = useArchiveState();
    const [minimized, setMinimized] = useState(false);
    const [visible, setVisible] = useState(false);
    const [dismissed, setDismissed] = useState(false);
    const originalTitleRef = useRef(document.title);
    const autoHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const prevStatusRef = useRef(state.status);

    const isRunning = state.status === 'running';
    const hasOps = state.operations.length > 0;
    const activeOps = state.operations.filter(o => o.status !== 'cancelled');
    const doneCount = activeOps.filter(o => o.status === 'done').length;
    const errorCount = activeOps.filter(o => o.status === 'error').length;
    const totalCount = activeOps.length;
    const allDone = hasOps && !isRunning && totalCount > 0 && doneCount + errorCount === totalCount;
    const allSuccess = allDone && errorCount === 0;

    const totalProgress = totalCount > 0
        ? Math.round(activeOps.reduce((sum, o) => sum + o.progress, 0) / totalCount)
        : 0;

    useEffect(() => {
        if (isRunning && prevStatusRef.current !== 'running') {
            setVisible(true);
            setDismissed(false);
            setMinimized(false);
        }
        prevStatusRef.current = state.status;
    }, [isRunning, state.status]);

    useEffect(() => {
        if (hasOps && !dismissed) {
            setVisible(true);
        }
    }, [hasOps, dismissed]);

    useEffect(() => {
        if (isRunning) {
            document.title = `\u2699 ${totalProgress}% - ${originalTitleRef.current}`;
            createGlobalArchiveWidget();
            updateGlobalArchiveWidget(totalProgress, doneCount, totalCount);
        } else {
            document.title = originalTitleRef.current;
        }
        return () => {
            document.title = originalTitleRef.current;
        };
    }, [isRunning, totalProgress, doneCount, totalCount]);

    useEffect(() => {
        if (!isRunning) return;
        const frame = window.frameElement as HTMLElement | null;
        if (!frame) return;

        const observer = new MutationObserver(() => {
            updateGlobalArchiveWidget(totalProgress, doneCount, totalCount);
        });

        observer.observe(frame, { attributes: true, attributeFilter: ['style', 'class'] });
        if (frame.parentElement) {
            observer.observe(frame.parentElement, { attributes: true, attributeFilter: ['style', 'class', 'hidden'] });
        }

        return () => observer.disconnect();
    }, [isRunning, totalProgress, doneCount, totalCount]);

    useEffect(() => {
        if (autoHideTimerRef.current) {
            clearTimeout(autoHideTimerRef.current);
            autoHideTimerRef.current = null;
        }

        if (allDone) {
            removeGlobalArchiveWidget(allSuccess ? 2000 : 5000);

            const notifyBody = cockpit.format(_("$0 of $1 operations completed successfully"), doneCount, totalCount);
            const notifyTitle = allSuccess ? _("Archive operation complete") : _("Archive operation finished with errors");

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

    if (!visible || !hasOps) return null;

    if (minimized) {
        return (
            <div className="archive-panel archive-panel--minimized" onClick={handleToggleMinimize}>
                <CompressIcon className="archive-panel__icon" />
                {isRunning ? (
                    <span className="archive-panel__mini-text">
                        {`\u2699 ${totalProgress}%`} &nbsp; {cockpit.format(_("$0/$1 ops"), doneCount, totalCount)}
                    </span>
                ) : allSuccess ? (
                    <span className="archive-panel__mini-text">
                        <CheckCircleIcon className="archive-panel__status-icon--done" /> {_("Complete")}
                    </span>
                ) : (
                    <span className="archive-panel__mini-text">
                        {cockpit.format(_("$0/$1 ops"), doneCount, totalCount)}
                        {errorCount > 0 && (
                            <> &middot; <ExclamationCircleIcon className="archive-panel__status-icon--error" /> {errorCount}</>
                        )}
                    </span>
                )}
                <Button variant="plain" size="sm" aria-label={_("Expand")} onClick={e => { e.stopPropagation(); handleToggleMinimize(); }}>
                    <WindowRestoreIcon />
                </Button>
            </div>
        );
    }

    return (
        <div className="archive-panel">
            <div className="archive-panel__header">
                <span className="archive-panel__header-title">
                    <CompressIcon className="archive-panel__icon" />
                    {isRunning
                        ? cockpit.format(_("Processing $0/$1 operations"), doneCount, totalCount)
                        : allSuccess
                            ? _("Archive operation complete")
                            : cockpit.format(_("Processed $0/$1 operations"), doneCount, totalCount)
                    }
                </span>
                <div className="archive-panel__header-actions">
                    <Button variant="plain" size="sm" aria-label={_("Minimize")} onClick={handleToggleMinimize}>
                        <WindowMinimizeIcon />
                    </Button>
                    <Button variant="plain" size="sm" aria-label={_("Close")} onClick={handleClose}>
                        <TimesIcon />
                    </Button>
                </div>
            </div>

            <div className="archive-panel__file-list">
                {activeOps.map(op => (
                    <ArchiveOpRow key={op.id} op={op} />
                ))}
            </div>

            <div className="archive-panel__footer">
                <Progress
                    value={totalProgress}
                    className="archive-panel__total-progress"
                    aria-label={_("Total archive progress")}
                />
                <div className="archive-panel__footer-info">
                    <span className="archive-panel__footer-size">
                        {cockpit.format(_("$0/$1 items"),
                            activeOps.reduce((s, o) => s + o.processedItems, 0),
                            activeOps.reduce((s, o) => s + o.totalItems, 0)
                        )}
                    </span>
                    {isRunning && (
                        <Button variant="link" size="sm" isDanger onClick={() => archiveManager.cancelAll()}>
                            {_("Cancel all")}
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
};

const ArchiveOpRow: React.FC<{ op: ArchiveOperation }> = ({ op }) => {
    const typeLabel = op.type === 'compress' ? _("Compress") : _("Extract");

    return (
        <div className="archive-panel__file-row">
            <div className="archive-panel__file-info">
                <span className="archive-panel__file-name" title={`${typeLabel}: ${op.name}`}>
                    {typeLabel}: {op.name}
                </span>
                <span className="archive-panel__file-status">
                    {op.status === 'running' && <span className="archive-panel__percent">{op.progress}%</span>}
                    {op.status === 'done' && <CheckCircleIcon className="archive-panel__status-icon--done" />}
                    {op.status === 'error' && (
                        <ExclamationCircleIcon className="archive-panel__status-icon--error" />
                    )}
                    {op.status === 'pending' && <span className="archive-panel__pending-text">{_("Pending")}</span>}
                </span>
            </div>
            {op.status === 'running' && (
                <Progress
                    value={op.progress}
                    className="archive-panel__file-progress"
                    aria-label={cockpit.format(_("Progress for $0"), op.name)}
                />
            )}
        </div>
    );
};
