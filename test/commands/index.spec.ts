import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import FtpCommands from '../../src/commands';

describe('FtpCommands', () => {
  let commands: FtpCommands;
  let mockConnection: any;

  beforeEach(() => {
    mockConnection = {
      authenticated: false,
      log: {
        info: () => {},
        error: () => {},
        debug: () => {},
        trace: () => {},
        warn: () => {},
        child: () => mockConnection.log,
      },
      reply: vi.fn().mockResolvedValue({}),
      server: {
        options: {
          blacklist: ['ALLO'],
          whitelist: [] as string[],
        },
      },
    };

    commands = new FtpCommands(mockConnection);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('parse', () => {
    it('no args: test', () => {
      const cmd = commands.parse('test');
      expect(cmd.directive).toBe('TEST');
      expect(cmd.arg).toBe(null);
      expect(cmd.raw).toBe('test');
    });

    it('one arg: test arg', () => {
      const cmd = commands.parse('test arg');
      expect(cmd.directive).toBe('TEST');
      expect(cmd.arg).toBe('arg');
      expect(cmd.raw).toBe('test arg');
    });

    it('two args: test arg1 arg2', () => {
      const cmd = commands.parse('test arg1 arg2');
      expect(cmd.directive).toBe('TEST');
      expect(cmd.arg).toBe('arg1 arg2');
      expect(cmd.raw).toBe('test arg1 arg2');
    });

    it('two args with quotes: test "hello world"', () => {
      const cmd = commands.parse('test "hello world"');
      expect(cmd.directive).toBe('TEST');
      expect(cmd.arg).toBe('hello world');
      expect(cmd.raw).toBe('test "hello world"');
    });

    it('two args, with flags: test -l arg1 -A arg2 --zz88A', () => {
      const cmd = commands.parse('test -l arg1 -A arg2 --zz88A');
      expect(cmd.directive).toBe('TEST');
      expect(cmd.arg).toBe('arg1 arg2 --zz88A');
      expect(cmd.flags).toEqual(['-l', '-A']);
      expect(cmd.raw).toBe('test -l arg1 -A arg2 --zz88A');
    });

    it('one arg, with flags: list -l', () => {
      const cmd = commands.parse('list -l');
      expect(cmd.directive).toBe('LIST');
      expect(cmd.arg).toBe(null);
      expect(cmd.flags).toEqual(['-l']);
      expect(cmd.raw).toBe('list -l');
    });

    it('does not check for option flags', () => {
      const cmd = commands.parse('retr -test');
      expect(cmd.directive).toBe('RETR');
      expect(cmd.arg).toBe('-test');
      expect(cmd.flags).toEqual([]);
    });
  });

  describe('handle', () => {
    it('fails with unsupported command', async () => {
      await commands.handle('bad');
      expect(mockConnection.reply).toHaveBeenCalledTimes(1);
      expect((mockConnection.reply.mock.calls[0] as any)[0]).toBe(502);
    });

    it('fails with blacklisted command', async () => {
      await commands.handle('allo');
      expect(mockConnection.reply).toHaveBeenCalledTimes(1);
      expect((mockConnection.reply.mock.calls[0] as any)[0]).toBe(502);
      expect((mockConnection.reply.mock.calls[0] as any)[1]).toMatch(/blacklisted/);
    });

    it('fails with non whitelisted command', async () => {
      commands.whitelist = ['USER'];
      await commands.handle('auth');
      expect(mockConnection.reply).toHaveBeenCalledTimes(1);
      expect((mockConnection.reply.mock.calls[0] as any)[0]).toBe(502);
      expect((mockConnection.reply.mock.calls[0] as any)[1]).toMatch(/whitelisted/);
    });

    it('fails due to being unauthenticated', async () => {
      await commands.handle('stor');
      expect(mockConnection.reply).toHaveBeenCalledTimes(1);
      expect((mockConnection.reply.mock.calls[0] as any)[0]).toBe(530);
      expect((mockConnection.reply.mock.calls[0] as any)[1]).toMatch(/authentication/);
    });
  });
});
