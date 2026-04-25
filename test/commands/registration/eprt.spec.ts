import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const CMD = 'EPRT';
describe(CMD, () => {
  let mockClient: any;
  let cmdFn: Function;

  beforeEach(async () => {
    mockClient = {
      reply: vi.fn().mockResolvedValue({}),
      connector: {
        setup: vi.fn().mockResolvedValue(undefined),
      },
    };

    const cmd = await import(`@dist/commands/registration/${CMD.toLowerCase()}.js`);
    cmdFn = cmd.default.handler.bind(mockClient);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('unsuccessful | no argument', async () => {
    await cmdFn({ log: { error: () => {} }, command: { arg: null } });
    expect(mockClient.reply.mock.calls[0][0]).toBe(501);
  });

  it('unsuccessful | invalid argument', async () => {
    await cmdFn({ log: { error: () => {} }, command: { arg: 'blah' } });
    expect(mockClient.reply.mock.calls[0][0]).toBe(501);
  });

  it('successful IPv4', async () => {
    await cmdFn({ log: { error: () => {} }, command: { arg: '|1|192.168.0.100|35286|' } });
    expect(mockClient.reply.mock.calls[0][0]).toBe(200);
  });

  it('successful IPv6', async () => {
    await cmdFn({ log: { error: () => {} }, command: { arg: '|2|8536:933f:e7f3:3e91:6dc1:e8c6:8482:7b23|35286|' } });
    expect(mockClient.reply.mock.calls[0][0]).toBe(200);
  });
});
