import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const CMD = 'STOU';
describe(CMD, () => {
  let mockClient: any;
  let cmdFn: Function;

  beforeEach(async () => {
    mockClient = {
      reply: vi.fn().mockResolvedValue({}),
      connector: {
        waitForConnection: vi.fn().mockResolvedValue({}),
        end: vi.fn(),
        socket: { pipe: vi.fn() },
      },
      commandSocket: { pause: vi.fn(), resume: vi.fn() },
      emit: vi.fn(),
      restByteCount: 0,
      fs: {
        getUniqueName: vi.fn((fileName: string) => `uniq_${fileName || 'x'}`),
        write: vi.fn().mockReturnValue({
          stream: {
            pipe: vi.fn(),
            once: vi.fn().mockImplementation((event: string, cb: () => void) => {
              if (event === 'finish') cb();
            }),
          },
          clientPath: 'test.txt',
        }),
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

  it('asks the file system for a unique name, passing the requested one', async () => {
    await cmdFn({ command: { arg: 'firmware.bin' } });
    expect(mockClient.fs.getUniqueName).toHaveBeenCalledWith('firmware.bin');
    expect(mockClient.fs.write.mock.calls[0][0]).toBe('uniq_firmware.bin');
  });
});
