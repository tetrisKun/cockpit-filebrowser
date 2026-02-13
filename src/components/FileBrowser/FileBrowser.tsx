import React from 'react';
import cockpit from 'cockpit';
import { Spinner } from "@patternfly/react-core/dist/esm/components/Spinner/index.js";
import { Alert } from "@patternfly/react-core/dist/esm/components/Alert/index.js";
import { useFileBrowser } from '../../store/FileBrowserContext';
import { FileTable } from './FileTable';
import './file-browser.scss';

const _ = cockpit.gettext;

export const FileBrowser: React.FC = () => {
    const { state } = useFileBrowser();

    if (state.loading) {
        return (
            <div className="file-browser file-browser--loading">
                <Spinner aria-label={_("Loading")} />
            </div>
        );
    }

    if (state.error) {
        return (
            <div className="file-browser file-browser--error">
                <Alert variant="danger" title={_("Error loading directory")}>
                    {state.error}
                </Alert>
            </div>
        );
    }

    return (
        <div className="file-browser">
            {state.viewMode === 'table' && <FileTable />}
            {state.viewMode === 'grid' && (
                <div className="file-browser--grid-placeholder">
                    {_("Grid view coming soon")}
                </div>
            )}
        </div>
    );
};
