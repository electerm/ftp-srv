import { describe, it, expect } from 'vitest';
import FtpServer from '../src/index';

describe('FtpServer', () => {
  it('should create an instance', () => {
    const server = new FtpServer({
      log: {
        info: () => {},
        error: () => {},
        debug: () => {},
        trace: () => {},
        warn: () => {},
        child: () => ({
          info: () => {},
          error: () => {},
          debug: () => {},
          trace: () => {},
          warn: () => {},
          child: () => {},
        }),
      } as any,
      url: 'ftp://127.0.0.1:0',
    });

    expect(server).toBeInstanceOf(FtpServer);
    expect(server.url.hostname).toBe('127.0.0.1');
  });

  it('should have correct default options', () => {
    const server = new FtpServer({
      log: {
        info: () => {},
        error: () => {},
        debug: () => {},
        trace: () => {},
        warn: () => {},
        child: () => ({
          info: () => {},
          error: () => {},
          debug: () => {},
          trace: () => {},
          warn: () => {},
          child: () => {},
        }),
      } as any,
    });

    expect(server.options.pasv_min).toBe(1024);
    expect(server.options.pasv_max).toBe(65535);
    expect(server.options.anonymous).toBe(false);
  });
});

describe('Commands', () => {
  it('should parse commands correctly', async () => {
    const { default: Commands } = await import('../src/commands');

    const mockConnection = {
      authenticated: false,
      log: {
        info: () => {},
        error: () => {},
        debug: () => {},
        trace: () => {},
        warn: () => {},
        child: () => ({
          info: () => {},
          error: () => {},
          debug: () => {},
          trace: () => {},
          warn: () => {},
          child: () => {},
        }),
      } as any,
      reply: () => Promise.resolve({}),
      server: {
        options: {
          blacklist: ['ALLO'],
          whitelist: [] as string[],
        },
      },
    };

    const commands = new Commands(mockConnection as any);
    const cmd = commands.parse('test arg1 arg2');

    expect(cmd.directive).toBe('TEST');
    expect(cmd.arg).toBe('arg1 arg2');
    expect(cmd.raw).toBe('test arg1 arg2');
  });

  it('should reject blacklisted commands', async () => {
    const { default: Commands } = await import('../src/commands');

    const mockConnection = {
      authenticated: false,
      log: {
        info: () => {},
        error: () => {},
        debug: () => {},
        trace: () => {},
        warn: () => {},
        child: () => ({
          info: () => {},
          error: () => {},
          debug: () => {},
          trace: () => {},
          warn: () => {},
          child: () => {},
        }),
      } as any,
      reply: async (...args: any[]) => {},
      server: {
        options: {
          blacklist: ['ALLO'],
          whitelist: [] as string[],
        },
      },
    };

    const replySpy = vi.spyOn(mockConnection, 'reply');
    const commands = new Commands(mockConnection as any);

    await commands.handle('allo');

    expect(replySpy).toHaveBeenCalled();
    expect((replySpy.mock.calls[0] as any)[0]).toBe(502);
  });
});
