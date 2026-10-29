import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import net from 'net';
import tls from 'tls';
import fs from 'fs';
import os from 'os';
import path from 'path';
import FtpServer from '../src/index';

const certDir = path.resolve(process.cwd(), 'test/cert');
const readFile = (name: string): Buffer => fs.readFileSync(path.join(certDir, name));

const silentLog: any = () => {};
silentLog.child = () => silentLog;
['trace', 'debug', 'info', 'warn', 'error', 'fatal'].forEach((level) => {
  silentLog[level] = () => {};
});

async function freePort (): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const port = (server.address() as net.AddressInfo).port;
      server.close(() => resolve(port));
    });
  });
}

/** Minimal FTP client that reads one reply line at a time. */
function lineReader (socket: net.Socket): () => Promise<string> {
  let buffer = '';
  const queued: string[] = [];
  const waiters: Array<(line: string) => void> = [];

  socket.on('data', (chunk: Buffer) => {
    buffer += chunk.toString('utf8');
    let index: number;
    while ((index = buffer.indexOf('\r\n')) >= 0) {
      const line = buffer.slice(0, index);
      buffer = buffer.slice(index + 2);
      const waiter = waiters.shift();
      if (waiter) {
        waiter(line);
      } else {
        queued.push(line);
      }
    }
  });

  return () => new Promise<string>((resolve) => {
    const next = queued.shift();
    if (next !== undefined) {
      resolve(next);
      return;
    }
    waiters.push(resolve);
  });
}

function waitForEvent (emitter: any, event: string): Promise<void> {
  return new Promise((resolve, reject) => {
    emitter.once(event, resolve);
    emitter.once('error', reject);
  });
}

describe('FTPS (AUTH TLS) end to end', () => {
  let server: FtpServer;
  let port: number;
  let root: string;
  const fileName = 'firmware.bin';
  const payload = Buffer.alloc(64 * 1024, 7);

  beforeAll(async () => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'ftp-srv-tls-'));
    fs.writeFileSync(path.join(root, fileName), payload);

    port = await freePort();
    server = new FtpServer({
      url: `ftp://127.0.0.1:${port}`,
      root,
      anonymous: false,
      pasv_min: 50200,
      pasv_max: 50300,
      tls: { key: readFile('server.key'), cert: readFile('server.crt') },
      log: silentLog,
    });
    server.on('login', ({ username, password }: any, resolve: any, reject: any) => {
      if (username === 'user' && password === 'pass') {
        resolve({ root });
        return;
      }
      reject(new Error('bad credentials'));
    });
    await server.listen();
  });

  afterAll(async () => {
    await server.close();
    fs.rmSync(root, { recursive: true, force: true });
  });

  it('negotiates AUTH TLS, PBSZ, PROT P and transfers over an encrypted data channel', async () => {
    const raw = net.createConnection({ host: '127.0.0.1', port });
    raw.on('error', () => {});
    const readRaw = lineReader(raw);
    await waitForEvent(raw, 'connect');

    expect(await readRaw()).toMatch(/^220/);

    // FEAT must advertise AUTH TLS now that TLS is configured.
    raw.write('FEAT\r\n');
    expect(await readRaw()).toMatch(/^211/);
    const features: string[] = [];
    let line = '';
    while (!/^211 /.test(line = await readRaw())) {
      features.push(line);
    }
    expect(features.join('\n')).toContain('AUTH TLS');
    expect(features.join('\n')).toContain('PBSZ');
    expect(features.join('\n')).toContain('PROT');

    raw.write('AUTH TLS\r\n');
    expect(await readRaw()).toMatch(/^234/);

    // Upgrade the same TCP connection to TLS (this is what a real FTPS client does).
    raw.removeAllListeners('data');
    const control = tls.connect({ socket: raw, rejectUnauthorized: false });
    control.on('error', () => {});
    await waitForEvent(control, 'secureConnect');
    const read = lineReader(control);

    control.write('USER user\r\n');
    expect(await read()).toMatch(/^331/);
    control.write('PASS pass\r\n');
    expect(await read()).toMatch(/^230/);

    control.write('PBSZ 0\r\n');
    expect(await read()).toMatch(/^200/);
    control.write('PROT P\r\n');
    expect(await read()).toMatch(/^200/);
    control.write('TYPE I\r\n');
    expect(await read()).toMatch(/^200/);

    control.write('PASV\r\n');
    const pasvReply = await read();
    expect(pasvReply).toMatch(/^227/);
    const numbers = pasvReply.match(/\(([^)]+)\)/)![1].split(',').map(Number);
    const dataHost = numbers.slice(0, 4).join('.');
    const dataPort = numbers[4] * 256 + numbers[5];

    // The data channel has to be TLS as well.
    const dataSocket = tls.connect({ host: dataHost, port: dataPort, rejectUnauthorized: false });
    dataSocket.on('error', () => {});
    await waitForEvent(dataSocket, 'secureConnect');
    expect((dataSocket as any).encrypted).toBe(true);

    const received: Buffer[] = [];
    dataSocket.on('data', (chunk: Buffer) => received.push(chunk));
    const dataEnd = new Promise<void>((resolve) => dataSocket.once('end', () => resolve()));

    control.write(`RETR ${fileName}\r\n`);
    expect(await read()).toMatch(/^150/);
    await dataEnd;
    expect(await read()).toMatch(/^226/);

    expect(Buffer.concat(received).length).toBe(payload.length);
    expect(Buffer.concat(received).equals(payload)).toBe(true);

    control.destroy();
  });

  it('refuses AUTH TLS when the server has no TLS options', async () => {
    const plainPort = await freePort();
    const plainServer = new FtpServer({
      url: `ftp://127.0.0.1:${plainPort}`,
      root,
      anonymous: true,
      pasv_min: 50300,
      pasv_max: 50400,
      log: silentLog,
    });
    await plainServer.listen();

    const socket = net.createConnection({ host: '127.0.0.1', port: plainPort });
    socket.on('error', () => {});
    const read = lineReader(socket);
    await waitForEvent(socket, 'connect');
    expect(await read()).toMatch(/^220/);

    socket.write('FEAT\r\n');
    const feat: string[] = [];
    expect(await read()).toMatch(/^211/);
    let line = '';
    while (!/^211 /.test(line = await read())) {
      feat.push(line);
    }
    expect(feat.join('\n')).not.toContain('AUTH TLS');
    expect(feat.join('\n')).not.toContain('PBSZ');
    expect(feat.join('\n')).not.toContain('PROT');

    socket.write('AUTH TLS\r\n');
    expect(await read()).toMatch(/^502/);

    socket.destroy();
    await plainServer.close();
  });
});
