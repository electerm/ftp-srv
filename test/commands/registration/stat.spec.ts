import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const CMD = 'STAT';
describe(CMD, () => {
  let mockClient: any;
  let cmdFn: Function;

  beforeEach(async () => {
    mockClient = {
      reply: vi.fn().mockResolvedValue({}),
      server: {
        options: {
          greeting: ['Welcome'],
        },
      },
    };

    const cmd = await import(`../../../src/commands/registration/${CMD.toLowerCase()}`);
    cmdFn = cmd.default.handler.bind(mockClient);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('successful - server status', async () => {
    await cmdFn({ command: { arg: null } });
    expect(mockClient.reply).toHaveBeenCalled();
  });
});
