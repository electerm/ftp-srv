import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const CMDS = ['SIZE', 'STAT', 'STRU', 'SYST', 'TYPE', 'PBSZ', 'OPTS', 'NOOP', 'MKD', 'MODE', 'NLST', 'LIST', 'MDTM', 'HELP', 'FEAT', 'EPSV', 'CDUP', 'ABOR', 'ALLO'];

for (const CMD of CMDS) {
  describe(CMD, () => {
    let mockClient: any;
    let cmdFn: Function;

    beforeEach(async () => {
      mockClient = {
        reply: vi.fn().mockResolvedValue({}),
        fs: {
          get: vi.fn().mockResolvedValue({ size: 1234 }),
          write: vi.fn().mockReturnValue({ 
            stream: { pipe: vi.fn(), once: vi.fn(), on: vi.fn() }, 
            clientPath: 'test.txt' 
          }),
          list: vi.fn().mockResolvedValue([]),
          listFiles: vi.fn().mockResolvedValue(''),
          mkdir: vi.fn().mockResolvedValue(undefined),
          currentDirectory: vi.fn().mockReturnValue('/'),
          getUniqueName: vi.fn().mockResolvedValue('unique.txt'),
          delete: vi.fn().mockResolvedValue(undefined),
        },
        connector: {
          waitForConnection: vi.fn().mockResolvedValue({ pipe: vi.fn(), end: vi.fn() }),
          end: vi.fn(),
          setup: vi.fn().mockResolvedValue(undefined),
          socket: { pipe: vi.fn() },
        },
        server: {
          options: { greeting: ['Welcome'], features: [], pasv_url: '127.0.0.1', pasv_min: 1024, pasv_max: 65535 },
          server: { address: vi.fn().mockReturnValue({ address: '127.0.0.1', port: 21 }) },
        },
        close: vi.fn(),
        commandSocket: { pause: vi.fn(), resume: vi.fn() },
        emit: vi.fn(),
        restByteCount: 0,
      };

      const cmd = await import(`@dist/commands/registration/${CMD.toLowerCase()}.js`);
      cmdFn = cmd.default.handler.bind(mockClient);
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('successful', async () => {
      await cmdFn({ log: { error: () => {} }, command: { arg: 'test' } });
      expect(mockClient.reply).toHaveBeenCalled();
    });
  });
}
