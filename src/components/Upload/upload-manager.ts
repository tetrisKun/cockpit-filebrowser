import cockpit from 'cockpit';

const _ = cockpit.gettext;

const CHUNK_SIZE = 256 * 1024; // 256KB per chunk
const spawnOptions = { superuser: "try" as const, err: "message" as const };

// --- Types ---

export type UploadFileStatus = 'pending' | 'uploading' | 'done' | 'error' | 'cancelled';
export type UploadQueueStatus = 'idle' | 'uploading' | 'paused';

export interface UploadFileInfo {
    id: string;
    name: string;
    /** Full destination path on server */
    destPath: string;
    file: File;
    size: number;
    uploadedBytes: number;
    status: UploadFileStatus;
    error?: string;
}

export interface UploadState {
    files: UploadFileInfo[];
    totalBytes: number;
    uploadedBytes: number;
    status: UploadQueueStatus;
}

export type UploadEventType = 'state-changed' | 'file-done' | 'queue-done';

// --- Helpers ---

function shellEscape(s: string): string {
    return "'" + s.replace(/'/g, "'\\''") + "'";
}

/**
 * Read a chunk of a File as a base64 string.
 */
function readFileChunkAsBase64(file: File, offset: number, chunkSize: number): Promise<string> {
    return new Promise((resolve, reject) => {
        const slice = file.slice(offset, offset + chunkSize);
        const reader = new FileReader();
        reader.onload = () => {
            const dataUrl = reader.result as string;
            // Strip "data:*/*;base64," prefix
            const base64 = dataUrl.split(',')[1] || '';
            resolve(base64);
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(slice);
    });
}

let nextId = 1;
function generateId(): string {
    return 'upload-' + (nextId++);
}

// --- Directory traversal helpers ---

interface FileWithPath {
    file: File;
    relativePath: string;
}

/**
 * Recursively traverse a FileSystemDirectoryEntry and collect all files
 * with their relative paths.
 */
export async function traverseDirectoryEntry(
    entry: FileSystemDirectoryEntry,
    basePath: string = ''
): Promise<FileWithPath[]> {
    const results: FileWithPath[] = [];
    const currentPath = basePath ? basePath + '/' + entry.name : entry.name;

    const entries = await readDirectoryEntries(entry);

    for (const child of entries) {
        if (child.isFile) {
            const file = await getFileFromEntry(child as FileSystemFileEntry);
            results.push({ file, relativePath: currentPath + '/' + file.name });
        } else if (child.isDirectory) {
            const subResults = await traverseDirectoryEntry(
                child as FileSystemDirectoryEntry,
                currentPath
            );
            results.push(...subResults);
        }
    }

    return results;
}

/**
 * Read all entries from a directory (handles the batched readEntries API).
 */
function readDirectoryEntries(dirEntry: FileSystemDirectoryEntry): Promise<FileSystemEntry[]> {
    return new Promise((resolve, reject) => {
        const reader = dirEntry.createReader();
        const allEntries: FileSystemEntry[] = [];

        const readBatch = () => {
            reader.readEntries((entries) => {
                if (entries.length === 0) {
                    resolve(allEntries);
                } else {
                    allEntries.push(...entries);
                    // readEntries may return results in batches
                    readBatch();
                }
            }, reject);
        };

        readBatch();
    });
}

/**
 * Get a File object from a FileSystemFileEntry.
 */
function getFileFromEntry(fileEntry: FileSystemFileEntry): Promise<File> {
    return new Promise((resolve, reject) => {
        fileEntry.file(resolve, reject);
    });
}

/**
 * Extract unique directory paths from a list of relative file paths
 * and create them on the server.
 */
async function ensureDirectories(relativePaths: string[], targetPath: string): Promise<void> {
    const dirs = new Set<string>();
    for (const rp of relativePaths) {
        const parts = rp.split('/');
        // Remove the filename, keep directory parts
        parts.pop();
        // Build all parent directories
        for (let i = 1; i <= parts.length; i++) {
            dirs.add(parts.slice(0, i).join('/'));
        }
    }

    // Create directories in sorted order (parents before children)
    const sortedDirs = Array.from(dirs).sort();
    for (const dir of sortedDirs) {
        const fullPath = targetPath + '/' + dir;
        await cockpit.spawn(['mkdir', '-p', fullPath], spawnOptions);
    }
}

// --- UploadManager ---

type Listener = () => void;

export class UploadManager {
    private _files: UploadFileInfo[] = [];
    private _status: UploadQueueStatus = 'idle';
    private _cancelled = new Set<string>();
    private _processing = false;
    private _listeners: Map<UploadEventType, Set<Listener>> = new Map();
    private _onQueueDoneCallbacks: Array<() => void> = [];

    // --- Event system ---

    on(event: UploadEventType, listener: Listener): void {
        if (!this._listeners.has(event)) {
            this._listeners.set(event, new Set());
        }
        this._listeners.get(event)!.add(listener);
    }

    off(event: UploadEventType, listener: Listener): void {
        this._listeners.get(event)?.delete(listener);
    }

    private _emit(event: UploadEventType): void {
        this._listeners.get(event)?.forEach(fn => {
            try { fn(); } catch (e) { console.error('UploadManager listener error:', e); }
        });
    }

    // --- State ---

    getState(): UploadState {
        const totalBytes = this._files.reduce((sum, f) => sum + f.size, 0);
        const uploadedBytes = this._files.reduce((sum, f) => sum + f.uploadedBytes, 0);
        return {
            files: [...this._files],
            totalBytes,
            uploadedBytes,
            status: this._status,
        };
    }

    // --- Queue management ---

    /**
     * Add files to the upload queue.
     */
    addFiles(files: FileList | File[], targetPath: string): void {
        const fileArray = Array.from(files);
        for (const file of fileArray) {
            const destPath = targetPath + '/' + file.name;
            this._files.push({
                id: generateId(),
                name: file.name,
                destPath,
                file,
                size: file.size,
                uploadedBytes: 0,
                status: 'pending',
            });
        }
        this._emit('state-changed');
        this._processQueue();
    }

    /**
     * Add files with explicit destination paths (for directory uploads).
     */
    addFilesWithPaths(filesWithPaths: Array<{ file: File; destPath: string }>): void {
        for (const { file, destPath } of filesWithPaths) {
            this._files.push({
                id: generateId(),
                name: file.name,
                destPath,
                file,
                size: file.size,
                uploadedBytes: 0,
                status: 'pending',
            });
        }
        this._emit('state-changed');
        this._processQueue();
    }

    /**
     * Handle drag-and-drop entries (files and directories mixed).
     * Uses webkitGetAsEntry() to detect directories and recursively traverse them.
     */
    async addEntries(items: DataTransferItemList, targetPath: string): Promise<void> {
        // IMPORTANT: webkitGetAsEntry() and getAsFile() MUST be called synchronously
        // within the drop event handler. Collect all entries/files first, then process async.
        const syncEntries: Array<{ entry: FileSystemEntry } | { file: File }> = [];
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (item.kind !== 'file') continue;

            const entry = item.webkitGetAsEntry?.();
            if (entry) {
                syncEntries.push({ entry });
            } else {
                const file = item.getAsFile();
                if (file) {
                    syncEntries.push({ file });
                }
            }
        }

        // Now process entries asynchronously
        const filesWithPaths: Array<{ file: File; destPath: string }> = [];
        const allRelativePaths: string[] = [];

        for (const item of syncEntries) {
            if ('file' in item) {
                filesWithPaths.push({ file: item.file, destPath: targetPath + '/' + item.file.name });
            } else if (item.entry.isFile) {
                const file = await getFileFromEntry(item.entry as FileSystemFileEntry);
                filesWithPaths.push({ file, destPath: targetPath + '/' + file.name });
            } else if (item.entry.isDirectory) {
                const dirFiles = await traverseDirectoryEntry(item.entry as FileSystemDirectoryEntry);
                for (const { file, relativePath } of dirFiles) {
                    allRelativePaths.push(relativePath);
                    filesWithPaths.push({ file, destPath: targetPath + '/' + relativePath });
                }
            }
        }

        // Create directory structure first
        if (allRelativePaths.length > 0) {
            await ensureDirectories(allRelativePaths, targetPath);
        }

        // Queue all files for upload
        if (filesWithPaths.length > 0) {
            this.addFilesWithPaths(filesWithPaths);
        }
    }

    /**
     * Cancel a specific file upload.
     */
    cancelFile(fileId: string): void {
        this._cancelled.add(fileId);
        const file = this._files.find(f => f.id === fileId);
        if (file && file.status === 'pending') {
            file.status = 'cancelled';
            this._emit('state-changed');
        }
        // If currently uploading, the processing loop will check _cancelled
    }

    /**
     * Cancel all pending and uploading files.
     */
    cancelAll(): void {
        for (const file of this._files) {
            if (file.status === 'pending' || file.status === 'uploading') {
                this._cancelled.add(file.id);
                file.status = 'cancelled';
            }
        }
        this._emit('state-changed');
    }

    /**
     * Clear completed/errored/cancelled files from the list.
     */
    clearCompleted(): void {
        this._files = this._files.filter(
            f => f.status === 'pending' || f.status === 'uploading'
        );
        this._emit('state-changed');
    }

    /**
     * Register a callback for when the current queue finishes processing.
     */
    onQueueDone(callback: () => void): void {
        if (this._status === 'idle') {
            callback();
        } else {
            this._onQueueDoneCallbacks.push(callback);
        }
    }

    // --- Upload processing ---

    private async _processQueue(): Promise<void> {
        if (this._processing) return;
        this._processing = true;
        this._status = 'uploading';
        this._emit('state-changed');

        while (true) {
            const next = this._files.find(f => f.status === 'pending');
            if (!next) break;

            if (this._cancelled.has(next.id)) {
                next.status = 'cancelled';
                this._emit('state-changed');
                continue;
            }

            next.status = 'uploading';
            this._emit('state-changed');

            try {
                await this._uploadFile(next);
                if (this._cancelled.has(next.id)) {
                    next.status = 'cancelled';
                } else {
                    next.status = 'done';
                    next.uploadedBytes = next.size;
                }
                this._emit('file-done');
            } catch (err: any) {
                if (this._cancelled.has(next.id)) {
                    next.status = 'cancelled';
                } else {
                    next.status = 'error';
                    next.error = err?.message || String(err);
                }
            }
            this._emit('state-changed');
        }

        this._processing = false;
        this._status = 'idle';
        this._cancelled.clear();
        this._emit('state-changed');
        this._emit('queue-done');

        // Notify queue-done callbacks
        const callbacks = this._onQueueDoneCallbacks.splice(0);
        for (const cb of callbacks) {
            try { cb(); } catch (e) { console.error('Queue done callback error:', e); }
        }
    }

    /**
     * Upload a single file in chunks via cockpit.spawn with base64 encoding.
     */
    private async _uploadFile(fileInfo: UploadFileInfo): Promise<void> {
        const { file, destPath } = fileInfo;
        const totalSize = file.size;

        // Ensure parent directory exists (needed for folder uploads)
        const parentDir = destPath.substring(0, destPath.lastIndexOf('/'));
        if (parentDir) {
            await cockpit.spawn(['mkdir', '-p', parentDir], spawnOptions);
        }

        // Handle empty files
        if (totalSize === 0) {
            await cockpit.spawn(
                ['bash', '-c', 'base64 -d > ' + shellEscape(destPath)],
                spawnOptions
            ).input('');
            return;
        }

        let offset = 0;
        let isFirst = true;

        while (offset < totalSize) {
            // Check cancellation before each chunk
            if (this._cancelled.has(fileInfo.id)) {
                return;
            }

            const chunkSize = Math.min(CHUNK_SIZE, totalSize - offset);
            const base64Data = await readFileChunkAsBase64(file, offset, chunkSize);

            const operator = isFirst ? '>' : '>>';
            const cmd = 'base64 -d ' + operator + ' ' + shellEscape(destPath);

            await cockpit.spawn(['bash', '-c', cmd], spawnOptions).input(base64Data);

            offset += chunkSize;
            isFirst = false;

            // Update progress
            fileInfo.uploadedBytes = offset;
            this._emit('state-changed');
        }
    }
}

// Singleton instance
export const uploadManager = new UploadManager();
