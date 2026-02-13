import React from 'react';
import { Page, PageSection, PageSidebar, PageSidebarBody } from "@patternfly/react-core/dist/esm/components/Page/index.js";
import {
    Drawer,
    DrawerContent,
    DrawerContentBody,
    DrawerPanelContent,
} from "@patternfly/react-core/dist/esm/components/Drawer/index.js";
import { FileBrowserProvider, useFileBrowser } from './store/FileBrowserContext';
import { Toolbar } from './components/Toolbar/Toolbar';
import { FileBrowser } from './components/FileBrowser/FileBrowser';
import { Sidebar } from './components/Sidebar/Sidebar';
import { FileEditor } from './components/FileEditor/FileEditor';
import { PropertiesPanel } from './components/Properties/PropertiesPanel';

const AppContent: React.FC = () => {
    const { state } = useFileBrowser();

    const isPropertiesOpen = state.propertiesOpen && state.propertiesFile !== null;

    const panelContent = (
        <DrawerPanelContent widths={{ default: 'width_33' }} minSize="320px">
            {isPropertiesOpen && state.propertiesFile && (
                <PropertiesPanel path={state.propertiesFile} />
            )}
        </DrawerPanelContent>
    );

    return (
        <>
            <Page
                sidebar={
                    <PageSidebar>
                        <PageSidebarBody>
                            <Sidebar />
                        </PageSidebarBody>
                    </PageSidebar>
                }
            >
                <PageSection variant="secondary" padding={{ default: 'noPadding' }}>
                    <Toolbar />
                </PageSection>
                <PageSection isFilled>
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
