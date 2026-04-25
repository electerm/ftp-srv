import { networkInterfaces } from 'os';

const LOCAL_IPS = new Set(['127.0.0.1', '::1', 'localhost']);

export function getLocalIps(): Set<string> {
  const nets = networkInterfaces();
  const ips = new Set<string>(LOCAL_IPS);
  
  for (const interfaces of Object.values(nets)) {
    if (!interfaces) continue;
    for (const iface of interfaces) {
      if (iface.address) {
        ips.add(iface.address);
      }
    }
  }
  
  return ips;
}

export function isLocalAddress(address: string): boolean {
  return LOCAL_IPS.has(address) || getLocalIps().has(address);
}
