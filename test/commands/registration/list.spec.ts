import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const CMD = 'LIST';
describe(CMD, () => {
  let mockClient: any;
  let cmdFn: Function;

  beforeEach(async () => {
    mockClient = {
      reply: vi.fn().mockResolvedValue({}),
      connector: {
        waitForConnection: vi.fn().mockResolvedValue({
          write: vi.fn(),
          end: vi.fn(),
        }),
        end: vi.fn(),
      },
      fs: {
        list: vi.fn().mockResolvedValue([]),
      },
    };

    const cmd = await import(`../../../src/commands/registration/${CMD.toLowerCase()}`);
    cmdFn = cmd.default.handler.bind(mockClient);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('successful', async () => {
    await cmdFn({ command: { arg: null } });
    expect(mockClient.reply).toHaveBeenCalled();
  });
});
