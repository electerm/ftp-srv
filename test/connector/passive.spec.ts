import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import net from 'net';
import tls from 'tls';
import fs from 'fs';
import path from 'path';
import { EventEmitter } from 'events';
import PassiveConnector, { PASV_IDLE_TIMEOUT } from '../../src/connector/passive';

const certDir = path.resolve(process.cwd(), 'test/cert');
const readFile = (name: string): Buffer => fs.readFileSync(path.join(certDir, name));

function makeLogger (): any {
  const logger: any = {
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    trace: vi.fn(),
    warn: vi.fn(),
  };
  logger.child = () => logger;
  return logger;
}

function makeConnection (overrides: any = {}): any {
  return {
    reply: vi.fn().mockResolvedValue({}),
    close: vi.fn().mockResolvedValue({}),
    encoding: 'utf8',
    log: makeLogger(),
    commandSocket: { remoteAddress: '::ffff:127.0.0.1' },
    ip: '127.0.0.1',
    secure: false,
    server: {
      options: { pasv_min: 50000, pasv_max: 50100 },
      emit: vi.fn(),
    },
    ...overrides,
  };
}

describe('Connector - Passive', () => {
  let mockConnection: any;
  let passive: PassiveConnector;

  beforeEach(() => {
    mockConnection = makeConnection();
    passive = new PassiveConnector(mockConnection, { minPort: 50000, maxPort: 50100 });
  });

  afterEach(() => {
    passive.end();
    vi.useRealTimers();
  });

  it('cannot wait for connection with no server', async () => {
    await expect(passive.waitForConnection()).rejects.toThrow('Passive server not setup');
  });

  it('sets up a server', async () => {
    const result = await passive.setup();
    expect(result.ip).toBe('127.0.0.1');
    expect(result.port).toBeGreaterThan(0);
  });

  it('accepts connection', async () => {
    await passive.setup();
    const { port } = await passive.setup();
    net.createConnection(port, '127.0.0.1');
    await passive.waitForConnection();
  });

  it('rejects a data connection that comes from another host', async () => {
    await passive.setup();

    const intruder: any = new EventEmitter();
    intruder.remoteAddress = '203.0.113.5';
    intruder.destroy = vi.fn();
    (passive as any).handleConnection(intruder);
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(intruder.destroy).toHaveBeenCalled();
    expect(mockConnection.reply).toHaveBeenCalledWith(550, 'Remote addresses do not match');
    expect(mockConnection.close).toHaveBeenCalled();
    // The hijacked socket must never become the transfer socket.
    expect(passive.socket).toBeNull();
  });

  it('closes the previous listener when PASV is sent again (no port leak)', async () => {
    await passive.setup();
    const firstServer: net.Server = (passive as any).server;
    expect(firstServer.listening).toBe(true);

    await passive.setup();
    expect(firstServer.listening).toBe(false);
    expect((passive as any).server).not.toBe(firstServer);
    expect((passive as any).server.listening).toBe(true);
  });

  it('releases the port when the client never dials in', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    await passive.setup();
    const server: net.Server = (passive as any).server;
    expect(server.listening).toBe(true);

    vi.advanceTimersByTime(PASV_IDLE_TIMEOUT + 10);

    expect(server.listening).toBe(false);
    expect((passive as any).server).toBeNull();
  });

  it('encrypts the data channel when the control channel is secure', async () => {
    const key = readFile('server.key');
    const cert = readFile('server.crt');
    const secureConnection = makeConnection({
      secure: true,
      server: {
        options: {
          pasv_min: 50000,
          pasv_max: 50100,
          tls: { key, cert },
        },
        emit: vi.fn(),
      },
    });
    passive = new PassiveConnector(secureConnection, { minPort: 50000, maxPort: 50100 });

    const { port } = await passive.setup();
    const client = tls.connect({ host: '127.0.0.1', port, rejectUnauthorized: false });
    client.on('error', () => {});

    const socket = await passive.waitForConnection();
    expect(socket.encrypted).toBe(true);
    client.destroy();
  });
});
