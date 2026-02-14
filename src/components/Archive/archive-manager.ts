import cockpit from 'cockpit';

const spawnOptions = { superuser: "try" as const, err: "message" as const };

// --- Types ---

export type ArchiveFormat = 'tar' | 'tar.gz' | 'tar.bz2' | 'tar.xz' | 'zip' | '7z' | 'rar';
export type ArchiveOpStatus = 'pending' | 'running' | 'done' | 'error' | 'cancelled';
export type ArchiveQueueStatus = 'idle' | 'running';
export type ArchiveEventType = 'state-changed' | 'op-done' | 'queue-done';

export interface AvailableTools {
    tar: boolean;
    zip: boolean;
    unzip: boolean;
    p7zip: boolean;
    unrar: boolean;
}

export interface ArchiveOperation {
    id: string;
    type: 'compress' | 'extract';
    name: string;
    status: ArchiveOpStatus;
    progress: number;
    totalItems: number;
    processedItems: number;
    error?: string;
}

export interface ArchiveState {
    operations: ArchiveOperation[];
    status: ArchiveQueueStatus;
}

// --- Helpers ---

let nextId = 1;
function generateId(): string {
    return 'archive-' + (nextId++);
}

// --- Format detection ---

const FORMAT_MAP: Array<{ exts: string[]; format: ArchiveFormat }> = [
    { exts: ['.tar.gz', '.tgz'], format: 'tar.gz' },
    { exts: ['.tar.bz2', '.tbz2'], format: 'tar.bz2' },
    { exts: ['.tar.xz', '.txz'], format: 'tar.xz' },
    { exts: ['.tar'], format: 'tar' },
    { exts: ['.zip'], format: 'zip' },
    { exts: ['.7z'], format: '7z' },
    { exts: ['.rar'], format: 'rar' },
];

export function getArchiveType(filename: string): ArchiveFormat | null {
    const lower = filename.toLowerCase();
    for (const { exts, format } of FORMAT_MAP) {
        for (const ext of exts) {
            if (lower.endsWith(ext)) return format;
        }
    }
    return null;
}

export function getFormatExtension(format: ArchiveFormat): string {
    switch (format) {
        case 'tar': return '.tar';
        case 'tar.gz': return '.tar.gz';
        case 'tar.bz2': return '.tar.bz2';
        case 'tar.xz': return '.tar.xz';
        case 'zip': return '.zip';
        case '7z': return '.7z';
        case 'rar': return '.rar';
    }
}

// --- ArchiveManager ---

type Listener = () => void;

export class ArchiveManager {
    private _operations: ArchiveOperation[] = [];
    private _status: ArchiveQueueStatus = 'idle';
    private _cancelled = new Set<string>();
    private _processing = false;
    private _listeners: Map<ArchiveEventType, Set<Listener>> = new Map();
    private _onQueueDoneCallbacks: Array<() => void> = [];
    private _tools: AvailableTools | null = null;
    private _detectPromise: Promise<AvailableTools> | null = null;

    // --- Event system ---

    on(event: ArchiveEventType, listener: Listener): void {
        if (!this._listeners.has(event)) {
            this._listeners.set(event, new Set());
        }
        this._listeners.get(event)!.add(listener);
    }

    off(event: ArchiveEventType, listener: Listener): void {
        this._listeners.get(event)?.delete(listener);
    }

    private _emit(event: ArchiveEventType): void {
        this._listeners.get(event)?.forEach(fn => {
            try { fn(); } catch (e) { console.error('ArchiveManager listener error:', e); }
        });
    }

    // --- Tool detection ---

    async detectTools(): Promise<AvailableTools> {
        if (this._tools) return this._tools;
        if (this._detectPromise) return this._detectPromise;

        this._detectPromise = this._doDetect();
        this._tools = await this._detectPromise;
        this._detectPromise = null;
        return this._tools;
    }

    private async _doDetect(): Promise<AvailableTools> {
        const check = async (cmd: string): Promise<boolean> => {
            try {
                await cockpit.spawn(['which', cmd], spawnOptions);
                return true;
            } catch {
                return false;
            }
        };

        const [tar, zip, unzip, p7zip, unrar] = await Promise.all([
            check('tar'),
            check('zip'),
            check('unzip'),
            check('7z'),
            check('unrar'),
        ]);

        return { tar, zip, unzip, p7zip, unrar };
    }

    getAvailableTools(): AvailableTools | null {
        return this._tools;
    }

    /**
     * Get list of formats available for compression.
     */
    getCompressFormats(): ArchiveFormat[] {
        if (!this._tools) return [];
        const formats: ArchiveFormat[] = [];
        if (this._tools.tar) {
            formats.push('tar', 'tar.gz', 'tar.bz2', 'tar.xz');
        }
        if (this._tools.zip) {
            formats.push('zip');
        }
        if (this._tools.p7zip) {
            formats.push('7z');
        }
        return formats;
    }

