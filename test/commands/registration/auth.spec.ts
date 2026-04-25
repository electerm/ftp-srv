import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const CMD = 'AUTH';
describe(CMD, () => {
  let mockClient: any;
  let cmdFn: Function;

  beforeEach(async () => {
    mockClient = {
      reply: vi.fn().mockResolvedValue({}),
      commandSocket: {
        removeAllListeners: vi.fn(),
        on: vi.fn(),
      },
      _handleData: vi.fn(),
      server: {
        options: {
          tls: {},
        },
      },
    };

    const cmd = await import(`../../../src/commands/registration/${CMD.toLowerCase()}`);
    cmdFn = cmd.default.handler.bind(mockClient);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('TLS // supported', async () => {
    await cmdFn({ command: { arg: 'TLS', directive: CMD } });
    expect(mockClient.reply.mock.calls[0][0]).toBe(234);
    expect(mockClient.secure).toBe(true);
  });

  it('SSL // not supported', async () => {
    await cmdFn({ command: { arg: 'SSL', directive: CMD } });
    expect(mockClient.reply.mock.calls[0][0]).toBe(504);
  });

  it('bad // bad', async () => {
    await cmdFn({ command: { arg: 'bad', directive: CMD } });
    expect(mockClient.reply.mock.calls[0][0]).toBe(504);
  });
});
