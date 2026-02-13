import React from 'react';
import { Page, PageSection } from "@patternfly/react-core/dist/esm/components/Page/index.js";
import { FileBrowserProvider } from './store/FileBrowserContext';
import { Toolbar } from './components/Toolbar/Toolbar';
import { FileBrowser } from './components/FileBrowser/FileBrowser';

export const Application = () => {
    return (
        <FileBrowserProvider>
            <Page>
                <PageSection variant="secondary" padding={{ default: 'noPadding' }}>
                    <Toolbar />
                </PageSection>
                <PageSection isFilled>
                    <FileBrowser />
                </PageSection>
            </Page>
        </FileBrowserProvider>
    );
};
