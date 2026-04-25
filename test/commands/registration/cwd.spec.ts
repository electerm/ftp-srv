import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const CMD = 'CWD';
describe(CMD, () => {
  let mockClient: any;
  let cmdFn: Function;

  beforeEach(async () => {
    mockClient = {
      reply: vi.fn().mockResolvedValue({}),
      fs: { chdir: vi.fn().mockResolvedValue(undefined) },
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

    it('fails on no fs chdir command', async () => {
      const badMockClient = { reply: vi.fn().mockResolvedValue({}), fs: {} };
      const cmd = await import(`@dist/commands/registration/${CMD.toLowerCase()}.js`);
      const badCmdFn = cmd.default.handler.bind(badMockClient);

      await badCmdFn({ command: { arg: null } });
      expect(badMockClient.reply.mock.calls[0][0]).toBe(402);
    });
  });

  it('successful', async () => {
    await cmdFn({ command: { arg: 'test', directive: CMD } });
    expect(mockClient.reply.mock.calls[0][0]).toBe(250);
    expect(mockClient.fs.chdir.mock.calls[0][0]).toBe('test');
  });

  it('successful with return path', async () => {
    mockClient.fs.chdir.mockResolvedValue('/test');
    await cmdFn({ command: { arg: 'test', directive: CMD } });
    expect(mockClient.reply.mock.calls[0][0]).toBe(250);
    expect(mockClient.fs.chdir.mock.calls[0][0]).toBe('test');
  });

  it('unsuccessful - chdir throws', async () => {
    mockClient.fs.chdir.mockRejectedValue(new Error('Bad'));
    await cmdFn({ log: { error: () => {} }, command: { arg: 'bad', directive: CMD } });
    expect(mockClient.reply.mock.calls[0][0]).toBe(550);
    expect(mockClient.fs.chdir.mock.calls[0][0]).toBe('bad');
  });
});
