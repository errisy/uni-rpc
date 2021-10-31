import { main, Package } from './replace';
import * as fs from 'fs';

test('main', async () => {
    if (fs.existsSync('./test-data/package.json')) {
        await fs.promises.unlink('./test-data/package.json');
    }
    await fs.promises.copyFile('./test-data/old-package.json', './test-data/package.json');
    await main('--file=./test-data/package.json', '--', '--Build.BuildId=168');
    let data: Package = JSON.parse(await fs.promises.readFile('./test-data/package.json', 'utf-8'));
    expect(data.version).toBe('0.0.168');
})