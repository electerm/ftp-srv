import net from 'net';
import { networkInterfaces } from 'os';
import { isLocalAddress } from './is-local';

interface LocalIpv4 {
  address: string;
  netmask: string;
}

function ipv4ToInt(ip: string): number | null {
  const parts = (ip || '').split('.');
  if (parts.length !== 4) return null;
  let value = 0;
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null;
    const byte = Number(part);
    if (byte > 255) return null;
    value = value * 256 + byte;
  }
  return value >>> 0;
}

function getLocalIpv4(): LocalIpv4[] {
  const result: LocalIpv4[] = [];
  const nets = networkInterfaces();
  for (const iface of Object.values(nets)) {
    if (!iface) continue;
    for (const info of iface) {
      const family = String(info.family);
      if ((family === 'IPv4' || family === '4') && !info.internal && info.address) {
        result.push({ address: info.address, netmask: info.netmask });
      }
    }
  }
  return result;
}

function isSameSubnet(clientIp: string, address: string, netmask: string): boolean {
  const client = ipv4ToInt(clientIp);
  const local = ipv4ToInt(address);
  const mask = ipv4ToInt(netmask);
  if (client === null || local === null || mask === null) return false;
  return ((client & mask) >>> 0) === ((local & mask) >>> 0);
}

/**
 * Choose the address to advertise in a PASV reply.
 *
 * The client opens the data connection to whatever address we return, so
 * 127.0.0.1 only works for a client running on this same machine. When the
 * server listens on a wildcard address we must therefore pick a real interface
 * address - ideally one that shares a subnet with the client.
 */
export function resolvePasvIp(connection: any): string {
  const pasvUrl = connection.server?.options?.pasv_url;
  if (pasvUrl) return pasvUrl;

  const clientIp = (connection.ip || '').replace(/^::ffff:/, '');

  // The client reached us on one of our own addresses (or loopback), so
  // echoing it back is always reachable.
  if (clientIp && isLocalAddress(clientIp)) return clientIp;

  const serverAddr = connection.server?.server?.address?.() as net.AddressInfo | null;
  if (serverAddr && serverAddr.address !== '0.0.0.0' && serverAddr.address !== '::') {
    return serverAddr.address;
  }

  // Bound to a wildcard: returning 127.0.0.1 would make a remote client dial
  // itself. Advertise a real interface address instead.
  const locals = getLocalIpv4();
  const onSameSubnet = locals.find(({ address, netmask }) => isSameSubnet(clientIp, address, netmask));
  if (onSameSubnet) return onSameSubnet.address;
  if (locals.length > 0) return locals[0].address;

  return ipv4ToInt(clientIp) !== null ? clientIp : '127.0.0.1';
}
