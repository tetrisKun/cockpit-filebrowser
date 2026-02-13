import React, { useState, useCallback } from 'react';
import cockpit from 'cockpit';
import { Modal, ModalBody, ModalFooter, ModalHeader } from "@patternfly/react-core/dist/esm/components/Modal/index.js";
import { Button } from "@patternfly/react-core/dist/esm/components/Button/index.js";
import { TextInput } from "@patternfly/react-core/dist/esm/components/TextInput/index.js";
import { FormGroup } from "@patternfly/react-core/dist/esm/components/Form/index.js";
import { HelperText, HelperTextItem } from "@patternfly/react-core/dist/esm/components/HelperText/index.js";
import { useFileBrowser } from '../../store/FileBrowserContext';
import * as fs from '../../api/cockpit-fs';

const _ = cockpit.gettext;

interface CreateDialogProps {
    type: 'file' | 'directory' | 'link';
    isOpen: boolean;
    onClose: () => void;
}

export const CreateDialog: React.FC<CreateDialogProps> = ({ type, isOpen, onClose }) => {
    const { state, refresh } = useFileBrowser();
    const [name, setName] = useState('');
    const [linkTarget, setLinkTarget] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const titleMap: Record<string, string> = {
        file: _("New File"),
        directory: _("New Directory"),
        link: _("New Symbolic Link"),
    };

    const validate = (): string | null => {
        if (!name.trim()) {
            return _("Name cannot be empty");
        }
        if (name.includes('/')) {
            return _("Name cannot contain '/'");
        }
        if (type === 'link' && !linkTarget.trim()) {
            return _("Target path cannot be empty");
        }
        return null;
    };

    const handleSubmit = useCallback(async () => {
        const validationError = validate();
        if (validationError) {
            setError(validationError);
            return;
        }

        setIsSubmitting(true);
        setError(null);

        const fullPath = state.currentPath + '/' + name.trim();

        try {
            switch (type) {
                case 'file':
                    await fs.createFile(fullPath);
                    break;
                case 'directory':
                    await fs.createDirectory(fullPath);
                    break;
                case 'link':
                    await fs.createSymlink(linkTarget.trim(), fullPath);
                    break;
            }
            refresh();
            handleClose();
        } catch (err: any) {
            setError(err?.message || String(err));
        } finally {
            setIsSubmitting(false);
        }
    }, [name, linkTarget, type, state.currentPath, refresh]);

    const handleClose = useCallback(() => {
        setName('');
        setLinkTarget('');
        setError(null);
        setIsSubmitting(false);
        onClose();
    }, [onClose]);

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
            <ModalHeader title={titleMap[type]} />
            <ModalBody>
                <FormGroup label={_("Name")} isRequired fieldId="create-name">
                    <TextInput
                        id="create-name"
                        value={name}
                        onChange={(_event, value) => { setName(value); setError(null); }}
                        onKeyDown={handleKeyDown}
                        isRequired
                        placeholder={type === 'file' ? _("filename.txt") : type === 'directory' ? _("new-folder") : _("link-name")}
                    />
                </FormGroup>

                {type === 'link' && (
                    <FormGroup label={_("Target path")} isRequired fieldId="create-link-target" style={{ marginTop: '1rem' }}>
                        <TextInput
                            id="create-link-target"
                            value={linkTarget}
                            onChange={(_event, value) => { setLinkTarget(value); setError(null); }}
                            onKeyDown={handleKeyDown}
                            isRequired
                            placeholder={_("/path/to/target")}
                        />
                    </FormGroup>
                )}

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
                    isDisabled={isSubmitting}
                    isLoading={isSubmitting}
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
