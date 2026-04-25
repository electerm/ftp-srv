/**
 * Integration test for dist/esm build using Node.js native test runner.
 * Uses basic-ftp (promise-based) for real FTP operations.
 * Run: node --test test-esm.js
 */
import { describe, test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Readable, Writable } from 'node:stream';
import { Client } from 'basic-ftp';

// Dynamic import for the ESM build
const { default: FtpServer } = await import('../dist/esm/index.js');

const silentLogger = {
  info: () => {}, error: () => {}, debug: () => {}, trace: () => {}, warn: () => {},
  child() { return silentLogger; },
};

const PORT = 9010;
const PASV_MIN = 9011;

async function withClient(fn) {
  const client = new Client();
  client.ftp.verbose = false;
  try {
    await client.access({ host: '127.0.0.1', port: PORT, user: 'anonymous', password: '', secure: false });
    return await fn(client);
  } finally {
    client.close();
  }
}

describe('dist/esm', () => {
  let server;
  const dir = path.join(os.tmpdir(), 'ftp-srv-int-esm');

  before(async () => {
    fs.mkdirSync(dir, { recursive: true });
    // No pasv_url — tests passive mode auto-detection
    server = new FtpServer({
      url: `ftp://127.0.0.1:${PORT}`,
      pasv_min: PASV_MIN,
      pasv_max: PASV_MIN + 100,
      anonymous: true,
      log: silentLogger,
    });
    server.on('login', (_, resolve) => resolve({ root: dir }));
    await server.listen();
  });

  after(async () => {
    await server.close();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  test('connects and authenticates', async () => {
    await withClient(async () => {});
  });

  test('PWD returns /', async () => {
    await withClient(async (client) => {
      const cwd = await client.pwd();
      assert.equal(cwd, '/');
    });
  });

  test('LIST returns entries array', async () => {
    await withClient(async (client) => {
      const list = await client.list();
      assert.ok(Array.isArray(list));
    });
  });

  test('MKD creates and RMD removes a directory', async () => {
    await withClient(async (client) => {
      await client.ensureDir('/subdir');
      assert.ok(fs.existsSync(path.join(dir, 'subdir')));
      await client.cd('/');
      await client.removeDir('/subdir');
      assert.ok(!fs.existsSync(path.join(dir, 'subdir')));
    });
  });

  test('STOR uploads a file and RETR downloads it', async () => {
    const content = 'hello from esm integration test';
    await withClient(async (client) => {
      const readable = Readable.from([content]);
      await client.uploadFrom(readable, 'hello.txt');
      assert.ok(fs.existsSync(path.join(dir, 'hello.txt')));
      assert.equal(fs.readFileSync(path.join(dir, 'hello.txt'), 'utf8'), content);
    });
    // Download in a new connection
    await withClient(async (client) => {
      const chunks = [];
      const writable = new Writable({ write(chunk, _, cb) { chunks.push(chunk); cb(); } });
      await client.downloadTo(writable, 'hello.txt');
      assert.equal(Buffer.concat(chunks).toString(), content);
    });
    fs.rmSync(path.join(dir, 'hello.txt'));
  });

  test('DELE deletes a file', async () => {
    const filePath = path.join(dir, 'todelete.txt');
    fs.writeFileSync(filePath, 'bye');
    await withClient(async (client) => {
      await client.remove('todelete.txt');
      assert.ok(!fs.existsSync(filePath));
    });
  });

  test('RNFR/RNTO renames a file', async () => {
    const src = path.join(dir, 'oldname.txt');
    fs.writeFileSync(src, 'rename me');
    await withClient(async (client) => {
      await client.rename('oldname.txt', 'newname.txt');
      assert.ok(!fs.existsSync(src));
      assert.ok(fs.existsSync(path.join(dir, 'newname.txt')));
    });
    fs.rmSync(path.join(dir, 'newname.txt'));
  });

  test('SIZE returns correct file size', async () => {
    const content = '12345678';
    fs.writeFileSync(path.join(dir, 'sized.txt'), content);
    await withClient(async (client) => {
      const size = await client.size('sized.txt');
      assert.equal(size, Buffer.byteLength(content));
    });
    fs.rmSync(path.join(dir, 'sized.txt'));
  });
});
