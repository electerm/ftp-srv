import path from 'path';
import { createReadStream, createWriteStream, constants, type Stats } from 'fs';
import fsAsync from './helpers/fs-async';
import { FileSystemError } from './errors';
import type FtpConnection from './connection';

const UNIX_SEP_REGEX = /\//g;
const WIN_SEP_REGEX = /\\/g;

export interface WriteOptions {
  append?: boolean;
  start?: number;
}

export interface ReadOptions {
  start?: number;
}

export interface WriteResult {
  stream: ReturnType<typeof createWriteStream>;
  clientPath: string;
}

export interface ReadResult {
  stream: ReturnType<typeof createReadStream>;
  clientPath: string;
}

class FileSystem {
  protected connection: FtpConnection;
  protected cwd: string;
  protected _root: string;

  constructor(connection: FtpConnection, { root, cwd }: { root?: string; cwd?: string } = {}) {
    this.connection = connection;
    this.cwd = path.normalize((cwd || '/').replace(WIN_SEP_REGEX, '/'));
    this._root = path.resolve(root || process.cwd());
  }

  get root(): string {
    return this._root;
  }

  protected _resolvePath(file: string = '.') {
    const resolvedPath = file.replace(WIN_SEP_REGEX, '/');

    const joinedPath = path.isAbsolute(resolvedPath)
      ? path.normalize(resolvedPath)
      : path.posix.join('/', this.cwd, resolvedPath);

    const fsPath = path.resolve(
      path.join(this.root, joinedPath)
        .replace(UNIX_SEP_REGEX, path.sep)
        .replace(WIN_SEP_REGEX, path.sep)
    );

    const clientPath = joinedPath.replace(WIN_SEP_REGEX, '/');

    return { clientPath, fsPath };
  }

  currentDirectory(): string {
    return this.cwd;
  }

  async get(fileName: string): Promise<Stats & { name: string }> {
    const { fsPath } = this._resolvePath(fileName);
    const stat = await fsAsync.stat(fsPath);
    return Object.assign(stat, { name: fileName });
  }

  async list(dirPath: string = '.'): Promise<Array<Stats & { name: string }>> {
    const { fsPath } = this._resolvePath(dirPath);
    const fileNames = await fsAsync.readdir(fsPath);
    
    const stats = await Promise.all(
      fileNames.map(async (fileName) => {
        const filePath = path.join(fsPath, fileName);
        try {
          await fsAsync.access(filePath, constants.F_OK);
          const stat = await fsAsync.stat(filePath);
          return Object.assign(stat, { name: fileName });
        } catch {
          return null;
        }
      })
    );

    return stats.filter((stat): stat is Stats & { name: string } => stat !== null);
  }

  async chdir(dirPath: string = '.'): Promise<string> {
    const { fsPath, clientPath } = this._resolvePath(dirPath);
    const stat = await fsAsync.stat(fsPath);
    
    if (!stat.isDirectory()) {
      throw new FileSystemError('Not a valid directory');
    }

    this.cwd = clientPath;
    return this.currentDirectory();
  }

  write(fileName: string, { append = false, start }: WriteOptions = {}): WriteResult {
    const { fsPath, clientPath } = this._resolvePath(fileName);
    const stream = createWriteStream(fsPath, { flags: !append ? 'w+' : 'a+', start });
    
    stream.once('error', () => {
      fsAsync.unlink(fsPath).catch(() => {});
    });
    stream.once('close', () => stream.end());

    return { stream, clientPath };
  }

  async read(fileName: string, { start }: ReadOptions = {}): Promise<ReadResult> {
    const { fsPath, clientPath } = this._resolvePath(fileName);
    const stat = await fsAsync.stat(fsPath);
    
    if (stat.isDirectory()) {
      throw new FileSystemError('Cannot read a directory');
    }

    const stream = createReadStream(fsPath, { flags: 'r', start });
    return { stream, clientPath };
  }

  async delete(targetPath: string): Promise<void> {
    const { fsPath } = this._resolvePath(targetPath);
    const stat = await fsAsync.stat(fsPath);
    
    if (stat.isDirectory()) {
      await fsAsync.rmdir(fsPath);
    } else {
      await fsAsync.unlink(fsPath);
    }
  }

  async mkdir(dirPath: string): Promise<string> {
    const { fsPath } = this._resolvePath(dirPath);
    await fsAsync.mkdir(fsPath, { recursive: true });
    return fsPath;
  }

  async rename(from: string, to: string): Promise<void> {
    const { fsPath: fromPath } = this._resolvePath(from);
    const { fsPath: toPath } = this._resolvePath(to);
    await fsAsync.rename(fromPath, toPath);
  }

  async chmod(targetPath: string, mode: string | number): Promise<void> {
    const { fsPath } = this._resolvePath(targetPath);
    const modeNum = typeof mode === 'string' ? parseInt(mode, 8) : mode;
    await fsAsync.chmod(fsPath, modeNum);
  }

  getUniqueName(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  }
}

export default FileSystem;
