import { describe, it, expect, vi } from 'vitest';
import { sameIp, connectionRemoteAddress } from '../../src/helpers/same-ip';

describe('sameIp', () => {
  it('matches identical addresses', () => {
    expect(sameIp('127.0.0.1', '127.0.0.1')).toBe(true);
    expect(sameIp('10.100.110.5', '10.100.110.5')).toBe(true);
  });

  it('matches an IPv4-mapped IPv6 form', () => {
    expect(sameIp('::ffff:127.0.0.1', '127.0.0.1')).toBe(true);
    expect(sameIp('127.0.0.1', '::FFFF:127.0.0.1')).toBe(true);
  });

  it('rejects different addresses', () => {
    expect(sameIp('127.0.0.1', '127.0.0.2')).toBe(false);
    expect(sameIp('10.0.0.1', '10.0.0.2')).toBe(false);
  });

  it('rejects missing addresses', () => {
    expect(sameIp('', '127.0.0.1')).toBe(false);
    expect(sameIp('127.0.0.1', null)).toBe(false);
    expect(sameIp(undefined, undefined)).toBe(false);
  });
});

describe('connectionRemoteAddress', () => {
  it('prefers the connection getter', () => {
    expect(connectionRemoteAddress({ ip: '10.0.0.9', commandSocket: { remoteAddress: '10.0.0.1' } }))
      .toBe('10.0.0.9');
  });

  it('falls back to the command socket for duck-typed connections', () => {
    expect(connectionRemoteAddress({ commandSocket: { remoteAddress: '10.0.0.1' } })).toBe('10.0.0.1');
  });

  it('returns an empty string when there is nothing to read', () => {
    expect(connectionRemoteAddress({})).toBe('');
    expect(connectionRemoteAddress(undefined)).toBe('');
  });
});
