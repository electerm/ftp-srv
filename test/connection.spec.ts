import { describe, it, expect, vi } from 'vitest';
import { EventEmitter } from 'events';
import net from 'net';
import tls from 'tls';
import fs from 'fs';
import path from 'path';
import FtpConnection from '../src/connection';

const certDir = path.resolve(process.cwd(), 'test/cert');
const readFile = (name: string): Buffer => fs.readFileSync(path.join(certDir, name));

function fakeLogger(): any {
  const logger: any = {
    trace: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    fatal: vi.fn(),
  };
  logger.child = () => logger;
  return logger;
}

function fakeServer(): any {
  return {
    options: { pasv_url: null, pasv_min: 50000, pasv_max: 51000, root: '/tmp' },
    emit: vi.fn(),
  };
}

function fakeSocket(writable: boolean): any {
  const socket: any = new EventEmitter();
  socket.remoteAddress = '10.100.110.99';
  socket.localAddress = '10.100.110.5';
  socket.writable = writable;
  socket.destroyed = !writable;
  socket.write = vi.fn((msg: any, enc: any, cb: any) => {
    const done = typeof enc === 'function' ? enc : cb;
    if (typeof done === 'function') done();
    return true;
  });
  socket.address = () => ({ address: '10.100.110.5', family: 'IPv4', port: 2121 });
  socket.destroy = vi.fn();
  return socket;
}

describe('FtpConnection.close', () => {
  it('does not try to send 421 on a socket the client already closed', async () => {
    const log = fakeLogger();
    const socket = fakeSocket(false);
    const connection = new FtpConnection(fakeServer(), { log, socket });

    await connection.close();

    expect(socket.write).not.toHaveBeenCalled();
    expect(log.error).not.toHaveBeenCalled();
    expect(socket.destroy).toHaveBeenCalled();
  });

  it('still says goodbye on a live socket', async () => {
    const log = fakeLogger();
    const socket = fakeSocket(true);
    const connection = new FtpConnection(fakeServer(), { log, socket });

    await connection.close();

    expect(socket.write).toHaveBeenCalledTimes(1);
    expect(socket.write.mock.calls[0][0]).toBe('421 Closing connection\r\n');
    expect(socket.destroy).toHaveBeenCalled();
  });

  it('skips the reply when code is 0', async () => {
    const log = fakeLogger();
    const socket = fakeSocket(true);
    const connection = new FtpConnection(fakeServer(), { log, socket });

    await connection.close(0);

    expect(socket.write).not.toHaveBeenCalled();
  });
});

describe('FtpConnection.makeSecure', () => {
  it('refuses to upgrade when the server has no TLS options', async () => {
    const socket = fakeSocket(true);
    const connection = new FtpConnection(fakeServer(), { log: fakeLogger(), socket });

    await expect(connection.makeSecure()).rejects.toThrow('TLS is not configured');
    expect(connection.secure).toBe(false);
  });

  it('wraps the control socket in TLS and marks the connection secure', async () => {
    const { socket, client } = await socketPair();
    const server = fakeServer();
    server.options.tls = { key: readFile('server.key'), cert: readFile('server.crt') };
    const connection = new FtpConnection(server, { log: fakeLogger(), socket });

    await connection.makeSecure();

    expect(connection.commandSocket).toBeInstanceOf(tls.TLSSocket);
    expect(connection.commandSocket).not.toBe(socket);
    expect(connection.secure).toBe(true);

    client.destroy();
    connection.commandSocket.destroy();
  });
});

async function socketPair (): Promise<{ socket: net.Socket; client: net.Socket }> {
  const server = net.createServer();
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const port = (server.address() as net.AddressInfo).port;
  const client = net.createConnection({ host: '127.0.0.1', port });
  client.on('error', () => {});
  // Attach both listeners before awaiting either event: 'connect' may fire
  // while we are still waiting for the server's 'connection'.
  const connected = new Promise<void>((resolve) => client.once('connect', () => resolve()));
  const accepted = new Promise<net.Socket>((resolve) => server.once('connection', resolve));
  const socket = await accepted;
  await connected;
  server.close();
  return { socket, client };
}
