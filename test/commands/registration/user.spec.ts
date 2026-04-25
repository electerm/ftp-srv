import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const CMD = 'USER';
describe(CMD, () => {
  let mockClient: any;
  let cmdFn: Function;

  beforeEach(async () => {
    mockClient = {
      reply: vi.fn().mockResolvedValue({}),
      login: vi.fn().mockResolvedValue(undefined),
      server: { options: { anonymous: false } },
    };

    const cmd = await import(`../../../src/commands/registration/${CMD.toLowerCase()}`);
    cmdFn = cmd.default.handler.bind(mockClient);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('successful | prompt for password', async () => {
    await cmdFn({ command: { arg: 'test', directive: CMD } });
    expect(mockClient.reply.mock.calls[0][0]).toBe(331);
  });

  it('successful | anonymous login', async () => {
    mockClient.server.options.anonymous = true;
    await cmdFn({ command: { arg: 'anonymous', directive: CMD } });
    expect(mockClient.reply.mock.calls[0][0]).toBe(230);
  });

  it('unsuccessful | no username provided', async () => {
    await cmdFn({ command: { arg: null, directive: CMD } });
    expect(mockClient.reply.mock.calls[0][0]).toBe(501);
  });

  it('unsuccessful | already set username', async () => {
    mockClient.username = 'test';
    await cmdFn({ command: { arg: 'other', directive: CMD } });
    expect(mockClient.reply.mock.calls[0][0]).toBe(530);
  });

  it('successful | regular login if anonymous is true', async () => {
    mockClient.server.options.anonymous = true;
    await cmdFn({ command: { arg: 'test', directive: CMD } });
    expect(mockClient.reply.mock.calls[0][0]).toBe(331);
  });

  it('successful | anonymous login with set username', async () => {
    mockClient.server.options.anonymous = true;
    mockClient.username = 'anonymous';
    await cmdFn({ command: { arg: 'anonymous', directive: CMD } });
    expect(mockClient.reply.mock.calls[0][0]).toBe(230);
  });

  it('unsuccessful | anonymous login fails', async () => {
    mockClient.server.options.anonymous = true;
    mockClient.login.mockRejectedValue(new Error('test'));
    await cmdFn({ log: { error: () => {} }, command: { arg: 'anonymous', directive: CMD } });
    expect(mockClient.reply.mock.calls[0][0]).toBe(530);
    expect(mockClient.login).toHaveBeenCalledTimes(1);
  });

  it('successful | does not login if already authenticated', async () => {
    mockClient.authenticated = true;
    await cmdFn({ command: { arg: 'test', directive: CMD } });
    expect(mockClient.reply.mock.calls[0][0]).toBe(230);
  });
});
