import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const CMD = 'PROT';
describe(CMD, () => {
  let mockClient: any;
  let cmdFn: Function;

  beforeEach(async () => {
    mockClient = {
      reply: vi.fn().mockResolvedValue({}),
    };

    const cmd = await import(`@dist/commands/registration/${CMD.toLowerCase()}.js`);
    cmdFn = cmd.default.handler.bind(mockClient);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('successful - P mode', async () => {
    await cmdFn({ command: { arg: 'P' } });
    expect(mockClient.reply.mock.calls[0][0]).toBe(200);
  });

  it('successful - C mode', async () => {
    await cmdFn({ command: { arg: 'C' } });
    expect(mockClient.reply.mock.calls[0][0]).toBe(200);
  });

  it('unsuccessful - unsupported mode', async () => {
    await cmdFn({ command: { arg: 'X' } });
    expect(mockClient.reply.mock.calls[0][0]).toBe(536);
  });
});
