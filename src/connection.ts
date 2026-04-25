import { EventEmitter } from 'events';
import net from 'net';
import { v4 as uuidv4 } from 'uuid';
import BaseConnector from './connector/base';
import PassiveConnector from './connector/passive';
import ActiveConnector from './connector/active';
import FileSystem from './fs';
import Commands from './commands';
import * as errors from './errors';
import DEFAULT_MESSAGE from './messages';
import type FtpServer from './index';
import type { Logger } from './types';

interface ConnectionOptions {
  log: Logger;
  socket: net.Socket;
}

interface ReplyLetter {
  socket?: net.Socket;
  message?: string;
  encoding?: string;
  raw?: boolean;
  code?: number;
  useEmptyMessage?: boolean;
  eol?: boolean;
}

class FtpConnection extends EventEmitter {
  public server: FtpServer;
  public id: string;
  public commandSocket: net.Socket;
  public log: Logger;
  public commands: Commands;
  public transferType: string;
  public encoding: string;
  public bufferSize: boolean;
  public authenticated: boolean;
  public fs: FileSystem | null;
  public connector: BaseConnector;

  private _restByteCount: number;
  private _secure: boolean;

  constructor(server: FtpServer, options: ConnectionOptions) {
    super();
    this.server = server;
    this.id = uuidv4();
    this.commandSocket = options.socket;
    this.log = options.log.child({ id: this.id, ip: this.ip });
    this.commands = new Commands(this);
    this.transferType = 'binary';
    this.encoding = 'utf8';
    this.bufferSize = false;
    this._restByteCount = 0;
    this._secure = false;
    this.authenticated = false;
    this.fs = null;

    this.connector = new PassiveConnector(this, {
      pasvIp: this.server.options.pasv_url as string | undefined,
      minPort: this.server.options.pasv_min || 1024,
      maxPort: this.server.options.pasv_max || 65535,
    });

    this.commandSocket.on('error', (err) => {
      this.log.error(err, 'Client error');
      this.server.emit('client-error', { connection: this, context: 'commandSocket', error: err });
    });
    this.commandSocket.on('data', this._handleData.bind(this));
    this.commandSocket.on('timeout', () => {
      this.log.trace('Client timeout');
      this.close();
    });
    this.commandSocket.on('close', () => {
      if (this.connector) this.connector.end();
      if (this.commandSocket && !this.commandSocket.destroyed) this.commandSocket.destroy();
      this.removeAllListeners();
    });
  }

  private async _handleData(data: Buffer): Promise<void> {
    const messages = data.toString(this.encoding as BufferEncoding).split('\r\n').filter(Boolean);
    this.log.trace(messages);

    for (const message of messages) {
      await this.commands.handle(message);
    }
  }

  get ip(): string | null {
    try {
      return this.commandSocket ? this.commandSocket.remoteAddress || null : null;
    } catch {
      return null;
    }
  }

  get restByteCount(): number | undefined {
    return this._restByteCount > 0 ? this._restByteCount : undefined;
  }

  set restByteCount(rbc: number | undefined) {
    this._restByteCount = rbc || 0;
  }

  get secure(): boolean {
    return this.server.isTLS || this._secure;
  }

  set secure(sec: boolean) {
    this._secure = sec;
  }

  async login(username: string, password: string): Promise<void> {
    const loginListeners = this.server.listeners('login');

    if (!loginListeners || !loginListeners.length) {
      if (!this.server.options.anonymous) {
        throw new errors.GeneralError('No "login" listener setup', 500);
      }
    } else {
      const result = await new Promise<{
        root?: string;
        cwd?: string;
        fs?: FileSystem;
        blacklist?: string[];
        whitelist?: string[];
      }>((resolve, reject) => {
        this.server.emit('login', { connection: this, username, password }, resolve, reject);
      });

      this.authenticated = true;
      this.commands.blacklist = [...this.commands.blacklist, ...(result.blacklist || [])];
      this.commands.whitelist = [...this.commands.whitelist, ...(result.whitelist || [])];
      // Fall back to constructor-level root if the login handler didn't specify one
      const root = result.root || this.server.options.root;
      this.fs = result.fs || new FileSystem(this, { root, cwd: result.cwd });
      return;
    }

    this.authenticated = true;
    this.fs = new FileSystem(this, { root: this.server.options.root });
  }

  async close(code: number = 421, message: string = 'Closing connection'): Promise<void> {
    if (code) {
      await this.reply(code, message);
    }
    this.commandSocket?.destroy();
  }

  async reply(options: number | ReplyLetter, ...letters: any[]): Promise<void> {
    const satisfyParameters = async (): Promise<ReplyLetter[]> => {
      let opts: ReplyLetter = typeof options === 'number' ? { code: options } : { ...options };

      if (!Array.isArray(letters)) letters = [letters];
      if (!letters.length) letters = [{}];

      const results: ReplyLetter[] = [];

      for (const promise of letters) {
        const letter = await Promise.resolve(promise);
        let resolvedLetter: ReplyLetter = typeof letter === 'string' ? { message: letter } : (letter || {});

        if (!resolvedLetter.socket) {
          resolvedLetter.socket = opts.socket || this.commandSocket;
        }

        const useEmptyMessage = opts.useEmptyMessage;
        if (!useEmptyMessage) {
          if (!resolvedLetter.message) {
            resolvedLetter.message = DEFAULT_MESSAGE[opts.code || 0] || 'No information';
          }
          if (!resolvedLetter.encoding) {
            resolvedLetter.encoding = this.encoding;
          }
        }

        const message = await Promise.resolve(resolvedLetter.message);

        if (!useEmptyMessage) {
          const eol = opts.hasOwnProperty('eol') ? (opts as any).eol : undefined;
          const separator = eol === undefined ? (letters.length - 1 === results.length ? ' ' : '-') : eol ? ' ' : '-';
          const code = resolvedLetter.code || opts.code;
          resolvedLetter.message = resolvedLetter.raw ? message : [code, message].filter(Boolean).join(separator);
        } else {
          resolvedLetter.message = '';
        }

        results.push(resolvedLetter);
      }

      return results;
    };

    const processLetter = async (letter: ReplyLetter): Promise<void> => {
      return new Promise((resolve, reject) => {
        if (letter.socket && letter.socket.writable) {
          const addr = letter.socket.address();
          this.log.trace({
            port: addr && typeof addr === 'object' && 'port' in addr ? addr.port : 0,
            encoding: letter.encoding,
            message: letter.message
          }, 'Reply');

          letter.socket.write(letter.message + '\r\n', (letter.encoding || this.encoding) as BufferEncoding, (error) => {
            if (error) {
              this.log.error({ error: error.message }, '[Process Letter] Socket Write Error');
              return reject(error);
            }
            resolve();
          });
        } else {
          this.log.trace({ message: letter.message }, 'Could not write message');
          reject(new Error('Socket not writable'));
        }
      });
    };

    try {
      const satisfiedLetters = await satisfyParameters();
      for (const letter of satisfiedLetters) {
        await processLetter(letter);
      }
    } catch (error: any) {
      this.log.error({ error: error.message }, 'Satisfy Parameters Error');
    }
  }
}

export default FtpConnection;
