import React, { useState, useCallback } from 'react';
import cockpit from 'cockpit';
import { Modal, ModalBody, ModalFooter, ModalHeader } from "@patternfly/react-core/dist/esm/components/Modal/index.js";
import { Button } from "@patternfly/react-core/dist/esm/components/Button/index.js";
import { HelperText, HelperTextItem } from "@patternfly/react-core/dist/esm/components/HelperText/index.js";
import { ExclamationTriangleIcon } from "@patternfly/react-icons/dist/esm/icons/exclamation-triangle-icon.js";
import { FileEntry } from '../../api/types';
import { useFileBrowser } from '../../store/FileBrowserContext';
import * as fs from '../../api/cockpit-fs';

const _ = cockpit.gettext;

interface DeleteDialogProps {
    entry: FileEntry;
    isOpen: boolean;
    onClose: () => void;
}

export const DeleteDialog: React.FC<DeleteDialogProps> = ({ entry, isOpen, onClose }) => {
    const { refresh } = useFileBrowser();
    const [error, setError] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = useCallback(async () => {
        setIsDeleting(true);
        setError(null);

        try {
            await fs.deleteEntry(entry.path);
            refresh();
            handleClose();
        } catch (err: any) {
            setError(err?.message || String(err));
        } finally {
            setIsDeleting(false);
        }
    }, [entry.path, refresh]);

    const handleClose = useCallback(() => {
        setError(null);
        setIsDeleting(false);
        onClose();
    }, [onClose]);

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            variant="small"
        >
            <ModalHeader title={_("Delete")} />
            <ModalBody>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                    <ExclamationTriangleIcon
                        style={{ color: 'var(--pf-t--global--icon--color--status--warning--default, #f0ab00)', fontSize: '1.5rem', flexShrink: 0 }}
                    />
                    <div>
                        <p>
                            {_("Are you sure you want to delete")} <strong>{entry.name}</strong>?
                        </p>
                        {entry.type === 'directory' && (
                            <p style={{ marginTop: '0.5rem', color: 'var(--pf-t--global--text--color--subtle, #6a6e73)' }}>
                                {_("This will permanently delete the directory and all its contents.")}
                            </p>
                        )}
                    </div>
                </div>

                {error && (
                    <HelperText style={{ marginTop: '0.5rem' }}>
                        <HelperTextItem variant="error">{error}</HelperTextItem>
                    </HelperText>
                )}
            </ModalBody>
            <ModalFooter>
                <Button
                    variant="danger"
                    onClick={handleDelete}
                    isDisabled={isDeleting}
                    isLoading={isDeleting}
                >
                    {_("Delete")}
                </Button>
                <Button variant="link" onClick={handleClose}>
                    {_("Cancel")}
                </Button>
            </ModalFooter>
        </Modal>
    );
};
