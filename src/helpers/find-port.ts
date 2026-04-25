import { networkInterfaces } from 'os';

export function getNextPortFactory(hostname: string | undefined, minPort: number, maxPort: number = 65535): () => Promise<number> {
  let lastPort = minPort - 1;

  return async () => {
    const isLocal = hostname === '127.0.0.1' || hostname === '::1' || hostname === 'localhost';
    
    for (let attempt = 0; attempt < maxPort - minPort; attempt++) {
      const port = lastPort + 1 > maxPort ? minPort : lastPort + 1;
      lastPort = port;

      try {
        const server = await import('net').then(net => net.createServer());
        await new Promise<void>((resolve, reject) => {
          server.once('error', reject);
          server.listen(port, isLocal ? hostname : undefined, () => {
            server.close();
            resolve();
          });
        });
        return port;
      } catch {
        continue;
      }
    }

    throw new Error('No available ports in the specified range');
  };
}
