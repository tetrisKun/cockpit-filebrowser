import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Page, PageSection, PageSidebar, PageSidebarBody } from "@patternfly/react-core/dist/esm/components/Page/index.js";
import { Modal, ModalBody, ModalHeader } from "@patternfly/react-core/dist/esm/components/Modal/index.js";
import { Button } from "@patternfly/react-core/dist/esm/components/Button/index.js";
import { WindowMinimizeIcon } from "@patternfly/react-icons/dist/esm/icons/window-minimize-icon.js";
import { TimesIcon } from "@patternfly/react-icons/dist/esm/icons/times-icon.js";
import { TerminalIcon } from "@patternfly/react-icons/dist/esm/icons/terminal-icon.js";

interface TerminalInstance {
    id: number;
    path: string;
}
import {
    Drawer,
    DrawerContent,
    DrawerContentBody,
    DrawerPanelContent,
} from "@patternfly/react-core/dist/esm/components/Drawer/index.js";
import cockpit from 'cockpit';
import { FileBrowserProvider, useFileBrowser } from './store/FileBrowserContext';
import { Toolbar } from './components/Toolbar/Toolbar';
import { FileBrowser } from './components/FileBrowser/FileBrowser';
import { Sidebar } from './components/Sidebar/Sidebar';
import { FileEditor } from './components/FileEditor/FileEditor';
import { PropertiesPanel } from './components/Properties/PropertiesPanel';
import { SearchPanel } from './components/Search/SearchPanel';
import { UploadPanel } from './components/Upload/UploadPanel';
import { ArchivePanel } from './components/Archive/ArchivePanel';
import './app.scss';

const _ = cockpit.gettext;

const SIDEBAR_BREAKPOINT = 1230;

