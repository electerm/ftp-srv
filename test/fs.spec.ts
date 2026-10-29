import { describe, it, expect, beforeAll } from 'vitest';
import path from 'path';
import { FileSystem } from '../src/index';

describe('FileSystem', () => {
  let fs: any;

  beforeAll(() => {
    fs = new FileSystem({} as any, {
      root: '/tmp/ftp-srv',
      cwd: 'file/1/2/3'
    });
  });

  describe('#_resolvePath', () => {
    it('gets correct relative path - dot', () => {
      const result = fs._resolvePath('.');
      expect(result).toBeTypeOf('object');
      expect(result.clientPath).toBe(path.normalize('/file/1/2/3'));
      expect(result.fsPath).toBe(path.resolve('/tmp/ftp-srv/file/1/2/3'));
    });

    it('gets correct relative path - parent', () => {
      const result = fs._resolvePath('..');
      expect(result).toBeTypeOf('object');
      expect(result.clientPath).toBe(path.normalize('/file/1/2'));
      expect(result.fsPath).toBe(path.resolve('/tmp/ftp-srv/file/1/2'));
    });

    it('gets correct relative path - subdirectory', () => {
      const result = fs._resolvePath('other');
      expect(result).toBeTypeOf('object');
      expect(result.clientPath).toBe(path.normalize('/file/1/2/3/other'));
      expect(result.fsPath).toBe(path.resolve('/tmp/ftp-srv/file/1/2/3/other'));
    });

    it('gets correct absolute path', () => {
      const result = fs._resolvePath('/other');
      expect(result).toBeTypeOf('object');
      expect(result.clientPath).toBe(path.normalize('/other'));
      expect(result.fsPath).toBe(path.resolve('/tmp/ftp-srv/other'));
    });

    it('cannot escape root - unix', () => {
      const result = fs._resolvePath('../../../../../../../../../../..');
      expect(result).toBeTypeOf('object');
      expect(result.clientPath).toBe(path.normalize('/'));
      expect(result.fsPath).toBe(path.resolve('/tmp/ftp-srv'));
    });

    it('cannot escape root - win', () => {
      const result = fs._resolvePath('.\\..\\..\\..\\..\\..\\..\\');
      expect(result).toBeTypeOf('object');
      expect(result.clientPath).toBe(path.normalize('/'));
      expect(result.fsPath).toBe(path.resolve('/tmp/ftp-srv'));
    });

    it('cannot escape root - backslash prefix', () => {
      const result = fs._resolvePath('\\/../../../../../../');
      expect(result).toBeTypeOf('object');
      expect(result.clientPath).toBe(path.normalize('/'));
      expect(result.fsPath).toBe(path.resolve('/tmp/ftp-srv'));
    });

    it('resolves to file', () => {
      const result = fs._resolvePath('/cool/file.txt');
      expect(result).toBeTypeOf('object');
      expect(result.clientPath).toBe(path.normalize('/cool/file.txt'));
      expect(result.fsPath).toBe(path.resolve('/tmp/ftp-srv/cool/file.txt'));
    });
  });

  describe('#getUniqueName', () => {
    it('generates a name without arguments', () => {
      const name = fs.getUniqueName();
      expect(name).toBeTypeOf('string');
      expect(name.length).toBeGreaterThan(0);
    });

    it('generates different names', () => {
      expect(fs.getUniqueName()).not.toBe(fs.getUniqueName());
    });

    it('keeps the requested file name (upstream signature)', () => {
      const name = fs.getUniqueName('firmware.bin');
      expect(name).toContain('firmware.bin');
      expect(name).not.toBe('firmware.bin');
    });

    it('keeps the requested directory', () => {
      const name = fs.getUniqueName('/updates/firmware.bin');
      expect(path.dirname(name)).toBe('/updates');
      expect(path.basename(name)).toContain('firmware.bin');
    });
  });
});
