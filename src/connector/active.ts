import net from 'net';
import BaseConnector from './base';
import type FtpConnection from '../connection';
import { ConnectorError } from '../errors';
import { isLocalAddress } from '../helpers/is-local';

class ActiveConnector extends BaseConnector {
  private remoteAddress: string;
  private remotePort: number;

  constructor(connection: FtpConnection) {
    super(connection);
    this.remoteAddress = '';
    this.remotePort = 0;
  }

  async setup(address: string, port: number): Promise<void> {
    this.remoteAddress = address;
    this.remotePort = port;
  }

  async getSocket(): Promise<net.Socket> {
    if (!this.remoteAddress || !this.remotePort) {
      throw new ConnectorError('Remote address and port not set');
    }

    const socket = this.createDataSocket();

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        socket.destroy();
        reject(new ConnectorError('Connection timed out'));
      }, 30000);

      socket.once('connect', () => {
        clearTimeout(timeout);
        resolve(socket);
      });

      socket.once('error', (err) => {
        clearTimeout(timeout);
        reject(new ConnectorError(`Failed to connect: ${err.message}`));
      });

      socket.connect(this.remotePort, this.remoteAddress);
    });
  }

  async waitForConnection(): Promise<net.Socket> {
    return this.getSocket();
  }
}

export default ActiveConnector;
