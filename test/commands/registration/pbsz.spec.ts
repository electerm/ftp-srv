import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const CMD = 'PBSZ';
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

  it('successful', async () => {
    await cmdFn({ command: { arg: '0' } });
    expect(mockClient.reply.mock.calls[0][0]).toBe(200);
  });
});
