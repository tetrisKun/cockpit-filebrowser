import React, { useState, useCallback, useEffect } from 'react';
import cockpit from 'cockpit';
import { Modal, ModalBody, ModalFooter, ModalHeader } from "@patternfly/react-core/dist/esm/components/Modal/index.js";
import { Button } from "@patternfly/react-core/dist/esm/components/Button/index.js";
import { TextInput } from "@patternfly/react-core/dist/esm/components/TextInput/index.js";
import { FormGroup } from "@patternfly/react-core/dist/esm/components/Form/index.js";
import { HelperText, HelperTextItem } from "@patternfly/react-core/dist/esm/components/HelperText/index.js";
import { FileEntry } from '../../api/types';
import { useFileBrowser } from '../../store/FileBrowserContext';
import * as fs from '../../api/cockpit-fs';

const _ = cockpit.gettext;

interface RenameDialogProps {
    entry: FileEntry;
    isOpen: boolean;
    onClose: () => void;
}

export const RenameDialog: React.FC<RenameDialogProps> = ({ entry, isOpen, onClose }) => {
    const { refresh } = useFileBrowser();
    const [newName, setNewName] = useState(entry.name);
    const [error, setError] = useState<string | null>(null);
    const [isRenaming, setIsRenaming] = useState(false);

    // Reset name when entry changes
    useEffect(() => {
        setNewName(entry.name);
        setError(null);
    }, [entry.name]);

    const validate = (): string | null => {
        if (!newName.trim()) {
            return _("Name cannot be empty");
        }
        if (newName.includes('/')) {
            return _("Name cannot contain '/'");
        }
        return null;
    };

    const handleSubmit = useCallback(async () => {
        const validationError = validate();
        if (validationError) {
            setError(validationError);
            return;
        }

        if (newName.trim() === entry.name) {
            handleClose();
            return;
        }

        setIsRenaming(true);
        setError(null);

        try {
            await fs.rename(entry.path, newName.trim());
            refresh();
            handleClose();
        } catch (err: any) {
            setError(err?.message || String(err));
        } finally {
            setIsRenaming(false);
        }
    }, [newName, entry.path, entry.name, refresh]);

    const handleClose = useCallback(() => {
        setNewName(entry.name);
        setError(null);
        setIsRenaming(false);
        onClose();
    }, [entry.name, onClose]);

    const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
        if (event.key === 'Enter') {
            handleSubmit();
        }
    }, [handleSubmit]);

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            variant="small"
        >
            <ModalHeader title={_("Rename")} />
            <ModalBody>
                <FormGroup label={_("New name")} isRequired fieldId="rename-name">
                    <TextInput
                        id="rename-name"
                        value={newName}
                        onChange={(_event, value) => { setNewName(value); setError(null); }}
                        onKeyDown={handleKeyDown}
                        isRequired
                    />
                </FormGroup>

                {error && (
                    <HelperText style={{ marginTop: '0.5rem' }}>
                        <HelperTextItem variant="error">{error}</HelperTextItem>
                    </HelperText>
                )}
            </ModalBody>
            <ModalFooter>
                <Button
                    variant="primary"
                    onClick={handleSubmit}
                    isDisabled={isRenaming}
                    isLoading={isRenaming}
                >
                    {_("OK")}
                </Button>
                <Button variant="link" onClick={handleClose}>
                    {_("Cancel")}
                </Button>
            </ModalFooter>
        </Modal>
    );
};
