import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const CMD = 'PORT';
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

  it('successful', async () => {
    await cmdFn({ command: { arg: '192,168,0,100,138,186' } });
    expect(mockClient.reply.mock.calls[0][0]).toBe(200);
  });

  it('unsuccessful - no argument', async () => {
    await cmdFn({ command: { arg: null } });
    expect(mockClient.reply.mock.calls[0][0]).toBe(501);
  });
});
