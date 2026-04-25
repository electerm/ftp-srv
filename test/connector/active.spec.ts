import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import net from 'net';
import ActiveConnector from '../../src/connector/active';

describe('Connector - Active', () => {
  const host = '127.0.0.1';
  let PORT: number;
  let active: ActiveConnector;
  let mockConnection: any;
  let server: net.Server;

  beforeEach(async () => {
    mockConnection = {
      commandSocket: {
        remoteAddress: '::ffff:127.0.0.1',
      },
    };

    server = net.createServer()
      .on('connection', (socket) => socket.destroy());

    await new Promise<void>((resolve, reject) => {
      server.once('error', reject);
      server.once('listening', resolve);
      server.listen(0, host);
    });

    PORT = (server.address() as net.AddressInfo).port;
    active = new ActiveConnector(mockConnection);
  });

  afterEach(async () => {
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
});
