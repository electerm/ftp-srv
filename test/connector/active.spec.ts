import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import net from 'net';
import tls from 'tls';
import fs from 'fs';
import path from 'path';
import ActiveConnector from '../../src/connector/active';
import { SocketError } from '../../src/errors';

const certDir = path.resolve(process.cwd(), 'test/cert');
const readFile = (name: string): Buffer => fs.readFileSync(path.join(certDir, name));

describe('Connector - Active', () => {
  const host = '127.0.0.1';
  let PORT: number;
  let active: ActiveConnector;
  let mockConnection: any;
  let server: net.Server;
  const sockets: net.Socket[] = [];

  beforeEach(async () => {
    mockConnection = {
      ip: '127.0.0.1',
      secure: false,
      commandSocket: {
        remoteAddress: '::ffff:127.0.0.1',
      },
      server: {
        options: { tls: { key: readFile('server.key'), cert: readFile('server.crt') } },
        emit: vi.fn(),
      },
      log: { error: vi.fn(), trace: vi.fn(), debug: vi.fn(), info: vi.fn(), warn: vi.fn() },
    };

    server = net.createServer();
    server.on('connection', (socket) => sockets.push(socket));

    await new Promise<void>((resolve, reject) => {
      server.once('error', reject);
      server.once('listening', resolve);
      server.listen(0, host);
    });

    PORT = (server.address() as net.AddressInfo).port;
    active = new ActiveConnector(mockConnection);
  });

  afterEach(async () => {
    sockets.forEach((socket) => socket.destroy());
    sockets.length = 0;
    await new Promise<void>((resolve) => server.close(() => resolve()));
    active.end();
  });

  it('sets up a connection', async () => {
    await active.setup(host, PORT);
    await active.getSocket();
  });

  it('waits for connection', async () => {
    await active.setup(host, PORT);
    const dataSocket = await active.waitForConnection();
    expect(dataSocket).toBeInstanceOf(net.Socket);
  });

  it('refuses to dial an address that is not the client (FTP bounce)', async () => {
    await expect(active.setup('10.0.0.1', PORT)).rejects.toBeInstanceOf(SocketError);
    await expect(active.setup('10.0.0.1', PORT)).rejects.toMatchObject({
      message: 'The given address is not yours',
      code: 500,
    });
  });

  it('accepts an IPv4-mapped control address', async () => {
    await expect(active.setup(host, PORT)).resolves.toBeUndefined();
  });

  it('wraps the data socket in TLS on a secure control channel', async () => {
    mockConnection.secure = true;
    await active.setup(host, PORT);
    const dataSocket = await active.getSocket();
    expect(dataSocket).toBeInstanceOf(tls.TLSSocket);
    expect(active.socket).toBe(dataSocket);
  });

  it('fails with a clear error when TLS is enabled but not configured', async () => {
    mockConnection.secure = true;
    mockConnection.server.options.tls = false;
    await active.setup(host, PORT);
    await expect(active.getSocket()).rejects.toThrow('TLS options are not configured');
  });
});
