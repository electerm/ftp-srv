/**
 * Address helpers for the FTP bounce guards.
 *
 * A client must not be able to make the server open data connections to
 * arbitrary hosts (FTP bounce / port scanning), so every data connection -
 * passive or active - has to be tied back to the address of the control
 * connection it belongs to.
 */

const normalise = (address?: string | null): string =>
  (address || '').replace(/^::ffff:/i, '').trim().toLowerCase();

/** True when both strings denote the same IPv4/IPv4-mapped address. */
export function sameIp (a?: string | null, b?: string | null): boolean {
  const left = normalise(a);
  const right = normalise(b);
  return Boolean(left) && Boolean(right) && left === right;
}

/**
 * The peer address of the control connection. `connection.ip` already does
 * this for a real FtpConnection; the fallback keeps duck-typed test/mock
 * connections working.
 */
export function connectionRemoteAddress (connection: any): string {
  return connection?.ip || connection?.commandSocket?.remoteAddress || '';
}
