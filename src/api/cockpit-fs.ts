import cockpit from 'cockpit';
import { FileEntry, FileStats } from './types';

const spawnOptions = { superuser: "try" as const, err: "message" as const };

/**
 * Convert a mode string like "rwxr-xr-x" to octal like "755".
 */
export function modeStringToOctal(mode: string): string {
    const chars = mode.replace(/[^rwxsStT-]/g, '');
    if (chars.length !== 9) return "000";

    const tripleToOctal = (triple: string, position: number): number => {
        let val = 0;
        if (triple[0] === 'r') val += 4;
        if (triple[1] === 'w') val += 2;
        // Handle execute and special bits
        const execChar = triple[2];
        if (execChar === 'x' || execChar === 's' || execChar === 't') val += 1;
        return val;
    };

    const owner = tripleToOctal(chars.slice(0, 3), 0);
    const group = tripleToOctal(chars.slice(3, 6), 1);
    const other = tripleToOctal(chars.slice(6, 9), 2);

    // Special bits (setuid, setgid, sticky)
    let special = 0;
    if (chars[2] === 's' || chars[2] === 'S') special += 4; // setuid
    if (chars[5] === 's' || chars[5] === 'S') special += 2; // setgid
    if (chars[8] === 't' || chars[8] === 'T') special += 1; // sticky

    if (special > 0) {
        return `${special}${owner}${group}${other}`;
    }
    return `${owner}${group}${other}`;
}

/**
 * Parse a single line of `ls -lAp --time-style=full-iso` output into a FileEntry.
 */
function parseLsLine(line: string, dirPath: string): FileEntry | null {
    // Example line:
    // drwxr-xr-x 2 root root 4096 2024-01-15 10:30:45.123456789 +0000 dirname/
    // -rw-r--r-- 1 root root  123 2024-01-15 10:30:45.123456789 +0000 file.txt
    // lrwxrwxrwx 1 root root   11 2024-01-15 10:30:45.123456789 +0000 link -> target

    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('total ')) return null;

    // Match: permissions links owner group size date time timezone rest
    const match = trimmed.match(
        /^([dlcbps-])([rwxsStT-]{9})\S*\s+\d+\s+(\S+)\s+(\S+)\s+(\d+(?:,\s*\d+)?)\s+(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}(?:\.\d+)?)\s+\S+\s+(.+)$/
    );

    if (!match) return null;

    const [, typeChar, modeStr, owner, group, sizeStr, dateStr, nameRaw] = match;

    // Determine type
    let type: FileEntry['type'];
    switch (typeChar) {
        case 'd': type = 'directory'; break;
        case 'l': type = 'link'; break;
        case '-': type = 'file'; break;
        default: type = 'special'; break;
    }

    // Parse name and link target
    let name = nameRaw;
    let linkTarget: string | undefined;

    if (type === 'link' && name.includes(' -> ')) {
        const parts = name.split(' -> ');
        name = parts[0];
        linkTarget = parts.slice(1).join(' -> ');
    }

    // Remove trailing slash from directory names
    if (name.endsWith('/')) {
        name = name.slice(0, -1);
    }

    // Parse size (handle device numbers like "1, 3")
    const size = parseInt(sizeStr.replace(/,\s*/g, ''), 10) || 0;

    const normalizedPath = dirPath.endsWith('/') ? dirPath : dirPath + '/';
    const entryPath = normalizedPath + name;

    return {
        name,
        path: entryPath,
        type,
        size,
        modified: dateStr,
        owner,
        group,
        mode: typeChar + modeStr,
        modeOctal: modeStringToOctal(modeStr),
        linkTarget,
    };
}

/**
 * List directory contents.
 */
export async function listDirectory(dirPath: string, showHidden: boolean = false): Promise<FileEntry[]> {
    const args = showHidden
        ? ['ls', '-lAp', '--time-style=full-iso', dirPath]
        : ['ls', '-lp', '--time-style=full-iso', dirPath];

    const output = await cockpit.spawn(args, spawnOptions);
    const lines = (output as string).split('\n');
    const entries: FileEntry[] = [];

    for (const line of lines) {
        const entry = parseLsLine(line, dirPath);
        if (entry) {
            entries.push(entry);
        }
    }

    return entries;
}

/**
 * Get detailed file stats.
 */
export async function stat(filePath: string): Promise<FileStats> {
    const format = '%n\\n%F\\n%s\\n%Y\\n%X\\n%W\\n%U\\n%G\\n%A\\n%a\\n%i\\n%N';
    const output = await cockpit.spawn(
        ['stat', `--printf=${format}`, filePath],
        spawnOptions
    );

    const lines = (output as string).split('\n');

    // Parse link target from %N: 'filename' -> 'target' or just 'filename'
    const quotedName = lines[11] || '';
    let linkTarget: string | undefined;
    const linkMatch = quotedName.match(/-> '(.+)'/);
    if (linkMatch) {
        linkTarget = linkMatch[1];
    }

    return {
        name: lines[0].split('/').pop() || lines[0],
        path: filePath,
        type: lines[1],
        size: parseInt(lines[2], 10) || 0,
        modified: new Date(parseInt(lines[3], 10) * 1000).toISOString(),
        accessed: new Date(parseInt(lines[4], 10) * 1000).toISOString(),
        created: lines[5] === '0' ? '' : new Date(parseInt(lines[5], 10) * 1000).toISOString(),
        owner: lines[6],
        group: lines[7],
        mode: lines[8],
        modeOctal: lines[9],
        linkTarget,
        inode: parseInt(lines[10], 10) || 0,
    };
}

