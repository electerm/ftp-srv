import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import net from 'net';
import PassiveConnector from '../../src/connector/passive';

describe('Connector - Passive', () => {
  let mockConnection: any;
  let passive: PassiveConnector;

  beforeEach(() => {
    mockConnection = {
      reply: vi.fn().mockResolvedValue({}),
      close: vi.fn().mockResolvedValue({}),
      encoding: 'utf8',
      log: {
        info: () => {},
        error: () => {},
        debug: () => {},
        trace: () => {},
        warn: () => {},
        child: () => mockConnection.log,
      },
      commandSocket: {
        remoteAddress: '::ffff:127.0.0.1',
      },
      ip: '127.0.0.1',
      server: {
        options: {
          pasv_min: 1024,
          pasv_max: 65535,
        },
      },
    };

    passive = new PassiveConnector(mockConnection, {
      minPort: 1024,
      maxPort: 65535,
    });
  });

  afterEach(() => {
    passive.end();
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
});
