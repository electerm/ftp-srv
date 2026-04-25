import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const CMD = 'RNFR';
describe(CMD, () => {
  let mockClient: any;
  let cmdFn: Function;

  beforeEach(async () => {
    mockClient = {
      reply: vi.fn().mockResolvedValue({}),
      fs: { get: vi.fn().mockResolvedValue({}) },
    };

    const cmd = await import(`@dist/commands/registration/${CMD.toLowerCase()}.js`);
    cmdFn = cmd.default.handler.bind(mockClient);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('successful', async () => {
    await cmdFn({ command: { arg: 'old.txt' } });
    expect(mockClient.reply.mock.calls[0][0]).toBe(350);
  });

  it('unsuccessful - no path', async () => {
    await cmdFn({ command: { arg: null } });
    expect(mockClient.reply.mock.calls[0][0]).toBe(501);
  });
});
