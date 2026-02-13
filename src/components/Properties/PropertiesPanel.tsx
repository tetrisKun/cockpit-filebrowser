import React, { useState, useEffect, useCallback } from 'react';
import cockpit from 'cockpit';
import {
    DrawerHead,
    DrawerActions,
    DrawerCloseButton,
    DrawerPanelBody,
} from "@patternfly/react-core/dist/esm/components/Drawer/index.js";
import {
    DescriptionList,
    DescriptionListGroup,
    DescriptionListTerm,
    DescriptionListDescription,
} from "@patternfly/react-core/dist/esm/components/DescriptionList/index.js";
import { TextInput } from "@patternfly/react-core/dist/esm/components/TextInput/index.js";
import { Button } from "@patternfly/react-core/dist/esm/components/Button/index.js";
import { Spinner } from "@patternfly/react-core/dist/esm/components/Spinner/index.js";
import { Alert } from "@patternfly/react-core/dist/esm/components/Alert/index.js";
import { Divider } from "@patternfly/react-core/dist/esm/components/Divider/index.js";
import { Content, ContentVariants } from "@patternfly/react-core/dist/esm/components/Content/index.js";
import { useFileBrowser } from '../../store/FileBrowserContext';
import { stat as fsStat, chown as fsChown } from '../../api/cockpit-fs';
import { FileStats } from '../../api/types';
import { PermissionEditor } from './PermissionEditor';
import './properties.scss';

const _ = cockpit.gettext;

interface PropertiesPanelProps {
    path: string;
}

function formatSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    const value = bytes / Math.pow(1024, i);
    return `${value.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function formatDate(isoDate: string): string {
    if (!isoDate) return '-';
    try {
        return new Date(isoDate).toLocaleString();
    } catch {
        return isoDate;
    }
}

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({ path }) => {
    const { dispatch } = useFileBrowser();
    const [stats, setStats] = useState<FileStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Editable owner/group
    const [editOwner, setEditOwner] = useState('');
    const [editGroup, setEditGroup] = useState('');
    const [ownerApplying, setOwnerApplying] = useState(false);
    const [ownerError, setOwnerError] = useState<string | null>(null);
    const [ownerSuccess, setOwnerSuccess] = useState(false);

    const loadStats = useCallback(() => {
        setLoading(true);
        setError(null);
        fsStat(path)
            .then((s) => {
                setStats(s);
                setEditOwner(s.owner);
                setEditGroup(s.group);
                setLoading(false);
            })
            .catch((err) => {
                setError(err?.message || String(err));
                setLoading(false);
            });
    }, [path]);

    useEffect(() => {
        loadStats();
    }, [loadStats]);

    const handleClose = useCallback(() => {
        dispatch({ type: 'CLOSE_PROPERTIES' });
    }, [dispatch]);

    const handleApplyOwnership = useCallback(async () => {
        setOwnerApplying(true);
        setOwnerError(null);
        setOwnerSuccess(false);
        try {
            await fsChown(path, editOwner, editGroup);
            setOwnerSuccess(true);
            // Re-stat to confirm
            loadStats();
        } catch (err: any) {
            setOwnerError(err?.message || String(err));
        } finally {
            setOwnerApplying(false);
        }
    }, [path, editOwner, editGroup, loadStats]);

    const handlePermissionsApplied = useCallback(() => {
        loadStats();
    }, [loadStats]);

    if (loading) {
        return (
            <>
                <DrawerHead>
                    <Content component={ContentVariants.h3}>{_("Properties")}</Content>
                    <DrawerActions>
                        <DrawerCloseButton onClick={handleClose} />
                    </DrawerActions>
                </DrawerHead>
                <DrawerPanelBody>
                    <div className="properties-panel__loading">
                        <Spinner size="lg" />
                    </div>
                </DrawerPanelBody>
            </>
        );
    }

    if (error || !stats) {
        return (
            <>
                <DrawerHead>
                    <Content component={ContentVariants.h3}>{_("Properties")}</Content>
                    <DrawerActions>
                        <DrawerCloseButton onClick={handleClose} />
                    </DrawerActions>
                </DrawerHead>
                <DrawerPanelBody>
                    <Alert variant="danger" title={_("Failed to load properties")} isInline>
                        {error}
                    </Alert>
                </DrawerPanelBody>
            </>
        );
    }

    return (
        <>
            <DrawerHead>
                <Content component={ContentVariants.h3}>
                    {stats.name}
                </Content>
                <DrawerActions>
                    <DrawerCloseButton onClick={handleClose} />
                </DrawerActions>
            </DrawerHead>
            <DrawerPanelBody>
                <div className="properties-panel__content">
                    <DescriptionList isCompact>
                        <DescriptionListGroup>
                            <DescriptionListTerm>{_("Name")}</DescriptionListTerm>
                            <DescriptionListDescription>{stats.name}</DescriptionListDescription>
                        </DescriptionListGroup>

                        <DescriptionListGroup>
                            <DescriptionListTerm>{_("Full Path")}</DescriptionListTerm>
                            <DescriptionListDescription className="properties-panel__path">
                                {stats.path}
                            </DescriptionListDescription>
                        </DescriptionListGroup>

                        <DescriptionListGroup>
                            <DescriptionListTerm>{_("Type")}</DescriptionListTerm>
                            <DescriptionListDescription>{stats.type}</DescriptionListDescription>
                        </DescriptionListGroup>

                        <DescriptionListGroup>
                            <DescriptionListTerm>{_("Size")}</DescriptionListTerm>
                            <DescriptionListDescription>
                                {formatSize(stats.size)} ({stats.size.toLocaleString()} {_("bytes")})
                            </DescriptionListDescription>
                        </DescriptionListGroup>

                        <DescriptionListGroup>
                            <DescriptionListTerm>{_("Modified")}</DescriptionListTerm>
                            <DescriptionListDescription>{formatDate(stats.modified)}</DescriptionListDescription>
                        </DescriptionListGroup>

                        <DescriptionListGroup>
                            <DescriptionListTerm>{_("Accessed")}</DescriptionListTerm>
                            <DescriptionListDescription>{formatDate(stats.accessed)}</DescriptionListDescription>
                        </DescriptionListGroup>

                        <DescriptionListGroup>
                            <DescriptionListTerm>{_("Created")}</DescriptionListTerm>
                            <DescriptionListDescription>{formatDate(stats.created)}</DescriptionListDescription>
                        </DescriptionListGroup>

                        {/* Editable Owner */}
                        <DescriptionListGroup>
                            <DescriptionListTerm>{_("Owner")}</DescriptionListTerm>
                            <DescriptionListDescription>
                                <div className="properties-panel__editable-field">
                                    <TextInput
                                        value={editOwner}
                                        onChange={(_event, val) => {
                                            setEditOwner(val);
                                            setOwnerSuccess(false);
                                            setOwnerError(null);
                                        }}
                                        aria-label={_("Owner")}
                                        style={{ width: '120px' }}
                                    />
                                </div>
                            </DescriptionListDescription>
                        </DescriptionListGroup>

                        {/* Editable Group */}
                        <DescriptionListGroup>
                            <DescriptionListTerm>{_("Group")}</DescriptionListTerm>
                            <DescriptionListDescription>
                                <div className="properties-panel__editable-field">
                                    <TextInput
                                        value={editGroup}
                                        onChange={(_event, val) => {
                                            setEditGroup(val);
                                            setOwnerSuccess(false);
                                            setOwnerError(null);
                                        }}
                                        aria-label={_("Group")}
                                        style={{ width: '120px' }}
                                    />
                                </div>
                            </DescriptionListDescription>
                        </DescriptionListGroup>
                    </DescriptionList>

                    <div className="properties-panel__ownership-apply">
                        <Button
                            variant="secondary"
                            onClick={handleApplyOwnership}
                            isDisabled={ownerApplying || (editOwner === stats.owner && editGroup === stats.group)}
                            isLoading={ownerApplying}
                            size="sm"
                        >
                            {_("Apply Ownership")}
                        </Button>
                        {ownerSuccess && (
                            <Alert variant="success" title={_("Ownership updated")} isInline isPlain />
                        )}
                        {ownerError && (
                            <Alert variant="danger" title={_("Failed to update ownership")} isInline isPlain>
                                {ownerError}
                            </Alert>
                        )}
                    </div>

                    {stats.linkTarget && (
                        <>
                            <Divider />
                            <DescriptionList isCompact>
                                <DescriptionListGroup>
                                    <DescriptionListTerm>{_("Link Target")}</DescriptionListTerm>
                                    <DescriptionListDescription>{stats.linkTarget}</DescriptionListDescription>
                                </DescriptionListGroup>
                            </DescriptionList>
                        </>
                    )}

                    <Divider />

                    <Content component={ContentVariants.h4}>{_("Permissions")}</Content>
                    <PermissionEditor
                        path={path}
                        initialMode={stats.modeOctal}
                        onApplied={handlePermissionsApplied}
                    />
                </div>
            </DrawerPanelBody>
        </>
    );
};
