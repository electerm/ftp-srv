import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const CMD = 'EPSV';
describe(CMD, () => {
  let mockClient: any;
  let cmdFn: Function;

  beforeEach(async () => {
    mockClient = {
      reply: vi.fn().mockResolvedValue({}),
      server: {
        options: {
          pasv_url: '127.0.0.1',
        },
      },
      connector: {
        setup: vi.fn().mockResolvedValue({ ip: '127.0.0.1', port: 8080 }),
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
    const [code] = mockClient.reply.mock.calls[0];
    expect(code).toBe(229);
  });
});
