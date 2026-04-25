import net from 'net';
import { EventEmitter } from 'events';
import type FtpConnection from '../connection';
import { ConnectorError } from '../errors';

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

  end(): void {
    if (this.dataSocket) {
      this.dataSocket.destroy();
      this.dataSocket = null;
    }
    if (this.server) {
      this.server.close();
      this.server = null;
    }
  }

  protected createDataSocket(): net.Socket {
    this.dataSocket = new net.Socket();
    this.dataSocket.on('error', (err) => {
      this.emit('error', err);
    });
    return this.dataSocket;
  }
}

export default BaseConnector;
