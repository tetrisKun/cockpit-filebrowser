import React from 'react';
import { FolderIcon } from "@patternfly/react-icons/dist/esm/icons/folder-icon.js";
import { FolderOpenIcon } from "@patternfly/react-icons/dist/esm/icons/folder-open-icon.js";
import { LinkIcon } from "@patternfly/react-icons/dist/esm/icons/link-icon.js";
import { FileImageIcon } from "@patternfly/react-icons/dist/esm/icons/file-image-icon.js";
import { FileCodeIcon } from "@patternfly/react-icons/dist/esm/icons/file-code-icon.js";
import { FileArchiveIcon } from "@patternfly/react-icons/dist/esm/icons/file-archive-icon.js";
import { FileAltIcon } from "@patternfly/react-icons/dist/esm/icons/file-alt-icon.js";
import { FileIcon as DefaultFileIcon } from "@patternfly/react-icons/dist/esm/icons/file-icon.js";

const imageExtensions = new Set(['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp', '.bmp', '.ico', '.tiff']);
const codeExtensions = new Set(['.js', '.ts', '.tsx', '.jsx', '.py', '.go', '.rs', '.java', '.c', '.cpp', '.h', '.rb', '.php', '.sh', '.bash', '.zsh', '.css', '.scss', '.html', '.xml', '.json', '.yaml', '.yml', '.toml']);
const archiveExtensions = new Set(['.zip', '.tar', '.gz', '.rar', '.7z', '.bz2', '.xz', '.tgz', '.deb', '.rpm']);

function getExtension(name: string): string {
    const dotIndex = name.lastIndexOf('.');
    if (dotIndex <= 0) return '';
    return name.slice(dotIndex).toLowerCase();
}

interface FileIconProps {
    type: string;
    name: string;
    className?: string;
}

export const FileIcon: React.FC<FileIconProps> = ({ type, name, className }) => {
    if (type === 'directory') {
        return <FolderIcon className={className} />;
    }

    if (type === 'link') {
        return <LinkIcon className={className} />;
    }

    const ext = getExtension(name);

    if (imageExtensions.has(ext)) {
        return <FileImageIcon className={className} />;
    }

    if (codeExtensions.has(ext)) {
        return <FileCodeIcon className={className} />;
    }

    if (archiveExtensions.has(ext)) {
        return <FileArchiveIcon className={className} />;
    }

    if (ext === '.md' || ext === '.markdown' || ext === '.txt' || ext === '.rst') {
        return <FileAltIcon className={className} />;
    }

    return <DefaultFileIcon className={className} />;
};
