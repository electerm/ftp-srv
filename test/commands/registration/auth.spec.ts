import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const CMD = 'AUTH';
describe(CMD, () => {
  let mockClient: any;
  let cmdFn: Function;

  beforeEach(async () => {
    mockClient = {
      reply: vi.fn().mockResolvedValue({}),
      commandSocket: { pause: vi.fn(), resume: vi.fn() },
      makeSecure: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined),
      secure: false,
      server: {
        options: {
          tls: { key: 'key', cert: 'cert' },
        },
      },
    };

    const cmd = await import(`../../../src/commands/registration/${CMD.toLowerCase()}`);
    cmdFn = cmd.default.handler.bind(mockClient);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('TLS // upgrades the control channel after the 234', async () => {
    await cmdFn({ command: { arg: 'TLS', directive: CMD } });
    expect(mockClient.reply.mock.calls[0][0]).toBe(234);
    expect(mockClient.commandSocket.pause).toHaveBeenCalled();
    expect(mockClient.makeSecure).toHaveBeenCalledTimes(1);
  });

  it('TLS // 502 when the server has no TLS options', async () => {
    mockClient.server.options.tls = false;
    await cmdFn({ command: { arg: 'TLS', directive: CMD } });
    expect(mockClient.reply.mock.calls[0][0]).toBe(502);
    expect(mockClient.makeSecure).not.toHaveBeenCalled();
  });

  it('TLS // 503 when already secure', async () => {
    mockClient.secure = true;
    await cmdFn({ command: { arg: 'TLS', directive: CMD } });
    expect(mockClient.reply.mock.calls[0][0]).toBe(503);
    expect(mockClient.makeSecure).not.toHaveBeenCalled();
  });

  it('TLS // closes the connection when the upgrade fails', async () => {
    mockClient.makeSecure.mockRejectedValue(new Error('boom'));
    await cmdFn({ log: { error: vi.fn() }, command: { arg: 'TLS', directive: CMD } });
    expect(mockClient.close).toHaveBeenCalled();
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
