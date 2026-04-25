# @electerm/ftp-srv

[![English](https://img.shields.io/badge/lang-en-blue.svg)](README.md)
[![中文](https://img.shields.io/badge/lang-中文-orange.svg)](README.zh.md)

Modern, extensible FTP Server (TypeScript version).

This is a TypeScript fork of [ftp-srv](https://github.com/autovance/ftp-srv), published in both ESM and CJS formats — with security vulnerabilities from the original removed. The API is backward-compatible with the original `ftp-srv`.

All credit for the original implementation goes to [Tyler Stewart](https://github.com/autovance/ftp-srv). See [CREDITS](CREDITS) for details.

## Install

```bash
npm install @electerm/ftp-srv
```

## Usage

```js
// ESM
import FtpServer from '@electerm/ftp-srv';

// CJS
const { FtpServer } = require('@electerm/ftp-srv');

// Backward-compat alias (original ftp-srv API)
const { FtpSrv } = require('@electerm/ftp-srv');
```

### Basic example

```js
import FtpServer from '@electerm/ftp-srv';

const server = new FtpServer({
  url: 'ftp://0.0.0.0:21',
  anonymous: false,
});

server.on('login', ({ connection, username, password }, resolve, reject) => {
  if (username === 'admin' && password === 'secret') {
    return resolve({ root: '/srv/ftp' });
  }
  return reject(new Error('Invalid credentials'));
});

await server.listen();
console.log('FTP server listening on port 21');

// Graceful shutdown
await server.close();
```

### With authentication and custom root per user

```js
const server = new FtpServer({
  url: 'ftp://0.0.0.0:2121',
  pasv_min: 10000,
  pasv_max: 10100,
  anonymous: false,
});

server.on('login', ({ username, password }, resolve, reject) => {
  if (username === 'alice' && password === 'pass') {
    return resolve({
      root: '/home/alice',
      cwd: '/uploads',  // initial working directory within root
    });
  }
  return reject(new Error('Bad credentials'));
});

await server.listen();
```

### Anonymous access

```js
const server = new FtpServer({
  url: 'ftp://0.0.0.0:21',
  anonymous: true,   // accepts any username/password
  root: '/srv/ftp',  // default root for all connections
});

server.on('login', (_, resolve) => resolve({}));

await server.listen();
```

### TLS (FTPS)

```js
import fs from 'fs';

const server = new FtpServer({
  url: 'ftps://0.0.0.0:990',
  tls: {
    key: fs.readFileSync('server.key'),
    cert: fs.readFileSync('server.crt'),
  },
});
```

## API

### `new FtpServer(options)`

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `url` | `string` | `'ftp://127.0.0.1:21'` | Protocol, hostname, and port to listen on. Use `ftp://` or `ftps://`. |
| `root` | `string` | — | Default root directory for all connections (used when `login` resolve does not specify one). |
| `pasv_url` | `string \| (clientIp: string) => string` | auto-detected | IP address to advertise for passive connections. If omitted, the client's IP is used for local connections; otherwise the server's bound address is used. |
| `pasv_min` | `number` | `1024` | First port in the passive port range. |
| `pasv_max` | `number` | `65535` | Last port in the passive port range. |
| `anonymous` | `boolean` | `false` | Allow anonymous logins (any username/password accepted). |
| `blacklist` | `string[]` | `[]` | FTP commands that are rejected globally. |
| `whitelist` | `string[]` | `[]` | FTP commands that are allowed globally (all others rejected). |
| `greeting` | `string \| string[]` | — | Message(s) sent to the client on connect. |
| `tls` | `object` | — | Node.js TLS options (`key`, `cert`, etc.) for `ftps://` connections. |
| `file_format` | `'ls' \| 'ep' \| function` | `'ls'` | Format for LIST responses. `'ls'` = Unix style, `'ep'` = EPLF, or a custom `(stat) => string` function. |
| `log` | `Logger` | bunyan logger | A bunyan-compatible logger (`trace`, `debug`, `info`, `warn`, `error`, `fatal`, `child`). |
| `timeout` | `number` | `0` | Idle socket timeout in milliseconds. `0` = disabled. |
| `endOnProcessSignal` | `boolean` | `true` | Call `close()` and `process.exit(0)` on `SIGTERM`/`SIGINT`/`SIGQUIT`. |

### `server.listen()` → `Promise<string>`

Starts the server and begins accepting connections.

### `server.close()` → `Promise<void>`

Gracefully closes all connections and stops the server.

## Events

### `login`

Fired when a client attempts to log in. You **must** listen to this event and call `resolve` or `reject`.

```js
server.on('login', ({ connection, username, password }, resolve, reject) => {
  // resolve with per-user options:
  resolve({
    root: '/srv/ftp/alice',  // root directory for this session
    cwd: '/',                // initial working directory (relative to root)
    fs: customFsInstance,    // custom FileSystem instance (optional)
    blacklist: ['DELE'],     // per-connection command blacklist
    whitelist: [],           // per-connection command whitelist
  });

  // or reject with an error:
  reject(new Error('Invalid credentials'));
});
```

### `connect`

Fired when a new client socket connects (before login).

```js
server.on('connect', ({ connection, id, newConnectionCount }) => {});
```

### `disconnect`

Fired when a client disconnects.

```js
server.on('disconnect', ({ connection, id, newConnectionCount }) => {});
```

### `client-error`

Fired when an error occurs on a client connection.

```js
server.on('client-error', ({ connection, context, error }) => {});
```

### `server-error`

Fired when the underlying TCP server emits an error.

```js
server.on('server-error', ({ error }) => {});
```

### `closing` / `closed`

Fired when `close()` is called and when it completes.

```js
server.on('closing', () => {});
server.on('closed', () => {});
```

## Custom File System

Extend `FileSystem` to override how the server reads and writes files.

```js
import { FileSystem } from '@electerm/ftp-srv';

class MyFileSystem extends FileSystem {
  async list(dirPath = '.') {
    // Return array of fs.Stats-like objects with a `name` property
    const entries = await super.list(dirPath);
    return entries.filter(e => !e.name.startsWith('.'));  // hide dotfiles
  }

  async get(fileName) {
    return super.get(fileName);
  }
}

server.on('login', (_, resolve) => {
  resolve({ fs: new MyFileSystem(connection, { root: '/srv/ftp' }) });
});
```

The full interface that can be overridden:

| Method | Description |
|--------|-------------|
| `currentDirectory()` | Returns the current working directory path. |
| `get(fileName)` | Returns an `fs.Stats`-like object with a `name` property. |
| `list(dirPath)` | Returns an array of `fs.Stats`-like objects with `name` properties. |
| `chdir(dirPath)` | Changes the working directory. Returns the new path. |
| `write(fileName, options)` | Returns `{ stream, clientPath }` for writing. |
| `read(fileName, options)` | Returns `{ stream, clientPath }` for reading. |
| `delete(fileName)` | Deletes a file. |
| `mkdir(dirPath)` | Creates a directory. |
| `rename(from, to)` | Renames a file or directory. |
| `chmod(fileName, mode)` | Changes file permissions. |
| `getUniqueName(fileName)` | Returns a unique file name (for STOU). |

## Exports

```js
import FtpServer, {
  FtpServer,       // named export (same class)
  FtpSrv,          // backward-compat alias for the original ftp-srv package
  FileSystem,
  FtpConnection,
  errors,
} from '@electerm/ftp-srv';
```

## CLI

```bash
npx electerm-ftp-srv ftp://0.0.0.0:9876 --root ~/Documents
```

## License

MIT
