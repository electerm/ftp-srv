import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const CMD = 'RNTO';
describe(CMD, () => {
  let mockClient: any;
  let cmdFn: Function;

  beforeEach(async () => {
    mockClient = {
      reply: vi.fn().mockResolvedValue({}),
      fs: { rename: vi.fn().mockResolvedValue(undefined) },
      _renameFrom: 'old.txt',
      emit: vi.fn(),
    };

    const cmd = await import(`@dist/commands/registration/${CMD.toLowerCase()}.js`);
    cmdFn = cmd.default.handler.bind(mockClient);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('successful', async () => {
    await cmdFn({ log: { error: () => {} }, command: { arg: 'new.txt' } });
    expect(mockClient.reply.mock.calls[0][0]).toBe(250);
  });

  it('unsuccessful - no RNFR', async () => {
    mockClient._renameFrom = null;
    await cmdFn({ command: { arg: 'new.txt' } });
    expect(mockClient.reply.mock.calls[0][0]).toBe(503);
  });
});
