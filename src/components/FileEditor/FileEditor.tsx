import React, { useEffect, useState, useCallback, useRef } from 'react';
import cockpit from 'cockpit';
import Editor, { OnMount } from '@monaco-editor/react';
import { Button } from "@patternfly/react-core/dist/esm/components/Button/index.js";
import { Spinner } from "@patternfly/react-core/dist/esm/components/Spinner/index.js";
import { Alert } from "@patternfly/react-core/dist/esm/components/Alert/index.js";
import { TimesIcon } from "@patternfly/react-icons/dist/esm/icons/times-icon.js";
import { SaveIcon } from "@patternfly/react-icons/dist/esm/icons/save-icon.js";
import { useFileBrowser } from '../../store/FileBrowserContext';
import { readFile, writeFile } from '../../api/cockpit-fs';
import './file-editor.scss';

const _ = cockpit.gettext;

const LANG_MAP: Record<string, string> = {
    js: "javascript", jsx: "javascript", ts: "typescript", tsx: "typescript",
    py: "python", rb: "ruby", go: "go", rs: "rust", java: "java",
    json: "json", yaml: "yaml", yml: "yaml",
    xml: "xml", html: "html", css: "css", scss: "scss", less: "less",
    sh: "shell", bash: "shell", zsh: "shell",
    md: "markdown", sql: "sql", conf: "ini", ini: "ini",
    c: "c", cpp: "cpp", h: "c", hpp: "cpp",
    php: "php", lua: "lua", r: "r", swift: "swift",
    dockerfile: "dockerfile", makefile: "makefile",
};

function getLanguage(filePath: string): string {
    const name = filePath.split('/').pop() || '';
    const lower = name.toLowerCase();

    // Handle special filenames
    if (lower === 'dockerfile') return 'dockerfile';
    if (lower === 'makefile') return 'makefile';

    const ext = name.split('.').pop()?.toLowerCase() || '';
    return LANG_MAP[ext] || 'plaintext';
}

interface FileEditorProps {
    path: string;
}

export const FileEditor: React.FC<FileEditorProps> = ({ path }) => {
    const { dispatch } = useFileBrowser();
    const [content, setContent] = useState<string>('');
    const [originalContent, setOriginalContent] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const editorRef = useRef<any>(null);

    const isModified = content !== originalContent;
    const language = getLanguage(path);

    // Load file content
    useEffect(() => {
        setLoading(true);
        setError(null);
        readFile(path)
            .then((text) => {
                setContent(text);
                setOriginalContent(text);
                setLoading(false);
            })
            .catch((err) => {
                setError(err?.message || String(err));
                setLoading(false);
            });
    }, [path]);

    // Save file
    const handleSave = useCallback(() => {
        if (!isModified || saving) return;
        setSaving(true);
        writeFile(path, content)
            .then(() => {
                setOriginalContent(content);
                setSaving(false);
            })
            .catch((err) => {
                setError(err?.message || String(err));
                setSaving(false);
            });
    }, [path, content, isModified, saving]);

    // Close editor
    const handleClose = useCallback(() => {
        dispatch({ type: 'CLOSE_EDITOR' });
    }, [dispatch]);

    // Keyboard shortcut: Ctrl+S
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                handleSave();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleSave]);

    const handleEditorMount: OnMount = (editor) => {
        editorRef.current = editor;
        editor.focus();
    };

    const handleEditorChange = (value: string | undefined) => {
        setContent(value || '');
    };

    return (
        <div className="file-editor-overlay">
            <div className="file-editor-header">
                <div className="file-editor-header__path">
                    {path}
                    {isModified && <span className="file-editor-header__modified"> ({_("modified")})</span>}
                </div>
                <div className="file-editor-header__actions">
                    <Button
                        variant="primary"
                        icon={<SaveIcon />}
                        onClick={handleSave}
                        isDisabled={!isModified || saving}
                        isLoading={saving}
                        size="sm"
                    >
                        {_("Save")}
                    </Button>
                    <Button
                        variant="plain"
                        onClick={handleClose}
                        aria-label={_("Close editor")}
                    >
                        <TimesIcon />
                    </Button>
                </div>
            </div>
            <div className="file-editor-body">
                {loading && (
                    <div className="file-editor-loading">
                        <Spinner size="xl" />
                    </div>
                )}
                {error && !loading && (
                    <Alert variant="danger" title={_("Error loading file")} isInline>
                        {error}
                    </Alert>
                )}
                {!loading && !error && (
                    <Editor
                        height="100%"
                        language={language}
                        value={content}
                        onChange={handleEditorChange}
                        onMount={handleEditorMount}
                        theme="vs-light"
                        options={{
                            minimap: { enabled: false },
                            fontSize: 14,
                            wordWrap: 'on',
                            scrollBeyondLastLine: false,
                            automaticLayout: true,
                            tabSize: 4,
                            insertSpaces: true,
                        }}
                    />
                )}
            </div>
        </div>
    );
};
