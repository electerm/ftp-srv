import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import ActiveConnector from '../../../src/connector/active';

const CMD = 'EPRT';
describe(CMD, () => {
  let mockClient: any;
  let cmdFn: Function;

  beforeEach(async () => {
    mockClient = {
      reply: vi.fn().mockResolvedValue({}),
      ip: '192.168.0.100',
      connector: {
        end: vi.fn(),
        setup: vi.fn().mockResolvedValue(undefined),
      },
    };

    const cmd = await import(`../../../src/commands/registration/${CMD.toLowerCase()}`);
    cmdFn = cmd.default.handler.bind(mockClient);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('unsuccessful | no argument', async () => {
    await cmdFn({ log: { error: () => {} }, command: { arg: null } });
    expect(mockClient.reply.mock.calls[0][0]).toBe(501);
  });

  it('unsuccessful | invalid argument', async () => {
    await cmdFn({ log: { error: () => {} }, command: { arg: 'blah' } });
    expect(mockClient.reply.mock.calls[0][0]).toBe(504);
  });

  it('successful IPv4', async () => {
    await cmdFn({ log: { error: () => {} }, command: { arg: '|1|192.168.0.100|35286|' } });
    expect(mockClient.reply.mock.calls[0][0]).toBe(200);
    expect(mockClient.connector).toBeInstanceOf(ActiveConnector);
  });

  it('successful IPv6', async () => {
    mockClient.ip = '8536:933f:e7f3:3e91:6dc1:e8c6:8482:7b23';
    await cmdFn({ log: { error: () => {} }, command: { arg: '|2|8536:933f:e7f3:3e91:6dc1:e8c6:8482:7b23|35286|' } });
    expect(mockClient.reply.mock.calls[0][0]).toBe(200);
  });

  it('rejects an address that is not the client (FTP bounce)', async () => {
    await cmdFn({ log: { error: vi.fn() }, command: { arg: '|1|10.0.0.1|35286|' } });
    expect(mockClient.reply.mock.calls[0][0]).toBe(500);
  });

  it('replaces the previous connector instead of reusing it', async () => {
    const previous = mockClient.connector;
    await cmdFn({ log: { error: () => {} }, command: { arg: '|1|192.168.0.100|35286|' } });
    expect(previous.end).toHaveBeenCalled();
    expect(previous.setup).not.toHaveBeenCalled();
  });
});
