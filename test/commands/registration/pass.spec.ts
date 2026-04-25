import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const CMD = 'PASS';
describe(CMD, () => {
  let mockClient: any;
  let cmdFn: Function;

  beforeEach(async () => {
    mockClient = {
      reply: vi.fn().mockResolvedValue({}),
      login: vi.fn().mockResolvedValue(undefined),
      username: 'test',
    };

    const cmd = await import(`@dist/commands/registration/${CMD.toLowerCase()}.js`);
    cmdFn = cmd.default.handler.bind(mockClient);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('successful', async () => {
    await cmdFn({ command: { arg: 'password', directive: CMD } });
    expect(mockClient.reply.mock.calls[0][0]).toBe(230);
  });

  it('successful (already authenticated)', async () => {
    mockClient.authenticated = true;
    await cmdFn({ command: { arg: 'password', directive: CMD } });
    expect(mockClient.reply.mock.calls[0][0]).toBe(202);
  });

  it('unsuccessful - login rejects with string', async () => {
    mockClient.login.mockRejectedValue('bad');
    await cmdFn({ log: { error: () => {} }, command: { arg: 'bad', directive: CMD } });
    expect(mockClient.reply.mock.calls[0][0]).toBe(530);
  });

  it('unsuccessful - login rejects with object', async () => {
    mockClient.login.mockRejectedValue({});
    await cmdFn({ log: { error: () => {} }, command: { arg: 'bad', directive: CMD } });
    expect(mockClient.reply.mock.calls[0][0]).toBe(530);
  });

  it('unsuccessful - no username set', async () => {
    mockClient.username = null;
    await cmdFn({ command: { arg: 'password', directive: CMD } });
    expect(mockClient.reply.mock.calls[0][0]).toBe(503);
  });
});