const AppContent: React.FC = () => {
    const { state } = useFileBrowser();
    const [searchOpen, setSearchOpen] = useState(false);
    const [terminals, setTerminals] = useState<TerminalInstance[]>([]);
    const [activeTerminalId, setActiveTerminalId] = useState<number | null>(null);
    const nextTerminalIdRef = useRef(1);
    const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= SIDEBAR_BREAKPOINT);
    const sidebarRef = useRef<HTMLDivElement>(null);

    const [isAboveBreakpoint, setIsAboveBreakpoint] = useState(() => window.innerWidth >= SIDEBAR_BREAKPOINT);

    // Auto-close/open sidebar on resize; force open above breakpoint
    useEffect(() => {
        const mql = window.matchMedia(`(min-width: ${SIDEBAR_BREAKPOINT}px)`);
        const handler = (e: MediaQueryListEvent) => {
            setIsAboveBreakpoint(e.matches);
            setSidebarOpen(e.matches);
        };
        mql.addEventListener('change', handler);
        return () => mql.removeEventListener('change', handler);
    }, []);

    // Click outside sidebar to close (only when below breakpoint)
    useEffect(() => {
        if (!sidebarOpen || window.innerWidth >= SIDEBAR_BREAKPOINT) return;

        const handleClickOutside = (event: MouseEvent) => {
            const sidebarEl = document.querySelector('.pf-v6-c-page__sidebar');
            if (sidebarEl && !sidebarEl.contains(event.target as Node)) {
                setSidebarOpen(false);
            }
        };

        const timer = setTimeout(() => {
            document.addEventListener('mousedown', handleClickOutside);
        }, 0);

        return () => {
            clearTimeout(timer);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [sidebarOpen]);

    const handleToggleSidebar = useCallback(() => {
        setSidebarOpen(prev => !prev);
    }, []);

    const handleSidebarNavigate = useCallback(() => {
        // Auto-close sidebar after clicking a nav item (only below breakpoint)
        if (window.innerWidth < SIDEBAR_BREAKPOINT) {
            setSidebarOpen(false);
        }
    }, []);

    const handleSearchOpen = useCallback(() => {
        setSearchOpen(true);
    }, []);

    const handleCloseSearch = useCallback(() => {
        setSearchOpen(false);
    }, []);

    const handleTerminalOpen = useCallback(() => {
        const id = nextTerminalIdRef.current++;
        const newTerminal: TerminalInstance = { id, path: state.currentPath };
        setTerminals(prev => [...prev, newTerminal]);
        setActiveTerminalId(id);
    }, [state.currentPath]);

    const handleMinimizeTerminal = useCallback(() => {
        setActiveTerminalId(null);
    }, []);

    const handleRestoreTerminal = useCallback((id: number) => {
        setActiveTerminalId(id);
    }, []);

    const handleCloseTerminal = useCallback((id: number) => {
        setTerminals(prev => prev.filter(t => t.id !== id));
        setActiveTerminalId(prev => prev === id ? null : prev);
    }, []);

    const handleTerminalIframeLoad = useCallback((path: string) => (e: React.SyntheticEvent<HTMLIFrameElement>) => {
        const iframe = e.currentTarget;
        if (!path || path === '/') return;

        // Wait for xterm.js to initialize, then send cd command via paste event
        setTimeout(() => {
            try {
                const doc = iframe.contentDocument || iframe.contentWindow?.document;
                if (!doc) return;
                const textarea = doc.querySelector('.xterm-helper-textarea') as HTMLTextAreaElement;
                if (!textarea) return;
                textarea.focus();
                const dt = new DataTransfer();
                dt.setData('text/plain', `cd ${path}`);
                textarea.dispatchEvent(new ClipboardEvent('paste', {
                    clipboardData: dt,
                    bubbles: true,
                    cancelable: true,
                }));
                // Send Enter key separately — \r in paste data doesn't trigger execution
                setTimeout(() => {
                    textarea.dispatchEvent(new KeyboardEvent('keydown', {
                        key: 'Enter', code: 'Enter', keyCode: 13, which: 13,
                        bubbles: true, cancelable: true,
                    }));
                }, 50);
            } catch (_) {
                // Cross-origin or other error — silently ignore
            }
        }, 800);
    }, []);

    const isPropertiesOpen = state.propertiesOpen && state.propertiesFile !== null;

    const panelContent = (
        <DrawerPanelContent widths={{ default: 'width_33' }} minSize="320px" className="properties-drawer-panel">
            {isPropertiesOpen && state.propertiesFile && (
                <PropertiesPanel path={state.propertiesFile} />
            )}
        </DrawerPanelContent>
    );

    return (
        <>
            <Page
                sidebar={
                    <PageSidebar isSidebarOpen={isAboveBreakpoint || sidebarOpen}>
                        <PageSidebarBody>
                            <Sidebar onNavigate={handleSidebarNavigate} />
                        </PageSidebarBody>
                    </PageSidebar>
                }
            >
                <PageSection variant="secondary" padding={{ default: 'noPadding' }} className="toolbar-section">
                    <Toolbar
                        onSearchOpen={handleSearchOpen}
                        onTerminalOpen={handleTerminalOpen}
                        sidebarOpen={sidebarOpen}
                        onToggleSidebar={handleToggleSidebar}
                        showSidebarToggle={!isAboveBreakpoint}
                    />
                </PageSection>
                <PageSection isFilled className="main-content-section">
                    <Drawer isExpanded={isPropertiesOpen} position="end">
                        <DrawerContent panelContent={panelContent}>
                            <DrawerContentBody>
                                <FileBrowser />
                            </DrawerContentBody>
                        </DrawerContent>
                    </Drawer>
                </PageSection>
            </Page>
            {state.editorFile && (
                <FileEditor path={state.editorFile} />
            )}
            <Modal
                isOpen={searchOpen}
                onClose={handleCloseSearch}
                variant="large"
                aria-label={_("Search files")}
            >
                <ModalHeader title={_("Search files")} />
                <ModalBody>
                    <SearchPanel initialQuery="" onClose={handleCloseSearch} />
                </ModalBody>
            </Modal>
            {/* Backdrop — visible only when a terminal is active */}
            {activeTerminalId !== null && (
                <div className="terminal-overlay__backdrop" onClick={handleMinimizeTerminal} />
            )}
            {/* Persistent terminal panel — stays in DOM as long as terminals exist */}
            {terminals.length > 0 && (
                <div className="terminal-overlay__panel" style={{ display: activeTerminalId !== null ? 'flex' : 'none' }}>
                    {terminals.map(t => (
                        <div key={t.id} className="terminal-overlay__instance" style={{ display: t.id === activeTerminalId ? 'flex' : 'none' }}>
                            <div className="terminal-modal-header">
                                <span className="terminal-modal-header__title">
                                    <TerminalIcon /> {_("Terminal")} - {t.path}
                                </span>
                                <div className="terminal-modal-header__actions">
                                    <Button variant="plain" onClick={handleMinimizeTerminal} aria-label={_("Minimize")} size="sm">
                                        <WindowMinimizeIcon />
                                    </Button>
                                    <Button variant="plain" onClick={() => handleCloseTerminal(t.id)} aria-label={_("Close")} size="sm">
                                        <TimesIcon />
                                    </Button>
                                </div>
                            </div>
                            <div className="terminal-modal-body">
                                <iframe
                                    src="/cockpit/@localhost/system/terminal.html"
                                    className="terminal-iframe"
                                    title={`${_("Terminal")} - ${t.path}`}
                                    onLoad={handleTerminalIframeLoad(t.path)}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            )}
            {/* Minimized bars for non-active terminals */}
            {terminals.filter(t => t.id !== activeTerminalId).length > 0 && (
                <div className="terminal-minimized-container">
                    {terminals.filter(t => t.id !== activeTerminalId).map(t => (
                        <div key={t.id} className="terminal-minimized-bar" onClick={() => handleRestoreTerminal(t.id)}>
                            <TerminalIcon /> {_("Terminal")} - {t.path}
                            <Button
                                variant="plain"
                                onClick={(e) => { e.stopPropagation(); handleCloseTerminal(t.id); }}
                                aria-label={_("Close")}
                                size="sm"
                                className="terminal-minimized-bar__close"
                            >
                                <TimesIcon />
                            </Button>
                        </div>
                    ))}
                </div>
            )}
            <UploadPanel />
            <ArchivePanel />
        </>
    );
};

export const Application = () => {
    return (
        <FileBrowserProvider>
            <AppContent />
        </FileBrowserProvider>
    );
};
