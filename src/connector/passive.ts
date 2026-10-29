import net from 'net';
import tls from 'tls';
import BaseConnector from './base';
import type FtpConnection from '../connection';
import { ConnectorError } from '../errors';
import { connectionRemoteAddress, sameIp } from '../helpers/same-ip';

/** How long a client may take to open the data connection after PASV. */
export const PASV_CONNECT_TIMEOUT = 5000;

/**
 * How long a PASV listener may sit unused. Clients that send PASV and never
 * dial (or die before RETR) would otherwise pin a port of the passive range
 * forever — a handful of those and the range is gone.
 */
export const PASV_IDLE_TIMEOUT = 30000;

interface PassiveOptions {
  pasvIp?: string | ((address: string) => string);
  minPort: number;
  maxPort: number;
}

interface ConnectionListener {
  (socket: net.Socket): void;
}

class PassiveConnector extends BaseConnector {
  private pasvIp: string | ((address: string) => string) | null;
  private minPort: number;
  private maxPort: number;
  private listeningPort: number | null;
  private connectionResolver: ((socket: net.Socket) => void) | null = null;
  private idleTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(connection: FtpConnection, options: PassiveOptions) {
    super(connection);
    this.pasvIp = options.pasvIp || null;
    this.minPort = options.minPort;
    this.maxPort = options.maxPort;
    this.listeningPort = null;
  }

  private clearIdleTimer(): void {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
  }

  closeServer(): void {
    this.clearIdleTimer();
    super.closeServer();
  }

  /**
   * Reject data connections that do not come from the client owning the
   * control connection: otherwise anyone who can guess the passive port can
   * steal (or poison) another session's transfer.
   */
  private handleConnection: ConnectionListener = (socket) => {
    const controlIp = connectionRemoteAddress(this.connection);

    if (!sameIp(controlIp, socket.remoteAddress)) {
      (this.connection as any).log?.error?.(
        { pasv_connection: socket.remoteAddress, cmd_connection: controlIp },
        'Connecting addresses do not match'
      );
      socket.destroy();
      this.closeServer();
      Promise.resolve((this.connection as any).reply(550, 'Remote addresses do not match'))
        .then(() => (this.connection as any).close())
        .catch(() => {});
      return;
    }

    this.clearIdleTimer();
    // One transfer per PASV: free the port as soon as the client dials in.
    this.closeServer();
    this.dataSocket = socket;

    socket.on('error', (err) => this.emitClientError('dataSocket', err));

    if (this.connectionResolver) {
      const resolver = this.connectionResolver;
      this.connectionResolver = null;
      resolver(socket);
    }
  };

  async setup(): Promise<{ ip: string; port: number }> {
    // A new PASV/EPSV replaces the previous listener: never leave it behind.
    this.end();
    this.connectionResolver = null;

    const secure = this.secure;
    let server: net.Server;

    if (secure) {
      const tlsOptions = this.tlsOptions();
      if (!tlsOptions) {
        throw new ConnectorError('TLS options are not configured on this server');
      }
      server = tls.createServer({ ...tlsOptions }, this.handleConnection);
    } else {
      server = net.createServer(this.handleConnection);
    }

    this.server = server;
    server.maxConnections = 1;
    server.on('error', (err) => {
      this.emitClientError('dataServer', err);
    });

    const port = await this.findPort();

    await new Promise<void>((resolve, reject) => {
      const onError = (err: Error): void => {
        reject(new ConnectorError(`Failed to create passive server: ${err.message}`));
      };
      server.once('error', onError);
      server.listen(port, () => {
        server.removeListener('error', onError);
        resolve();
      });
    });

    const address = server.address();
    if (!address || typeof address !== 'object') {
      this.closeServer();
      throw new ConnectorError('Failed to create passive server');
    }
    this.listeningPort = address.port;

    this.idleTimer = setTimeout(() => {
      (this.connection as any).log?.debug?.({ port: this.listeningPort }, 'Passive server idle timeout');
      this.closeServer();
    }, PASV_IDLE_TIMEOUT);
    if (typeof this.idleTimer.unref === 'function') {
      this.idleTimer.unref();
    }

    let pasvIp: string;
    if (typeof this.pasvIp === 'function') {
      pasvIp = this.pasvIp((this.connection as any).ip);
    } else if (this.pasvIp) {
      pasvIp = this.pasvIp;
    } else {
      pasvIp = (this.connection as any).ip || '127.0.0.1';
    }

    return { ip: pasvIp, port: address.port };
  }

  private async findPort(): Promise<number> {
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
        // Free the port right away instead of waiting for the idle timeout.
        this.closeServer();
        reject(new ConnectorError('Passive connection timed out'));
      }, PASV_CONNECT_TIMEOUT);

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
