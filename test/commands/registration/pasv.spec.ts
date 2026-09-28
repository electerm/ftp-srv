import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('os', async (importOriginal) => {
  const actual = await importOriginal<typeof import('os')>();
  return {
    ...actual,
    networkInterfaces: vi.fn(() => ({
      en0: [{
        address: '10.200.101.109',
        netmask: '255.255.255.0',
        family: 'IPv4',
        mac: '00:00:00:00:00:00',
        internal: false,
        cidr: '10.200.101.109/24',
      }],
    })),
  };
});

const CMD = 'PASV';

describe(CMD, () => {
  let mockClient: any;
  let cmdFn: Function;

  beforeEach(async () => {
    mockClient = {
      ip: '10.200.101.50',
      reply: vi.fn().mockResolvedValue({}),
      server: {
        options: { pasv_url: null, pasv_min: 1024, pasv_max: 65535 },
        server: { address: () => ({ address: '0.0.0.0', family: 'IPv4', port: 2121 }) },
      },
      connector: null,
    };

    const cmd = await import(`../../../src/commands/registration/${CMD.toLowerCase()}`);
    cmdFn = cmd.default.handler.bind(mockClient);
  });

  afterEach(() => {
    const connector = mockClient.connector;
    if (connector && connector.server) {
      try {
        connector.server.close();
      } catch {
        // already closed
      }
    }
  });

  it('advertises a reachable address instead of 127.0.0.1 for a remote client', async () => {
    await cmdFn({ log: { error: () => {} }, command: {} });

    const [code, message] = mockClient.reply.mock.calls[0];
    expect(code).toBe(227);
    expect(message).toContain('10,200,101,109');
    expect(message).not.toContain('127,0,0,1');
  });

  it('honours an explicit pasv_url', async () => {
    mockClient.server.options.pasv_url = '1.2.3.4';
    await cmdFn({ log: { error: () => {} }, command: {} });

    const [code, message] = mockClient.reply.mock.calls[0];
    expect(code).toBe(227);
    expect(message).toContain('1,2,3,4');
  });
});
