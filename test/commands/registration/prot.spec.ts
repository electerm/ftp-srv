import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const CMD = 'PROT';
describe(CMD, () => {
  let mockClient: any;
  let cmdFn: Function;

  beforeEach(async () => {
    mockClient = {
      reply: vi.fn().mockResolvedValue({}),
      secure: true,
      bufferSize: 0,
    };

    const cmd = await import(`../../../src/commands/registration/${CMD.toLowerCase()}`);
    cmdFn = cmd.default.handler.bind(mockClient);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('202 on a plaintext control channel', async () => {
    mockClient.secure = false;
    await cmdFn({ command: { arg: 'P' } });
    expect(mockClient.reply.mock.calls[0][0]).toBe(202);
  });

  it('503 when PBSZ has not been sent', async () => {
    mockClient.bufferSize = false;
    await cmdFn({ command: { arg: 'P' } });
    expect(mockClient.reply.mock.calls[0][0]).toBe(503);
  });

  it('successful - P mode', async () => {
    await cmdFn({ command: { arg: 'P' } });
    expect(mockClient.reply.mock.calls[0][0]).toBe(200);
  });

  it('536 for an unencrypted data channel (C)', async () => {
    await cmdFn({ command: { arg: 'C' } });
    expect(mockClient.reply.mock.calls[0][0]).toBe(536);
  });

  it('504 for an unknown level', async () => {
    await cmdFn({ command: { arg: 'X' } });
    expect(mockClient.reply.mock.calls[0][0]).toBe(504);
  });
});
