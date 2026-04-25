import net from 'net';
import tls from 'tls';
import { EventEmitter } from 'events';
import { createLogger } from 'bunyan';
import FtpConnection from './connection';
import { getNextPortFactory } from './helpers/find-port';
import type { FtpServerOptions, Logger } from './types';

class FtpServer extends EventEmitter {
  public options: FtpServerOptions & { log: Logger };
  public connections: Record<string, FtpConnection>;
  public log: Logger;
  public url: URL;
  public server: net.Server | tls.Server;
  public getNextPasvPort: () => Promise<number>;

  private _greeting: string[];
  private _features: string;

  constructor(options: FtpServerOptions = {}) {
    super();
    this.options = Object.assign({
      log: createLogger({ name: 'ftp-srv' }),
      url: 'ftp://127.0.0.1:21',
      pasv_min: 1024,
      pasv_max: 65535,
      pasv_url: null,
      anonymous: false,
      file_format: 'ls',
      blacklist: [],
      whitelist: [],
      greeting: null,
      tls: false,
      timeout: 0,
      endOnProcessSignal: true,
    }, options) as FtpServerOptions & { log: Logger };

    this._greeting = this.setupGreeting(this.options.greeting);
    this._features = this.setupFeaturesMessage();

    delete this.options.greeting;

    this.connections = {};
    this.log = this.options.log;
    this.url = new URL(this.options.url!);
    this.getNextPasvPort = getNextPortFactory(
      this.url.hostname,
      this.options.pasv_min!,
      this.options.pasv_max!
    );

    const timeout = Number(this.options.timeout);
    this.options.timeout = isNaN(timeout) ? 0 : timeout;

    const serverConnectionHandler = (socket: net.Socket) => {
      if (this.options.timeout! > 0) {
        socket.setTimeout(this.options.timeout!);
      }

      const connection = new FtpConnection(this, { log: this.log, socket });
      this.connections[connection.id] = connection;

      socket.on('close', () => this.disconnectClient(connection.id));
      socket.once('close', () => {
        this.emit('disconnect', { connection, id: connection.id, newConnectionCount: Object.keys(this.connections).length });
      });

      this.emit('connect', { connection, id: connection.id, newConnectionCount: Object.keys(this.connections).length });

      const greeting = this._greeting || [];
      const features = this._features || 'Ready';
      return connection.reply(220, ...greeting, features)
        .then(() => socket.resume());
    };

    const serverOptions: any = Object.assign({}, this.isTLS ? this.options.tls : {}, { pauseOnConnect: true });

    this.server = this.isTLS
      ? tls.createServer(serverOptions as tls.TlsOptions, serverConnectionHandler)
      : net.createServer(serverOptions, serverConnectionHandler);
    this.server.on('error', (err) => {
      this.log.error(err, '[Event] error');
      this.emit('server-error', { error: err });
    });

    const quit = this.debounce(this.quit.bind(this), 100);

    if (this.options.endOnProcessSignal) {
      process.on('SIGTERM', quit);
      process.on('SIGINT', quit);
      process.on('SIGQUIT', quit);
    }
  }

  get isTLS(): boolean {
    return this.url.protocol === 'ftps:' && !!this.options.tls;
  }

  // WHATWG URL strips the port when it's the protocol default (ftp→21, ftps→990).
  // Recover it from the original option string so listen() always gets the right port.
  get port(): number {
    if (this.url.port) return Number(this.url.port);
    const defaults: Record<string, number> = { 'ftp:': 21, 'ftps:': 990 };
    const fromUrl = Number(new URL(this.options.url!).port);
    if (fromUrl) return fromUrl;
    // Parse directly from the raw string to bypass WHATWG default-port stripping
    const match = this.options.url!.match(/:(\d+)/);
    if (match) return Number(match[1]);
    return defaults[this.url.protocol] ?? 21;
  }

  listen(): Promise<string> {
    const port = this.port;

    return new Promise((resolve, reject) => {
      this.server.once('error', reject);
      this.server.listen(port, this.url.hostname, (err?: Error) => {
        this.server.removeListener('error', reject);
        if (err) return reject(err);
        this.log.info({
          protocol: this.url.protocol.replace(/\W/g, ''),
          ip: this.url.hostname,
          port,
        }, 'Listening');
        resolve('Listening');
      });
    });
  }

  emitPromise(action: string, ...data: any[]): Promise<any> {
    return new Promise((resolve, reject) => {
      const params = [...data, resolve, reject];
      this.emit.call(this, action, ...params);
    });
  }

  setupGreeting(greet?: string | string[] | null): string[] {
    if (!greet) return [];
    return Array.isArray(greet) ? greet : greet.split('\n');
  }

  setupFeaturesMessage(): string {
    const features: string[] = [];
    if (this.options.anonymous) features.push('a');

    if (features.length) {
      features.unshift('Features:');
      features.push('.');
    }
    return features.length ? features.join(' ') : 'Ready';
  }

  async disconnectClient(id: string): Promise<void> {
    const client = this.connections[id];
    if (!client) return;
    delete this.connections[id];

    const timeoutPromise = new Promise<void>((_, reject) => {
      setTimeout(() => reject(new Error('Timed out disconnecting the client')), this.options.timeout || 1000);
    });

    try {
      await Promise.race([client.close(), timeoutPromise]);
    } catch (err: any) {
      this.log.error({ err, id }, 'Error closing connection');
    }
  }

  async quit(): Promise<void> {
    await this.close();
    process.exit(0);
  }

  async close(): Promise<void> {
    (this.server as any).maxConnections = 0;
    this.emit('closing');
    this.log.info({ connections: Object.keys(this.connections).length }, 'Closing connections');

    await Promise.all(Object.keys(this.connections).map((id) => this.disconnectClient(id)));

    await new Promise<void>((resolve) => {
      this.server.close(() => {
        this.log.info('Server closing...');
        resolve();
      });
    });

    this.log.debug('Removing event listeners...');
    this.emit('closed', {});
    this.removeAllListeners();
  }

  private debounce<T extends (...args: any[]) => any>(fn: T, delay: number): T {
    let timer: NodeJS.Timeout | null = null;
    return ((...args: any[]) => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    }) as T;
  }
}

export default FtpServer;
export { FtpServer };
// Backward-compat alias — the original ftp-srv package exported the class as FtpSrv
export { FtpServer as FtpSrv };
export { default as FileSystem } from './fs';
export { default as FtpConnection } from './connection';
export * as errors from './errors';
