import React from 'react';
import { Page, PageSection, PageSidebar, PageSidebarBody } from "@patternfly/react-core/dist/esm/components/Page/index.js";
import { FileBrowserProvider, useFileBrowser } from './store/FileBrowserContext';
import { Toolbar } from './components/Toolbar/Toolbar';
import { FileBrowser } from './components/FileBrowser/FileBrowser';
import { Sidebar } from './components/Sidebar/Sidebar';
import { FileEditor } from './components/FileEditor/FileEditor';

const AppContent: React.FC = () => {
    const { state } = useFileBrowser();

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
                    <FileBrowser />
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
