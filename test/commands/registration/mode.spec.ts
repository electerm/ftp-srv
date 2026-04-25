import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const CMD = 'MODE';
describe(CMD, () => {
  let mockClient: any;
  let cmdFn: Function;

  beforeEach(async () => {
    mockClient = {
      reply: vi.fn().mockResolvedValue({}),
    };

    const cmd = await import(`../../../src/commands/registration/${CMD.toLowerCase()}`);
    cmdFn = cmd.default.handler.bind(mockClient);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('successful - S mode', async () => {
    await cmdFn({ command: { arg: 'S' } });
    expect(mockClient.reply.mock.calls[0][0]).toBe(200);
  });

  it('unsuccessful - unsupported mode', async () => {
    await cmdFn({ command: { arg: 'X' } });
    expect(mockClient.reply.mock.calls[0][0]).toBe(504);
  });
});
