import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const CMD = 'DELE';
describe(CMD, () => {
  let mockClient: any;
  let cmdFn: Function;

  beforeEach(async () => {
    mockClient = {
      reply: vi.fn().mockResolvedValue({}),
      fs: { delete: vi.fn().mockResolvedValue(undefined) },
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

    it('fails on no fs delete command', async () => {
      const badMockClient = { reply: vi.fn().mockResolvedValue({}), fs: {} };
      const cmd = await import(`@dist/commands/registration/${CMD.toLowerCase()}.js`);
      const badCmdFn = cmd.default.handler.bind(badMockClient);

      await badCmdFn({ command: { arg: null } });
      expect(badMockClient.reply.mock.calls[0][0]).toBe(402);
    });
  });

  it('successful', async () => {
    await cmdFn({ command: { arg: 'test.txt', directive: CMD } });
    expect(mockClient.reply.mock.calls[0][0]).toBe(250);
    expect(mockClient.fs.delete.mock.calls[0][0]).toBe('test.txt');
  });

  it('unsuccessful', async () => {
    mockClient.fs.delete.mockRejectedValue(new Error('Bad'));
    await cmdFn({ log: { error: () => {} }, command: { arg: 'bad', directive: CMD } });
    expect(mockClient.reply.mock.calls[0][0]).toBe(550);
    expect(mockClient.fs.delete.mock.calls[0][0]).toBe('bad');
  });
});
