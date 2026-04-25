import { Time } from './time';
import type { Stats } from 'fs';

export function formatFileStatLs(stat: Stats & { name?: string }): string {
  const name = stat.name || 'unknown';
  const mode = stat.mode ? stat.mode.toString(8).slice(-3) : '000';
  const nlink = stat.nlink || 1;
  const uid = stat.uid || 0;
  const gid = stat.gid || 0;
  const size = stat.size || 0;
  const mtime = Time.from(stat.mtime);
  const now = Time.now();

  let dateStr: string;
  if (now.diff(mtime, 'month') > 6) {
    dateStr = mtime.format('MMM DD YYYY');
  } else {
    dateStr = mtime.format('MMM DD HH:mm');
  }

  const type = stat.isDirectory() ? 'd' : (stat.isSymbolicLink() ? 'l' : '-');
  const modeStr = mode.padStart(3, '0');
  const perms = [
    type,
    Number(modeStr[0]) & 4 ? 'r' : '-',
    Number(modeStr[0]) & 2 ? 'w' : '-',
    Number(modeStr[0]) & 1 ? 'x' : '-',
    Number(modeStr[1]) & 4 ? 'r' : '-',
    Number(modeStr[1]) & 2 ? 'w' : '-',
    Number(modeStr[1]) & 1 ? 'x' : '-',
    Number(modeStr[2]) & 4 ? 'r' : '-',
    Number(modeStr[2]) & 2 ? 'w' : '-',
    Number(modeStr[2]) & 1 ? 'x' : '-',
  ].join('');

  return `${perms} ${String(nlink).padStart(2)} ${String(uid).padEnd(9)} ${String(gid).padEnd(9)} ${String(size).padStart(8)} ${dateStr} ${name}`;
}

export function formatFileStatEp(stat: Stats & { name?: string }): string {
  const name = stat.name || 'unknown';
  const size = stat.size || 0;
  const mtime = Math.floor(stat.mtime.getTime() / 1000);
  const isDir = stat.isDirectory() ? 1 : 0;

  return `+${mtime},${isDir ? 'd' : 'f'}${size},${name}`;
}
