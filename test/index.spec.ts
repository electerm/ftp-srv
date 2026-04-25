import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import FtpServer from '../src/index';
// @ts-ignore
const FtpClient = require('@icetee/ftp');
import * as fs from 'fs';
import * as path from 'path';

const mockLogger = {
  info: () => {},
  error: () => {},
  debug: () => {},
  trace: () => {},
  warn: () => {},
  child: () => mockLogger,
};

describe('Integration', () => {
  let client: any;
  let server: FtpServer;
  let connection: any;
  const clientDirectory = `${process.cwd()}/test_tmp`;

  beforeAll(async () => {
    await startServer({ url: 'ftp://127.0.0.1:8880' });
  });

  afterAll(async () => {
    await server.close();
    directoryPurge(clientDirectory);
  });

  beforeAll(() => {
    directoryPurge(clientDirectory);
    fs.mkdirSync(clientDirectory, { recursive: true });
  });

  function directoryPurge(dir: string) {
    const dirExists = fs.existsSync(dir);
    if (!dirExists) return;

    const list = fs.readdirSync(dir);
    list.map((item) => path.resolve(dir, item)).forEach((item) => {
      const itemExists = fs.existsSync(item);
      if (!itemExists) return;

      const stat = fs.statSync(item);
      if (stat.isDirectory()) directoryPurge(item);
      else fs.unlinkSync(item);
    });

    fs.rmSync(dir, { recursive: true, force: true });
  }

  async function startServer(options: any = {}) {
    server = new FtpServer({
      log: mockLogger as any,
      pasv_url: '127.0.0.1',
      pasv_min: 8881,
      greeting: ['hello', 'world'],
      anonymous: true,
      ...options,
    });

    server.on('login', (data: any, resolve: any) => {
      connection = data.connection;
      resolve({ root: clientDirectory });
    });

    return server.listen();
  }

  function connectClient(options: any = {}): Promise<void> {
    return new Promise((resolve, reject) => {
      client = new FtpClient();
      client.once('ready', () => resolve());
      client.once('error', (err: any) => reject(err));
      client.connect({
        host: server.url.hostname,
        port: server.url.port,
        user: 'test',
        password: 'test',
        ...options,
      });
    });
  }

  function closeClient(): Promise<void> {
    return new Promise((resolve, reject) => {
      client.once('close', () => resolve());
      client.once('error', (err: any) => reject(err));
      client.logout((err: any) => {
        expect(err).toBeUndefined();
      });
    });
  }

  describe('#ASCII', () => {
    beforeAll(async () => {
      await connectClient({
        host: server.url.hostname,
        port: server.url.port,
        user: 'test',
        password: 'test',
      });
    });

    afterAll(async () => {
      await closeClient();
    });

    it('TYPE A', async () => {
      await new Promise<void>((resolve, reject) => {
        (client as any).ascii((err: any) => {
          if (err) reject(err);
          else resolve();
        });
      });
    });

    it('LIST .', async () => {
      await new Promise<void>((resolve, reject) => {
        client.list('.', (err: any, data: any) => {
          if (err) reject(err);
          else {
            expect(data).toBeInstanceOf(Array);
            resolve();
          }
        });
      });
    });
  });

  describe('#BINARY', () => {
    beforeAll(async () => {
      await connectClient({
        host: server.url.hostname,
        port: server.url.port,
        user: 'test',
        password: 'test',
      });
    });

    afterAll(async () => {
      await closeClient();
    });

    it('TYPE I', async () => {
      await new Promise<void>((resolve, reject) => {
        (client as any).binary((err: any) => {
          if (err) reject(err);
          else resolve();
        });
      });
    });

    it('CWD ..', async () => {
      await new Promise<void>((resolve, reject) => {
        client.cwd('..', (err: any, data: any) => {
          if (err) reject(err);
          else {
            expect(data).toEqual('/');
            resolve();
          }
        });
      });
    });

    it('PWD', async () => {
      await new Promise<void>((resolve, reject) => {
        client.pwd((err: any, data: any) => {
          if (err) reject(err);
          else {
            expect(data).toEqual('/');
            resolve();
          }
        });
      });
    });

    it('MKD testdir', async () => {
      const testDir = `${clientDirectory}/testdir`;
      if (fs.existsSync(testDir)) {
        fs.rmSync(testDir, { recursive: true, force: true });
      }

      await new Promise<void>((resolve, reject) => {
        client.mkdir('testdir', (err: any) => {
          if (err) reject(err);
          else {
            expect(fs.existsSync(testDir)).toBe(true);
            resolve();
          }
        });
      });
    });

    it('RMD testdir', async () => {
      await new Promise<void>((resolve, reject) => {
        client.rmdir('testdir', (err: any) => {
          if (err) reject(err);
          else {
            expect(fs.existsSync(`${clientDirectory}/testdir`)).toBe(false);
            resolve();
          }
        });
      });
    });
  });
});
