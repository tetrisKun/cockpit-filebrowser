import React, { useState, useEffect, useCallback } from 'react';
import cockpit from 'cockpit';
import { Button } from "@patternfly/react-core/dist/esm/components/Button/index.js";
import { TextInput } from "@patternfly/react-core/dist/esm/components/TextInput/index.js";
import { Alert } from "@patternfly/react-core/dist/esm/components/Alert/index.js";
import { Checkbox } from "@patternfly/react-core/dist/esm/components/Checkbox/index.js";
import * as fs from '../../api/cockpit-fs';
import './properties.scss';

const _ = cockpit.gettext;

interface PermissionEditorProps {
    path: string;
    initialMode: string; // octal like "755"
    onApplied?: () => void;
}

/**
 * Convert an octal string like "755" to a 3x3 boolean array.
 * Returns [owner[r,w,x], group[r,w,x], other[r,w,x]].
 */
export function octalToPermissions(octal: string): boolean[][] {
    // Ensure we have exactly 3 digits (ignore setuid/setgid/sticky prefix)
    const digits = octal.length > 3 ? octal.slice(-3) : octal.padStart(3, '0');

    return digits.split('').map(digit => {
        const val = parseInt(digit, 10) || 0;
        return [
            (val & 4) !== 0, // read
            (val & 2) !== 0, // write
            (val & 1) !== 0, // execute
        ];
    });
}

/**
 * Convert a 3x3 boolean array to octal string like "755".
 */
export function permissionsToOctal(perms: boolean[][]): string {
    return perms.map(triple => {
        let val = 0;
        if (triple[0]) val += 4; // read
        if (triple[1]) val += 2; // write
        if (triple[2]) val += 1; // execute
        return val.toString();
    }).join('');
}

const ROW_LABELS = [_("Owner"), _("Group"), _("Other")];
const COL_LABELS = [_("Read"), _("Write"), _("Execute")];

export const PermissionEditor: React.FC<PermissionEditorProps> = ({
    path,
    initialMode,
    onApplied,
}) => {
    const [perms, setPerms] = useState<boolean[][]>(() => octalToPermissions(initialMode));
    const [octalInput, setOctalInput] = useState(initialMode);
    const [applying, setApplying] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    // Sync when initialMode changes (e.g., from re-stat)
    useEffect(() => {
        setPerms(octalToPermissions(initialMode));
        setOctalInput(initialMode);
    }, [initialMode]);

    const handleCheckboxChange = useCallback((row: number, col: number, checked: boolean) => {
        setPerms(prev => {
            const next = prev.map(r => [...r]);
            next[row][col] = checked;
            setOctalInput(permissionsToOctal(next));
            return next;
        });
        setSuccess(false);
        setError(null);
    }, []);

    const handleOctalChange = useCallback((_event: React.FormEvent<HTMLInputElement>, value: string) => {
        // Only allow digits 0-7
        const cleaned = value.replace(/[^0-7]/g, '').slice(0, 4);
        setOctalInput(cleaned);
        if (cleaned.length >= 3) {
            setPerms(octalToPermissions(cleaned));
        }
        setSuccess(false);
        setError(null);
    }, []);

    const handleApply = useCallback(async () => {
        setApplying(true);
        setError(null);
        setSuccess(false);
        try {
            await fs.chmod(path, octalInput);
            setSuccess(true);
            if (onApplied) onApplied();
        } catch (err: any) {
            setError(err?.message || String(err));
        } finally {
            setApplying(false);
        }
    }, [path, octalInput, onApplied]);

    return (
        <div className="permission-editor">
            <div className="permission-editor__grid">
                {/* Header row */}
                <div className="permission-editor__grid-cell permission-editor__grid-header" />
                {COL_LABELS.map((label, ci) => (
                    <div key={ci} className="permission-editor__grid-cell permission-editor__grid-header">
                        {label}
                    </div>
                ))}

                {/* Permission rows */}
                {ROW_LABELS.map((label, ri) => (
                    <React.Fragment key={ri}>
                        <div className="permission-editor__grid-cell permission-editor__grid-label">
                            {label}
                        </div>
                        {[0, 1, 2].map(ci => (
                            <div key={ci} className="permission-editor__grid-cell">
                                <Checkbox
                                    id={`perm-${ri}-${ci}`}
                                    isChecked={perms[ri]?.[ci] ?? false}
                                    onChange={(_event, checked) => handleCheckboxChange(ri, ci, checked)}
                                    aria-label={`${label} ${COL_LABELS[ci]}`}
                                />
                            </div>
                        ))}
                    </React.Fragment>
                ))}
            </div>

            <div className="permission-editor__octal">
                <TextInput
                    value={octalInput}
                    onChange={handleOctalChange}
                    aria-label={_("Octal permissions")}
                    placeholder="755"
                    style={{ width: '80px', fontFamily: 'monospace' }}
                />
                <Button
                    variant="primary"
                    onClick={handleApply}
                    isDisabled={applying || octalInput.length < 3}
                    isLoading={applying}
                    size="sm"
                >
                    {_("Apply")}
                </Button>
            </div>

            {success && (
                <Alert variant="success" title={_("Permissions updated")} isInline isPlain />
            )}
            {error && (
                <Alert variant="danger" title={_("Failed to update permissions")} isInline isPlain>
                    {error}
                </Alert>
            )}
        </div>
    );
};