    /**
     * Check if a file can be extracted based on its name and available tools.
     */
    canExtract(filename: string): boolean {
        if (!this._tools) return false;
        const format = getArchiveType(filename);
        if (!format) return false;

        switch (format) {
            case 'tar':
            case 'tar.gz':
            case 'tar.bz2':
            case 'tar.xz':
                return this._tools.tar;
            case 'zip':
                return this._tools.unzip;
            case '7z':
                return this._tools.p7zip;
            case 'rar':
                return this._tools.unrar;
        }
    }

    // --- State ---

    getState(): ArchiveState {
        return {
            operations: [...this._operations],
            status: this._status,
        };
    }

    // --- Queue management ---

    onQueueDone(callback: () => void): void {
        if (this._status === 'idle') {
            callback();
        } else {
            this._onQueueDoneCallbacks.push(callback);
        }
    }

    cancelOp(opId: string): void {
        this._cancelled.add(opId);
        const op = this._operations.find(o => o.id === opId);
        if (op && op.status === 'pending') {
            op.status = 'cancelled';
            this._emit('state-changed');
        }
    }

    cancelAll(): void {
        for (const op of this._operations) {
            if (op.status === 'pending' || op.status === 'running') {
                this._cancelled.add(op.id);
                op.status = 'cancelled';
            }
        }
        this._emit('state-changed');
    }

    clearCompleted(): void {
        this._operations = this._operations.filter(
            o => o.status === 'pending' || o.status === 'running'
        );
        this._emit('state-changed');
    }

    // --- Compress ---

    compress(paths: string[], format: ArchiveFormat, outputPath: string, parentDir: string): void {
        const name = outputPath.split('/').pop() || 'archive';
        const op: ArchiveOperation = {
            id: generateId(),
            type: 'compress',
            name,
            status: 'pending',
            progress: 0,
            totalItems: 0,
            processedItems: 0,
        };
        this._operations.push(op);
        this._emit('state-changed');

        // Store extra info on the op object for processing
        (op as any)._paths = paths;
        (op as any)._format = format;
        (op as any)._outputPath = outputPath;
        (op as any)._parentDir = parentDir;

        this._processQueue();
    }

    // --- Extract ---

    extract(archivePath: string, destDir: string): void {
        const name = archivePath.split('/').pop() || 'archive';
        const op: ArchiveOperation = {
            id: generateId(),
            type: 'extract',
            name,
            status: 'pending',
            progress: 0,
            totalItems: 0,
            processedItems: 0,
        };
        this._operations.push(op);
        this._emit('state-changed');

        (op as any)._archivePath = archivePath;
        (op as any)._destDir = destDir;

        this._processQueue();
    }

    // --- Queue processing ---

