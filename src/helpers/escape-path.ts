import path from 'path';

export function escapePath(filePath: string): string {
  return filePath.replace(/\\/g, '/');
}

export function normalizePath(filePath: string): string {
  return path.posix.normalize(filePath.replace(/\\/g, '/'));
}
