import * as fs from 'fs';
import * as path from 'path';


export function IsRootPath(rawPath: string): boolean {
    return /^(\w+:|\/{1,2})/ig.test(rawPath);
}
export function ResolvePath(pathValue: string) {
    if (IsRootPath(pathValue)) return path.normalize(pathValue);
    else return path.normalize(path.join(process.cwd(), pathValue));
}
export async function IsFile(filename: string) {
    return fs.existsSync(filename) && (await (fs.promises.stat(filename))).isFile();
}
export function IsDirectory(filename: string) {
    return fs.existsSync(filename) && fs.statSync(filename).isDirectory();
}
export async function FileSize(filename: string) {
    if (fs.existsSync(filename)) {
        return (await (fs.promises.stat(filename))).size;
    }
    throw `Error: File ${filename} does not exist!`;
}
export function ReadFile(filename: string, encoding?: BufferEncoding): Promise<string> {
    return new Promise<string>((resolve, reject) => {
        if (typeof encoding == 'undefined' || encoding.length == 0) {
            encoding = 'utf8';
        }
        fs.readFile(filename, encoding, (ex, data) => {
            if (ex) {
                reject(ex);
            } else {
                resolve(data);
            }
        });
    });
}
export function WriteFile(filename: string, data: string, encoding?: BufferEncoding) {
    if (typeof encoding == 'undefined' || encoding.length == 0) {
        encoding = 'utf8';
    }
    MakeParentDirectories(filename);
    fs.writeFileSync(filename, data, encoding);
}
export function MakeParentDirectories(filepath: string) {
    filepath = path.normalize(filepath);
    let parentDirectory = path.dirname(filepath);
    if (!IsDirectory(parentDirectory)) {
        MakeDirectories(parentDirectory);
    }
}
export function MakeDirectories(directory: string) {
    directory = path.normalize(directory);
    if (IsDirectory(directory)) return;
    let parentDirectory = path.dirname(directory);
    MakeDirectories(parentDirectory);
    fs.mkdirSync(directory);
}
export function Remove(itempath: string) {
    if (fs.existsSync(itempath)) {
        let stat = fs.statSync(itempath);
        if (stat.isFile()) {
            fs.unlinkSync(itempath);
        } else if (stat.isDirectory()) {
            fs.rmSync(itempath, {recursive: true, force: true});
        }
    }
}
export function CopyFile(source: string, destination: string) {
    if (!fs.existsSync(source)) return;
    if (!fs.statSync(source).isFile()) return;
    if (fs.existsSync(destination)) {
        let stat = fs.statSync(destination);
        if (stat.isFile()) {
            fs.unlinkSync(destination);
        }
        if (stat.isDirectory()) {
            destination = path.join(destination, path.basename(source));
        }
    }
    MakeParentDirectories(destination);
    fs.copyFileSync(source, destination);
}

export function CopyDirectory(source: string, destination: string) {
    if (!fs.existsSync(source)) return;
    if (!fs.statSync(source).isDirectory()) return;
    if (!IsDirectory(destination)) {
        MakeDirectories(destination);
    }
    for (let item of fs.readdirSync(source)) {
        let itempath = path.join(source, item);
        if(IsFile(itempath)) {
            fs.copyFileSync(itempath, path.join(destination, item));
        } else if (IsDirectory(itempath)) {
            // DFS copy of children
            CopyDirectory(itempath, path.join(destination, item));
        }
    }
}

export async function MoveFile(source: string, destination: string) {
    if (!fs.existsSync(source)) return;
    if (!(await (fs.promises.stat(source))).isFile()) return;
    if (fs.existsSync(destination)) {
        let stat = await (fs.promises.stat(destination));
        if (stat.isFile()) {
            await (fs.promises.unlink(destination));
        }
    } else {
        await MakeParentDirectories(destination);
    }
    // Move file from source to destination
    await (fs.promises.rename(source, destination));
}
export function DateTime() {
    let now = new Date();
    let year = now.getUTCFullYear().toString().padStart(4, '0');
    let month = (now.getUTCMonth() + 1).toString().padStart(2, '0');
    let date = now.getUTCDate().toString().padStart(2, '0');
    let hour = now.getUTCHours().toString().padStart(2, '0');
    let minute = now.getUTCMinutes().toString().padStart(2, '0');
    let second = now.getUTCSeconds().toString().padStart(2, '0');
    let millisecond = now.getUTCMilliseconds().toString().padStart(3, '0');
    return `${year}-${month}-${date} ${hour}:${minute}:${second}.${millisecond}`;
}