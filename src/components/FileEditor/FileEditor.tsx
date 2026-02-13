import React, { useEffect, useState, useCallback, useRef } from 'react';
import cockpit from 'cockpit';
import Editor, { OnMount, loader } from '@monaco-editor/react';

// Load Monaco from local files instead of CDN (Cockpit CSP blocks external scripts)
loader.config({ paths: { vs: './vs' } });

// Configure Monaco worker path (CSP blocks blob: URLs for workers)
(window as any).MonacoEnvironment = {
    getWorkerUrl(_moduleId: string, label: string) {
        if (label === 'json') return './vs/assets/json.worker-DKiEKt88.js';
        if (label === 'css' || label === 'scss' || label === 'less') return './vs/assets/css.worker-HnVq6Ewq.js';
        if (label === 'html' || label === 'handlebars' || label === 'razor') return './vs/assets/html.worker-B51mlPHg.js';
        if (label === 'typescript' || label === 'javascript') return './vs/assets/ts.worker-CMbG-7ft.js';
        return './vs/assets/editor.worker-Be8ye1pW.js';
    }
};
import { Button } from "@patternfly/react-core/dist/esm/components/Button/index.js";
import { Spinner } from "@patternfly/react-core/dist/esm/components/Spinner/index.js";
import { Alert } from "@patternfly/react-core/dist/esm/components/Alert/index.js";
import { ToggleGroup, ToggleGroupItem } from "@patternfly/react-core/dist/esm/components/ToggleGroup/index.js";
import { TimesIcon } from "@patternfly/react-icons/dist/esm/icons/times-icon.js";
import { SaveIcon } from "@patternfly/react-icons/dist/esm/icons/save-icon.js";
import { CodeIcon } from "@patternfly/react-icons/dist/esm/icons/code-icon.js";
import { ColumnsIcon } from "@patternfly/react-icons/dist/esm/icons/columns-icon.js";
import { EyeIcon } from "@patternfly/react-icons/dist/esm/icons/eye-icon.js";
import { useFileBrowser } from '../../store/FileBrowserContext';
import { readFile, writeFile } from '../../api/cockpit-fs';
import { MarkdownViewer } from '../MarkdownViewer/MarkdownViewer';
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

type MdViewMode = 'edit' | 'split' | 'preview';

function getLanguage(filePath: string): string {
    const name = filePath.split('/').pop() || '';
    const lower = name.toLowerCase();

    // Handle special filenames
    if (lower === 'dockerfile') return 'dockerfile';
    if (lower === 'makefile') return 'makefile';

    const ext = name.split('.').pop()?.toLowerCase() || '';
    return LANG_MAP[ext] || 'plaintext';
}

function isMarkdown(filePath: string): boolean {
    const ext = filePath.split('.').pop()?.toLowerCase() || '';
    return ext === 'md' || ext === 'markdown';
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
    const [mdViewMode, setMdViewMode] = useState<MdViewMode>('split');
    const editorRef = useRef<any>(null);

    const isModified = content !== originalContent;
    const language = getLanguage(path);
    const isMd = isMarkdown(path);

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

    const editorOptions = {
        minimap: { enabled: false },
        fontSize: 14,
        wordWrap: 'on' as const,
        scrollBeyondLastLine: false,
        automaticLayout: true,
        tabSize: 4,
        insertSpaces: true,
        scrollbar: {
            vertical: 'visible' as const,
            horizontal: 'visible' as const,
            verticalScrollbarSize: 12,
            horizontalScrollbarSize: 12,
        },
    };

    const showEditor = !isMd || mdViewMode === 'edit' || mdViewMode === 'split';
    const showPreview = isMd && (mdViewMode === 'preview' || mdViewMode === 'split');

    const renderEditorArea = () => {
        if (loading) {
            return (
                <div className="file-editor-loading">
                    <Spinner size="xl" />
                </div>
            );
        }

        if (error) {
            return (
                <Alert variant="danger" title={_("Error loading file")} isInline>
                    {error}
                </Alert>
            );
        }

        // Markdown split/preview modes
        if (isMd && (showEditor || showPreview)) {
            if (mdViewMode === 'preview') {
                return (
                    <div className="file-editor-split__preview" style={{ flex: 1, borderLeft: 'none' }}>
                        <MarkdownViewer content={content} />
                    </div>
                );
            }

            if (mdViewMode === 'split') {
                return (
                    <div className="file-editor-split">
                        <div className="file-editor-split__editor">
                            <Editor
                                height="100%"
                                language={language}
                                value={content}
                                onChange={handleEditorChange}
                                onMount={handleEditorMount}
                                theme="vs-light"
                                options={editorOptions}
                            />
                        </div>
                        <div className="file-editor-split__preview">
                            <MarkdownViewer content={content} />
                        </div>
                    </div>
                );
            }
        }

        // Default: editor only (for non-md files and md "edit" mode)
        return (
            <Editor
                height="100%"
                language={language}
                value={content}
                onChange={handleEditorChange}
                onMount={handleEditorMount}
                theme="vs-light"
                options={editorOptions}
            />
        );
    };

    return (
        <div className="file-editor-overlay">
            <div className="file-editor-header">
                <div className="file-editor-header__path">
                    {path}
                    {isModified && <span className="file-editor-header__modified"> ({_("modified")})</span>}
                </div>
                <div className="file-editor-header__actions">
                    {isMd && (
                        <div className="file-editor-view-toggle">
                            <ToggleGroup aria-label={_("Markdown view mode")}>
                                <ToggleGroupItem
                                    icon={<CodeIcon />}
                                    text={_("Edit")}
                                    aria-label={_("Edit only")}
                                    isSelected={mdViewMode === 'edit'}
                                    onChange={() => setMdViewMode('edit')}
                                />
                                <ToggleGroupItem
                                    icon={<ColumnsIcon />}
                                    text={_("Split")}
                                    aria-label={_("Split view")}
                                    isSelected={mdViewMode === 'split'}
                                    onChange={() => setMdViewMode('split')}
                                />
                                <ToggleGroupItem
                                    icon={<EyeIcon />}
                                    text={_("Preview")}
                                    aria-label={_("Preview only")}
                                    isSelected={mdViewMode === 'preview'}
                                    onChange={() => setMdViewMode('preview')}
                                />
                            </ToggleGroup>
                        </div>
                    )}
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
                {renderEditorArea()}
            </div>
        </div>
    );
};
