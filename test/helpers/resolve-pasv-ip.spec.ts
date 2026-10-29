import { describe, it, expect, beforeEach, vi } from 'vitest';
import { networkInterfaces } from 'os';
import { resolvePasvIp } from '../../src/helpers/resolve-pasv-ip';

vi.mock('os', async (importOriginal) => {
  const actual = await importOriginal<typeof import('os')>();
  return { ...actual, networkInterfaces: vi.fn() };
});

function ifaces(list: Array<[string, string]>): any {
  const out: any = {};
  for (const [address, netmask] of list) {
    out[address] = [{
      address,
      netmask,
      family: 'IPv4',
      mac: '00:00:00:00:00:00',
      internal: false,
      cidr: `${address}/24`,
    }];
  }
  return out;
}

function mockNets(value: any) {
  (networkInterfaces as any).mockReturnValue(value);
}

function connection(
  clientIp: string,
  bound: string,
  pasvUrl: string | null = null,
  localAddress: string | null = null,
): any {
  return {
    ip: clientIp,
    commandSocket: localAddress ? { localAddress } : undefined,
    server: {
      options: { pasv_url: pasvUrl },
      server: { address: () => ({ address: bound, family: 'IPv4', port: 2121 }) },
    },
  };
}

describe('resolvePasvIp', () => {
  beforeEach(() => {
    mockNets(ifaces([['10.200.101.109', '255.255.255.0']]));
  });

  it('advertises a real interface address when bound to a wildcard', () => {
    expect(resolvePasvIp(connection('10.200.101.50', '0.0.0.0'))).toBe('10.200.101.109');
  });

  it('never advertises 127.0.0.1 to a remote client', () => {
    expect(resolvePasvIp(connection('10.200.101.50', '0.0.0.0'))).not.toBe('127.0.0.1');
  });

  it('prefers an interface on the client subnet when there are several', () => {
    mockNets(ifaces([
      ['192.168.1.5', '255.255.255.0'],
      ['10.200.101.109', '255.255.255.0'],
    ]));
    expect(resolvePasvIp(connection('10.200.101.50', '0.0.0.0'))).toBe('10.200.101.109');
  });

  it('falls back to the first non-internal address when no subnet matches', () => {
    expect(resolvePasvIp(connection('172.16.5.5', '0.0.0.0'))).toBe('10.200.101.109');
  });

  it('echoes the client address back for a loopback client', () => {
    expect(resolvePasvIp(connection('127.0.0.1', '0.0.0.0'))).toBe('127.0.0.1');
  });

  it('normalises IPv4-mapped IPv6 client addresses', () => {
    expect(resolvePasvIp(connection('::ffff:10.200.101.50', '0.0.0.0'))).toBe('10.200.101.109');
  });

  it('uses the bound address when the server is not on a wildcard', () => {
    expect(resolvePasvIp(connection('10.200.101.50', '10.200.101.109'))).toBe('10.200.101.109');
  });

  it('honours an explicit pasv_url', () => {
    expect(resolvePasvIp(connection('10.200.101.50', '0.0.0.0', '1.2.3.4'))).toBe('1.2.3.4');
  });

  it('falls back to the client address when there is no usable interface', () => {
    mockNets({});
    expect(resolvePasvIp(connection('10.200.101.50', '0.0.0.0'))).toBe('10.200.101.50');
  });

  describe('with a control connection', () => {
    it('advertises the address the client connected to, not the first interface', () => {
      mockNets(ifaces([
        ['100.127.242.87', '255.255.255.255'],
        ['10.100.110.5', '255.255.255.0'],
      ]));
      expect(resolvePasvIp(connection('10.100.110.99', '0.0.0.0', null, '10.100.110.5')))
        .toBe('10.100.110.5');
    });

    it('does not consult the interface list when the local address is known', () => {
      mockNets(ifaces([['100.127.242.87', '255.255.255.255']]));
      expect(resolvePasvIp(connection('10.100.110.99', '0.0.0.0', null, '10.100.110.5')))
        .toBe('10.100.110.5');
    });

    it('uses the loopback local address for a loopback client', () => {
      expect(resolvePasvIp(connection('127.0.0.1', '0.0.0.0', null, '127.0.0.1'))).toBe('127.0.0.1');
    });

    it('normalises an IPv4-mapped local address', () => {
      expect(resolvePasvIp(connection('10.100.110.99', '0.0.0.0', null, '::ffff:10.100.110.5')))
        .toBe('10.100.110.5');
    });

    it('ignores a non-IPv4 local address', () => {
      expect(resolvePasvIp(connection('10.100.110.99', '0.0.0.0', null, 'fe80::1'))).toBe('10.200.101.109');
    });

    it('still honours an explicit pasv_url', () => {
      expect(resolvePasvIp(connection('10.100.110.99', '0.0.0.0', '1.2.3.4', '10.100.110.5'))).toBe('1.2.3.4');
    });
  });
});
