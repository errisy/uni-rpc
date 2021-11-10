import * as fs from 'fs';
import * as path from 'path';

export function add(a: number, b: number) {
    return a + b;
}

export async function ListDir(dirname: string) {
    return await (fs.promises.readdir(dirname));
}

export async function MkDir(dirname: string) {
    let parentDir = path.dirname(dirname);
    if (!fs.existsSync(parentDir) || !(await (fs.promises.stat(parentDir))).isDirectory()) {
        await MkDir(parentDir);
    }
    await (fs.promises.mkdir(dirname));
}

