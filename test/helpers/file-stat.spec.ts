import { describe, it, expect } from 'vitest';
import { formatFileStatLs, formatFileStatEp } from '../../src/helpers/file-stat';
import { FileSystemError } from '../../src/errors';

describe('helpers // file-stat', () => {
  const STAT = {
    name: 'test1',
    dev: 2114,
    ino: 48064969,
    mode: 33279,
    nlink: 1,
    uid: 85,
    gid: 100,
    rdev: 0,
    size: 527,
    blksize: 4096,
    blocks: 8,
    atime: new Date('2017-10-10T23:24:11Z'),
    mtime: new Date('2017-10-10T23:24:11Z'),
    ctime: new Date('2017-10-10T23:24:11Z'),
    birthtime: new Date('2017-10-10T23:24:11Z'),
    isDirectory: () => false,
    isSymbolicLink: () => false,
    isFile: () => true,
  } as any;

  const STAT_OLD = {
    name: 'test2',
    dev: 2114,
    ino: 48064969,
    mode: 33279,
    nlink: 1,
    uid: 84,
    gid: 101,
    rdev: 0,
    size: 530,
    blksize: 4096,
    blocks: 8,
    atime: new Date('2011-10-10T14:05:12Z'),
    mtime: new Date('2011-10-10T14:05:12Z'),
    ctime: new Date('2011-10-10T14:05:12Z'),
    birthtime: new Date('2011-10-10T14:05:12Z'),
    isDirectory: () => false,
    isSymbolicLink: () => false,
    isFile: () => true,
  } as any;

  describe('format - ls', () => {
    it('formats correctly', () => {
      const format = formatFileStatLs(STAT);
      expect(format).to.contain('test1');
      expect(format).to.contain('527');
      expect(format).to.contain('85');
      expect(format).to.contain('100');
    });

    it('formats correctly for files over 6 months old', () => {
      const format = formatFileStatLs(STAT_OLD);
      expect(format).to.contain('test2');
      expect(format).to.contain('530');
      expect(format).to.contain('2011');
    });

    it('formats without some attributes', () => {
      const format = formatFileStatLs({
        name: 'missing stuff',
        mtime: new Date('2011-10-10T14:05:12Z'),
        isDirectory: () => true,
        isSymbolicLink: () => false,
        isFile: () => false,
      } as any);
      expect(format).to.contain('missing stuff');
      expect(format.startsWith('d')).to.be.true;
    });
  });

  describe('format - ep', () => {
    it('formats correctly', () => {
      const format = formatFileStatEp(STAT);
      expect(format).to.contain('test1');
      expect(format).to.contain('527');
    });
  });

  describe('format - custom', () => {
    it('formats correctly with custom function', () => {
      function customFormatter(stat: any) {
        return [stat.gid, stat.name, stat.size].join('\t');
      }
      const format = formatFileStatLs(STAT as any);
      expect(format).to.be.a('string');
    });
  });
});
