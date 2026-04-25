import net from 'net';
import BaseConnector from './base';
import type FtpConnection from '../connection';
import { ConnectorError } from '../errors';
import { isLocalAddress } from '../helpers/is-local';

class PassiveConnector extends BaseConnector {
  private pasvIp: string | ((address: string) => string) | null;
  private minPort: number;
  private maxPort: number;
  private listeningPort: number | null;
  private connectionResolver: ((socket: net.Socket) => void) | null = null;

  constructor(connection: FtpConnection, options: { pasvIp?: string | ((address: string) => string); minPort: number; maxPort: number }) {
    super(connection);
    this.pasvIp = options.pasvIp || null;
    this.minPort = options.minPort;
    this.maxPort = options.maxPort;
    this.listeningPort = null;
  }

  async setup(): Promise<{ ip: string; port: number }> {
    this.dataSocket = null;
    this.connectionResolver = null;

    return new Promise((resolve, reject) => {
      const server = net.createServer();
      this.server = server;

      // Capture the data connection as soon as the client connects,
      // even if getSocket() has not been called yet.
      server.on('connection', (socket) => {
        this.dataSocket = socket;
        server.close();
        this.server = null;
        if (this.connectionResolver) {
          const resolver = this.connectionResolver;
          this.connectionResolver = null;
          resolver(socket);
        }
      });

      server.once('error', (err) => {
        reject(new ConnectorError(`Failed to create passive server: ${err.message}`));
      });

      const tryListen = (port: number) => {
        server.listen(port, () => {
          const address = server.address();
          if (typeof address === 'object' && address) {
            this.listeningPort = address.port;

            let pasvIp: string;
            if (typeof this.pasvIp === 'function') {
              const clientIp = this.connection.ip;
              pasvIp = this.pasvIp(clientIp);
            } else if (this.pasvIp) {
              pasvIp = this.pasvIp;
            } else {
              pasvIp = this.connection.ip || '127.0.0.1';
            }

            resolve({ ip: pasvIp, port: address.port });
          }
        });
      };

      const findPort = async (): Promise<number> => {
        for (let port = this.minPort; port <= this.maxPort; port++) {
          try {
            await new Promise<void>((resolve, reject) => {
              const testServer = net.createServer();
              testServer.once('error', reject);
              testServer.listen(port, () => {
                testServer.close();
                resolve();
              });
            });
            return port;
          } catch {
            continue;
          }
        }
        throw new ConnectorError('No available ports');
      };

      findPort()
        .then(tryListen)
        .catch(reject);
    });
  }

  async getSocket(): Promise<net.Socket> {
    // If the client already connected before this was called, return immediately.
    if (this.dataSocket) {
      return this.dataSocket;
    }

    if (!this.server) {
      throw new ConnectorError('Passive server not setup');
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.connectionResolver = null;
        reject(new ConnectorError('Passive connection timed out'));
      }, 5000);

      this.connectionResolver = (socket) => {
        clearTimeout(timeout);
        resolve(socket);
      };

      this.server!.once('error', (err) => {
        clearTimeout(timeout);
        this.connectionResolver = null;
        reject(new ConnectorError(`Passive connection error: ${err.message}`));
      });
    });
  }

  async waitForConnection(): Promise<net.Socket> {
    return this.getSocket();
  }
}

export default PassiveConnector;
