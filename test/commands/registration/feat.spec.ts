import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const CMD = 'FEAT';

function replyLines (mockClient: any): string {
  const args = mockClient.reply.mock.calls[0].slice(1);
  return args
    .map((arg: any) => (typeof arg === 'string' ? arg : arg?.message || ''))
    .join('\n');
}

describe(CMD, () => {
  let mockClient: any;
  let cmdFn: Function;

  beforeEach(async () => {
    mockClient = {
      reply: vi.fn().mockResolvedValue({}),
      server: { options: { tls: false } },
      commands: {
        registry: {
          AUTH: { flags: { feat: 'AUTH TLS' } },
          PBSZ: { flags: { feat: 'PBSZ' } },
          PROT: { flags: { feat: 'PROT' } },
          NOOP: { flags: { no_auth: true } },
        },
      },
    };

    const cmd = await import(`../../../src/commands/registration/${CMD.toLowerCase()}`);
    cmdFn = cmd.default.handler.bind(mockClient);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('successful', async () => {
    await cmdFn({ command: { directive: CMD } });
    expect(mockClient.reply.mock.calls[0][0]).toBe(211);
  });

  it('always advertises the plain features', async () => {
    await cmdFn({ command: { directive: CMD } });
    const body = replyLines(mockClient);
    ['EPRT', 'EPSV', 'MDTM', 'PASV', 'REST STREAM', 'SIZE', 'TVFS', 'UTF8'].forEach((feat) => {
      expect(body).toContain(` ${feat}`);
    });
  });

  it('hides the TLS features when TLS is not configured', async () => {
    await cmdFn({ command: { directive: CMD } });
    const body = replyLines(mockClient);
    expect(body).not.toContain('AUTH TLS');
    expect(body).not.toContain('PBSZ');
    expect(body).not.toContain('PROT');
  });

  it('advertises the TLS features once TLS is configured', async () => {
    mockClient.server.options.tls = { key: 'k', cert: 'c' };
    await cmdFn({ command: { directive: CMD } });
    const body = replyLines(mockClient);
    expect(body).toContain('AUTH TLS');
    expect(body).toContain('PBSZ');
    expect(body).toContain('PROT');
  });

  it('does not duplicate a feature that is in both lists', async () => {
    await cmdFn({ command: { directive: CMD } });
    const body = replyLines(mockClient);
    expect(body.match(/EPRT/g)).toHaveLength(1);
  });
});
