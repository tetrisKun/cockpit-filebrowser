import React, { useState, useEffect, useCallback } from 'react';
import cockpit from 'cockpit';
import { Modal, ModalBody, ModalFooter, ModalHeader } from "@patternfly/react-core/dist/esm/components/Modal/index.js";
import { Button } from "@patternfly/react-core/dist/esm/components/Button/index.js";
import { TextInput } from "@patternfly/react-core/dist/esm/components/TextInput/index.js";
import { FormGroup } from "@patternfly/react-core/dist/esm/components/Form/index.js";
import { FormSelect, FormSelectOption } from "@patternfly/react-core/dist/esm/components/FormSelect/index.js";
import { archiveManager, getFormatExtension } from './archive-manager';
import type { ArchiveFormat } from './archive-manager';

const _ = cockpit.gettext;

export interface CompressDialogProps {
    isOpen: boolean;
    onClose: () => void;
    paths: string[];
    parentDir: string;
}

function getDefaultName(paths: string[]): string {
    if (paths.length === 1) {
        const name = paths[0].split('/').pop() || 'archive';
        // Remove known archive extensions (including compound ones like .tar.gz)
        const archiveSuffixes = ['.tar.gz', '.tar.bz2', '.tar.xz', '.tgz', '.tbz2', '.txz', '.tar', '.zip', '.7z', '.rar'];
        const lower = name.toLowerCase();
        for (const suffix of archiveSuffixes) {
            if (lower.endsWith(suffix)) {
                return name.substring(0, name.length - suffix.length) || 'archive';
            }
        }
        // Fallback: remove last extension
        const dotIdx = name.lastIndexOf('.');
        return dotIdx > 0 ? name.substring(0, dotIdx) : name;
    }
    return 'archive';
}

export const CompressDialog: React.FC<CompressDialogProps> = ({ isOpen, onClose, paths, parentDir }) => {
    const [formats, setFormats] = useState<ArchiveFormat[]>([]);
    const [selectedFormat, setSelectedFormat] = useState<ArchiveFormat>('tar.gz');
    const [baseName, setBaseName] = useState('');

    useEffect(() => {
        if (isOpen) {
            const available = archiveManager.getCompressFormats();
            setFormats(available);
            if (available.length > 0 && !available.includes(selectedFormat)) {
                setSelectedFormat(available[0]);
            }
            setBaseName(getDefaultName(paths));
        }
    }, [isOpen, paths]);

    const outputFilename = baseName + getFormatExtension(selectedFormat);
    const outputPath = parentDir + '/' + outputFilename;

    const handleFormatChange = useCallback((_event: React.FormEvent<HTMLSelectElement>, value: string) => {
        setSelectedFormat(value as ArchiveFormat);
    }, []);

    const handleCompress = useCallback(() => {
        archiveManager.compress(paths, selectedFormat, outputPath, parentDir);
        onClose();
    }, [paths, selectedFormat, outputPath, parentDir, onClose]);

    if (formats.length === 0 && isOpen) {
        return null;
    }

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            variant="small"
        >
            <ModalHeader title={_("Compress")} />
            <ModalBody>
                <FormGroup label={_("File name")} fieldId="compress-name" style={{ marginBottom: '1rem' }}>
                    <TextInput
                        id="compress-name"
                        value={baseName}
                        onChange={(_event, value) => setBaseName(value)}
                        aria-label={_("Archive file name")}
                    />
                </FormGroup>
                <FormGroup label={_("Format")} fieldId="compress-format">
                    <FormSelect
                        id="compress-format"
                        value={selectedFormat}
                        onChange={handleFormatChange}
                        aria-label={_("Archive format")}
                    >
                        {formats.map(f => (
                            <FormSelectOption key={f} value={f} label={getFormatExtension(f)} />
                        ))}
                    </FormSelect>
                </FormGroup>
                <p style={{ marginTop: '1rem', fontSize: '13px', color: 'var(--pf-t--global--text--color--subtle, #6a6e73)' }}>
                    {cockpit.format(_("Output: $0"), outputFilename)}
                </p>
            </ModalBody>
            <ModalFooter>
                <Button variant="primary" onClick={handleCompress} isDisabled={!baseName.trim()}>
                    {_("Compress")}
                </Button>
                <Button variant="link" onClick={onClose}>
                    {_("Cancel")}
                </Button>
            </ModalFooter>
        </Modal>
    );
};
