import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const CMD = 'PBSZ';
describe(CMD, () => {
  let mockClient: any;
  let cmdFn: Function;

  beforeEach(async () => {
    mockClient = {
      reply: vi.fn().mockResolvedValue({}),
      secure: false,
      bufferSize: false,
    };

    const cmd = await import(`../../../src/commands/registration/${CMD.toLowerCase()}`);
    cmdFn = cmd.default.handler.bind(mockClient);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('202 on a plaintext control channel', async () => {
    await cmdFn({ command: { arg: '0' } });
    expect(mockClient.reply.mock.calls[0][0]).toBe(202);
  });

  it('accepts PBSZ 0 once secured', async () => {
    mockClient.secure = true;
    await cmdFn({ command: { arg: '0' } });
    expect(mockClient.reply.mock.calls[0][0]).toBe(200);
    expect(mockClient.reply.mock.calls[0][1]).toBe('OK');
    expect(mockClient.bufferSize).toBe(0);
  });

  it('still answers 200 but warns for a non-zero buffer size', async () => {
    mockClient.secure = true;
    await cmdFn({ command: { arg: '1024' } });
    expect(mockClient.reply.mock.calls[0][0]).toBe(200);
    expect(mockClient.reply.mock.calls[0][1]).toBe('Buffer too large: PBSZ=0');
  });
});
