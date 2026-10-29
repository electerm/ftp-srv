import net from 'net';
import { EventEmitter } from 'events';
import type FtpConnection from '../connection';

export interface ConnectorOptions {
  socket?: net.Socket;
}

abstract class BaseConnector extends EventEmitter {
  protected connection: FtpConnection;
  protected dataSocket: net.Socket | null = null;
  protected server: net.Server | null = null;

  constructor(connection: FtpConnection) {
    super();
    this.connection = connection;
  }

  abstract getSocket(): Promise<net.Socket>;
  abstract setup(...args: any[]): Promise<any>;
  abstract waitForConnection(): Promise<net.Socket>;

  get socket(): net.Socket | null {
    return this.dataSocket;
  }

  /** The data channel has to be encrypted as soon as the control channel is. */
  get secure(): boolean {
    return Boolean((this.connection as any)?.secure);
  }

  protected tlsOptions(): any {
    return (this.connection as any)?.server?.options?.tls || null;
  }

  protected emitClientError(context: string, error: Error): void {
    const server: any = (this.connection as any)?.server;
    if (server && typeof server.emit === 'function') {
      server.emit('client-error', { connection: this.connection, context, error });
    }
  }

  closeServer(): void {
    if (this.server) {
      const server = this.server;
      this.server = null;
      server.close();
    }
  }

  end(): void {
    if (this.dataSocket) {
      this.dataSocket.destroy();
      this.dataSocket = null;
    }
    this.closeServer();
  }

  protected createDataSocket(): net.Socket {
    this.dataSocket = new net.Socket();
    this.dataSocket.on('error', (err) => {
      // Emitting an unhandled 'error' would throw and take the whole server
      // down, which is easy to trigger: PORT an address that then refuses.
      if (this.listenerCount('error') > 0) {
        this.emit('error', err);
      }
      this.emitClientError('dataSocket', err);
    });
    return this.dataSocket;
  }
}

export default BaseConnector;
