import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const CMD = 'TYPE';
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

  it('successful - ASCII', async () => {
    await cmdFn({ command: { arg: 'A' } });
    expect(mockClient.reply.mock.calls[0][0]).toBe(200);
  });

  it('successful - BINARY', async () => {
    await cmdFn({ command: { arg: 'I' } });
    expect(mockClient.reply.mock.calls[0][0]).toBe(200);
  });

  it('unsuccessful - unsupported type', async () => {
    await cmdFn({ command: { arg: 'X' } });
    expect(mockClient.reply.mock.calls[0][0]).toBe(504);
  });
});
