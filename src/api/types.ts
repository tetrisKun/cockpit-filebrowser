export interface FileEntry {
    name: string;
    path: string;
    type: "file" | "directory" | "link" | "special";
    size: number;
    modified: string;
    owner: string;
    group: string;
    mode: string;
    modeOctal: string;
    linkTarget?: string;
}

export interface FileStats {
    name: string;
    path: string;
    type: string;
    size: number;
    modified: string;
    accessed: string;
    created: string;
    owner: string;
    group: string;
    mode: string;
    modeOctal: string;
    linkTarget?: string;
    inode: number;
}
