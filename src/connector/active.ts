import net from 'net';
import tls from 'tls';
import BaseConnector from './base';
import type FtpConnection from '../connection';
import { ConnectorError, SocketError } from '../errors';
import { connectionRemoteAddress, sameIp } from '../helpers/same-ip';

/** How long we wait for the client's listening data port to accept. */
export const ACTIVE_CONNECT_TIMEOUT = 30000;

class ActiveConnector extends BaseConnector {
  private remoteAddress: string;
  private remotePort: number;
  private family: number;

  constructor(connection: FtpConnection) {
    super(connection);
    this.remoteAddress = '';
    this.remotePort = 0;
    this.family = 4;
  }

  async setup(address: string, port: number, family = 4): Promise<void> {
    // FTP bounce guard: a client may only ask us to dial itself. Without this
    // PORT/EPRT turns the server into an open port scanner / SSRF proxy.
    if (!sameIp(connectionRemoteAddress(this.connection), address)) {
      throw new SocketError('The given address is not yours', 500);
    }
    this.remoteAddress = address;
    this.remotePort = port;
    this.family = family;
  }

  async getSocket(): Promise<net.Socket> {
    if (!this.remoteAddress || !this.remotePort) {
      throw new ConnectorError('Remote address and port not set');
    }

    const socket = this.createDataSocket();

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        socket.destroy();
        reject(new ConnectorError('Connection timed out'));
      }, ACTIVE_CONNECT_TIMEOUT);

      socket.once('connect', () => {
        clearTimeout(timeout);
        resolve();
      });

      socket.once('error', (err: Error) => {
        clearTimeout(timeout);
        reject(new ConnectorError(`Failed to connect: ${err.message}`));
      });

      socket.connect({ host: this.remoteAddress, port: this.remotePort, family: this.family });
    });

    if (!this.secure) {
      return socket;
    }

    const tlsOptions = this.tlsOptions();
    if (!tlsOptions) {
      throw new ConnectorError('TLS options are not configured on this server');
    }

    const secureSocket = new tls.TLSSocket(socket, {
      isServer: true,
      secureContext: tls.createSecureContext(tlsOptions),
    });
    secureSocket.on('error', (err) => this.emitClientError('dataSocket', err));
    this.dataSocket = secureSocket;
    return secureSocket;
  }

  async waitForConnection(): Promise<net.Socket> {
    return this.getSocket();
  }
}

export default ActiveConnector;
