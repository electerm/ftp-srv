import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const CMD = 'ABOR';
describe.skip(CMD, () => {
  let mockClient: any;
  let cmdFn: Function;

  beforeEach(async () => {
    mockClient = {
      reply: vi.fn().mockResolvedValue({}),
      connector: {
        waitForConnection: vi.fn().mockResolvedValue({}),
        end: vi.fn(),
      },
    };

    const cmd = await import(`../../../src/commands/registration/${CMD.toLowerCase()}`);
    cmdFn = cmd.default.handler.bind(mockClient);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('successful | no active connection', async () => {
    mockClient.connector.waitForConnection.mockRejectedValue(new Error('no connection'));
    await cmdFn({ command: { arg: null } });
    expect(mockClient.connector.waitForConnection).toHaveBeenCalledTimes(1);
    expect(mockClient.connector.end).toHaveBeenCalledTimes(0);
    expect(mockClient.reply.mock.calls[0][0]).toBe(225);
  });

  it('successful | active connection', async () => {
    await cmdFn({ command: { arg: null } });
    expect(mockClient.connector.waitForConnection).toHaveBeenCalledTimes(1);
    expect(mockClient.connector.end).toHaveBeenCalledTimes(1);
    expect(mockClient.reply.mock.calls[0][0]).toBe(426);
    expect(mockClient.reply.mock.calls[1][0]).toBe(226);
  });
});
