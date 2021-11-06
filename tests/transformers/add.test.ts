import { add, ListDir, MkDir } from './add';

test('test add', () => {
    expect(add(3, 5)).toBe(8);
    expect(add(3, 5)).toBeGreaterThan(4);
    expect(add(3, 5)).toBeLessThan(9);
    expect(add(5, 5)).toBe(10);
})

test('MkDir & ListDir', async () => {
    await MkDir('./bin/testdir/dir1');
    await MkDir('./bin/testdir/dir2');
    let dirs = await ListDir('./bin/testdir');
    expect(dirs.sort()).toEqual(['dir2', 'dir1'].sort());
})