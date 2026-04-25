import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const CMD = 'PWD';
describe(CMD, () => {
  let mockClient: any;
  let cmdFn: Function;

  beforeEach(async () => {
    mockClient = {
      reply: vi.fn().mockResolvedValue({}),
      fs: { currentDirectory: vi.fn().mockReturnValue('/') },
    };

    const cmd = await import(`@dist/commands/registration/${CMD.toLowerCase()}.js`);
    cmdFn = cmd.default.handler.bind(mockClient);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('check', () => {
    it('fails on no fs', async () => {
      const badMockClient = { reply: vi.fn().mockResolvedValue({}) };
      const cmd = await import(`@dist/commands/registration/${CMD.toLowerCase()}.js`);
      const badCmdFn = cmd.default.handler.bind(badMockClient);

      await badCmdFn({ command: { arg: null } });
      expect(badMockClient.reply.mock.calls[0][0]).toBe(550);
    });

    it('fails on no fs currentDirectory command', async () => {
      const badMockClient = { reply: vi.fn().mockResolvedValue({}), fs: {} };
      const cmd = await import(`@dist/commands/registration/${CMD.toLowerCase()}.js`);
      const badCmdFn = cmd.default.handler.bind(badMockClient);

      await badCmdFn({ log: { error: () => {} }, command: { arg: null } });
      expect(badMockClient.reply.mock.calls[0][0]).toBe(550);
    });
  });

  it('successful', async () => {
    await cmdFn({ command: { arg: null, directive: CMD } });
    expect(mockClient.reply.mock.calls[0][0]).toBe(257);
  });

  it('successful with custom directory', async () => {
    mockClient.fs.currentDirectory.mockReturnValue('/test');
    await cmdFn({ command: { arg: null, directive: CMD } });
    expect(mockClient.reply.mock.calls[0][0]).toBe(257);
  });

  it('unsuccessful', async () => {
    mockClient.fs.currentDirectory.mockImplementation(() => { throw new Error('Bad'); });
    await cmdFn({ log: { error: () => {} }, command: { arg: null, directive: CMD } });
    expect(mockClient.reply.mock.calls[0][0]).toBe(550);
  });
});
