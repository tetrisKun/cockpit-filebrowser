import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Page, PageSection, PageSidebar, PageSidebarBody } from "@patternfly/react-core/dist/esm/components/Page/index.js";
import { Modal, ModalBody, ModalHeader } from "@patternfly/react-core/dist/esm/components/Modal/index.js";
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
import './app.scss';

const _ = cockpit.gettext;

const SIDEBAR_BREAKPOINT = 1230;

const AppContent: React.FC = () => {
    const { state } = useFileBrowser();
    const [searchOpen, setSearchOpen] = useState(false);
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