/**
 * Read file contents as text.
 */
export function readFile(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const handle = cockpit.file(filePath, { superuser: "try" as const });
        handle.read()
            .then((content: string) => {
                resolve(content || '');
            })
            .catch((err: Error) => {
                reject(err);
            })
            .finally(() => {
                handle.close();
            });
    });
}

/**
 * Write text content to a file.
 */
export function writeFile(filePath: string, content: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const handle = cockpit.file(filePath, { superuser: "try" as const });
        handle.replace(content)
            .then(() => {
                resolve();
            })
            .catch((err: Error) => {
                reject(err);
            })
            .finally(() => {
                handle.close();
            });
    });
}

/**
 * Create an empty file using touch.
 */
export async function createFile(filePath: string): Promise<void> {
    await cockpit.spawn(['touch', filePath], spawnOptions);
}

/**
 * Create a directory (with parents).
 */
export async function createDirectory(dirPath: string): Promise<void> {
    await cockpit.spawn(['mkdir', '-p', dirPath], spawnOptions);
}

/**
 * Create a symbolic link.
 */
export async function createSymlink(target: string, linkPath: string): Promise<void> {
    await cockpit.spawn(['ln', '-s', target, linkPath], spawnOptions);
}

/**
 * Delete a file or directory recursively.
 */
export async function deleteEntry(entryPath: string): Promise<void> {
    await cockpit.spawn(['rm', '-rf', entryPath], spawnOptions);
}

/**
 * Move or rename a file/directory.
 */
export async function moveEntry(src: string, dest: string): Promise<void> {
    await cockpit.spawn(['mv', src, dest], spawnOptions);
}

/**
 * Copy a file/directory recursively.
 */
export async function copyEntry(src: string, dest: string): Promise<void> {
    await cockpit.spawn(['cp', '-r', src, dest], spawnOptions);
}

/**
 * Rename a file/directory (within the same parent directory).
 */
export async function rename(oldPath: string, newName: string): Promise<void> {
    const parts = oldPath.split('/');
    parts.pop();
    const parentDir = parts.join('/') || '/';
    const newPath = parentDir + '/' + newName;
    await cockpit.spawn(['mv', oldPath, newPath], spawnOptions);
}

/**
 * Change file permissions.
 */
export async function chmod(filePath: string, mode: string): Promise<void> {
    await cockpit.spawn(['chmod', mode, filePath], spawnOptions);
}

/**
 * Change file ownership.
 */
export async function chown(filePath: string, owner: string, group: string): Promise<void> {
    await cockpit.spawn(['chown', `${owner}:${group}`, filePath], spawnOptions);
}

/**
 * Search for files by name pattern using find.
 */
export async function searchFiles(dir: string, pattern: string): Promise<string[]> {
    const output = await cockpit.spawn(
        ['find', dir, '-maxdepth', '5', '-iname', `*${pattern}*`, '-not', '-path', '*/\\.*'],
        spawnOptions
    );
    return (output as string).split('\n').filter(line => line.trim().length > 0);
}

/**
 * Search for files containing a text pattern using grep.
 */
export async function grepSearch(dir: string, pattern: string): Promise<string[]> {
    try {
        const output = await cockpit.spawn(
            ['grep', '-rl', '--include=*', pattern, dir],
            spawnOptions
        );
        return (output as string).split('\n').filter(line => line.trim().length > 0);
    } catch {
        // grep returns exit code 1 when no matches found
        return [];
    }
}

/**
 * Download a file by reading it as binary and triggering a browser download.
 */
export async function downloadFile(filePath: string): Promise<void> {
    const output = await cockpit.spawn(
        ['base64', filePath],
        spawnOptions
    );
    const binaryString = atob(output as string);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);

    const filename = filePath.split('/').pop() || 'download';
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * Download a directory or file as a tar.gz archive.
 */
export async function downloadArchive(filePath: string): Promise<void> {
    const parentDir = filePath.split('/').slice(0, -1).join('/') || '/';
    const baseName = filePath.split('/').pop() || 'archive';

    const output = await cockpit.spawn(
        ['tar', 'czf', '-', '-C', parentDir, baseName],
        { ...spawnOptions, binary: true as any }
    );

    const bytes = typeof output === 'string'
        ? new TextEncoder().encode(output)
        : new Uint8Array(output as ArrayBuffer);

    const blob = new Blob([bytes], { type: 'application/gzip' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `${baseName}.tar.gz`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
