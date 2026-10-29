import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import ActiveConnector from '../../../src/connector/active';

const CMD = 'PORT';
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

  it('successful', async () => {
    await cmdFn({ log: { error: vi.fn() }, command: { arg: '192,168,0,100,138,186' } });
    expect(mockClient.reply.mock.calls[0][0]).toBe(200);
    expect(mockClient.connector).toBeInstanceOf(ActiveConnector);
  });

  it('rejects an address that is not the client (FTP bounce)', async () => {
    await cmdFn({ log: { error: vi.fn() }, command: { arg: '10,0,0,1,138,186' } });
    expect(mockClient.reply.mock.calls[0][0]).toBe(500);
    expect(mockClient.reply.mock.calls[0][1]).toBe('The given address is not yours');
  });

  it('drops the previous connector (e.g. a PASV listener)', async () => {
    const previous = mockClient.connector;
    await cmdFn({ log: { error: vi.fn() }, command: { arg: '192,168,0,100,138,186' } });
    expect(previous.end).toHaveBeenCalled();
  });

  it('unsuccessful - no argument', async () => {
    await cmdFn({ command: { arg: null } });
    expect(mockClient.reply.mock.calls[0][0]).toBe(501);
  });

  it('unsuccessful - malformed argument', async () => {
    await cmdFn({ command: { arg: '192,168,0,100' } });
    expect(mockClient.reply.mock.calls[0][0]).toBe(501);
  });
});