    private async _processQueue(): Promise<void> {
        if (this._processing) return;
        this._processing = true;
        this._status = 'running';
        this._emit('state-changed');

        while (true) {
            const next = this._operations.find(o => o.status === 'pending');
            if (!next) break;

            if (this._cancelled.has(next.id)) {
                next.status = 'cancelled';
                this._emit('state-changed');
                continue;
            }

            next.status = 'running';
            this._emit('state-changed');

            try {
                if (next.type === 'compress') {
                    await this._doCompress(next);
                } else {
                    await this._doExtract(next);
                }

                if (this._cancelled.has(next.id)) {
                    next.status = 'cancelled';
                } else {
                    next.status = 'done';
                    next.progress = 100;
                }
                this._emit('op-done');
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

        const callbacks = this._onQueueDoneCallbacks.splice(0);
        for (const cb of callbacks) {
            try { cb(); } catch (e) { console.error('Queue done callback error:', e); }
        }
    }

    // --- Compress implementation ---

    private async _doCompress(op: ArchiveOperation): Promise<void> {
        const paths: string[] = (op as any)._paths;
        const format: ArchiveFormat = (op as any)._format;
        const outputPath: string = (op as any)._outputPath;
        const parentDir: string = (op as any)._parentDir;

        // Count total files for progress
        try {
            const names = paths.map(p => p.split('/').pop()).filter(Boolean);
            const countCmd = ['bash', '-c',
                `cd ${shellEscape(parentDir)} && find ${names.map(n => shellEscape(n!)).join(' ')} -type f 2>/dev/null | wc -l`
            ];
            const countOut = await cockpit.spawn(countCmd, spawnOptions);
            op.totalItems = parseInt(String(countOut).trim(), 10) || 1;
        } catch {
            op.totalItems = 1;
        }
        this._emit('state-changed');

        // Build and execute compress command
        const names = paths.map(p => p.split('/').pop()).filter(Boolean) as string[];
        let cmd: string[];

        switch (format) {
            case 'tar':
                cmd = ['tar', 'cvf', outputPath, '-C', parentDir, ...names];
                break;
            case 'tar.gz':
                cmd = ['tar', 'czvf', outputPath, '-C', parentDir, ...names];
                break;
            case 'tar.bz2':
                cmd = ['tar', 'cjvf', outputPath, '-C', parentDir, ...names];
                break;
            case 'tar.xz':
                cmd = ['tar', 'cJvf', outputPath, '-C', parentDir, ...names];
                break;
            case 'zip':
                cmd = ['bash', '-c',
                    `cd ${shellEscape(parentDir)} && zip -rv ${shellEscape(outputPath)} ${names.map(n => shellEscape(n)).join(' ')}`
                ];
                break;
            case '7z':
                cmd = ['7z', 'a', outputPath, ...paths];
                break;
            default:
                throw new Error(`Unsupported format: ${format}`);
        }

        await this._runWithProgress(op, cmd);
    }

    // --- Extract implementation ---

    private async _doExtract(op: ArchiveOperation): Promise<void> {
        const archivePath: string = (op as any)._archivePath;
        const destDir: string = (op as any)._destDir;
        const format = getArchiveType(archivePath.split('/').pop() || '');

        if (!format) throw new Error('Unknown archive format');

        // Count items in archive for progress
        try {
            let listCmd: string[];
            switch (format) {
                case 'tar':
                case 'tar.gz':
                case 'tar.bz2':
                case 'tar.xz':
                    listCmd = ['bash', '-c', `tar tf ${shellEscape(archivePath)} | wc -l`];
                    break;
                case 'zip':
                    listCmd = ['bash', '-c', `unzip -l ${shellEscape(archivePath)} | tail -1 | awk '{print $2}'`];
                    break;
                case '7z':
                    listCmd = ['bash', '-c', `7z l ${shellEscape(archivePath)} | grep -c "^[0-9]" || echo 1`];
                    break;
                case 'rar':
                    listCmd = ['bash', '-c', `unrar l ${shellEscape(archivePath)} | grep -c "^[. ]" || echo 1`];
                    break;
                default:
                    listCmd = ['echo', '1'];
            }
            const countOut = await cockpit.spawn(listCmd, spawnOptions);
            op.totalItems = parseInt(String(countOut).trim(), 10) || 1;
        } catch {
            op.totalItems = 1;
        }
        this._emit('state-changed');

        // Build extract command
        let cmd: string[];
        switch (format) {
            case 'tar':
            case 'tar.gz':
            case 'tar.bz2':
            case 'tar.xz':
                cmd = ['tar', 'xvf', archivePath, '-C', destDir];
                break;
            case 'zip':
                cmd = ['unzip', '-o', archivePath, '-d', destDir];
                break;
            case '7z':
                cmd = ['7z', 'x', archivePath, `-o${destDir}`, '-y'];
                break;
            case 'rar':
                cmd = ['unrar', 'x', '-o+', archivePath, destDir + '/'];
                break;
            default:
                throw new Error(`Unsupported format: ${format}`);
        }

        await this._runWithProgress(op, cmd);
    }

    // --- Progress tracking ---

    private _runWithProgress(op: ArchiveOperation, cmd: string[]): Promise<void> {
        return new Promise((resolve, reject) => {
            if (this._cancelled.has(op.id)) {
                reject(new Error('Cancelled'));
                return;
            }

            const proc = cockpit.spawn(cmd, spawnOptions);
            let lineCount = 0;

            proc.stream((data: string) => {
                if (this._cancelled.has(op.id)) {
                    try { proc.close('terminated'); } catch (_) { /* ignore */ }
                    return;
                }
                lineCount += data.split('\n').filter((l: string) => l.trim()).length;
                op.processedItems = lineCount;
                op.progress = op.totalItems > 0
                    ? Math.min(99, Math.round(lineCount / op.totalItems * 100))
                    : 0;
                this._emit('state-changed');
            });

            proc.then(() => {
                op.processedItems = op.totalItems;
                op.progress = 100;
                this._emit('state-changed');
                resolve();
            }).catch((err: any) => {
                if (this._cancelled.has(op.id)) {
                    reject(new Error('Cancelled'));
                } else {
                    reject(err);
                }
            });
        });
    }
}

function shellEscape(s: string): string {
    return "'" + s.replace(/'/g, "'\\''") + "'";
}

// Singleton
export const archiveManager = new ArchiveManager();
