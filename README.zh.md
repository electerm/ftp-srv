# @electerm/ftp-srv

[![English](https://img.shields.io/badge/lang-en-blue.svg)](README.md)
[![中文](https://img.shields.io/badge/lang-中文-orange.svg)](README.zh.md)

现代、可扩展的 FTP 服务器（TypeScript 版本）。

本项目是 [ftp-srv](https://github.com/autovance/ftp-srv) 的 TypeScript 重构版本，同时发布 ESM 和 CJS 格式——并修复了原版中的安全漏洞。API 与原版 `ftp-srv` 向后兼容。

原始实现的全部功劳归于原作者 [Tyler Stewart](https://github.com/autovance/ftp-srv)。详见 [CREDITS](CREDITS) 文件。

## 安装

```bash
npm install @electerm/ftp-srv
```

## 使用

```js
// ESM
import FtpServer from '@electerm/ftp-srv';

// CJS
const { FtpServer } = require('@electerm/ftp-srv');

// 向后兼容别名（兼容原始 ftp-srv 包）
const { FtpSrv } = require('@electerm/ftp-srv');
```

### 基本示例

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
  return reject(new Error('用户名或密码无效'));
});

await server.listen();
console.log('FTP 服务器已在 21 端口启动');

// 优雅关闭
await server.close();
```

### 按用户设置根目录

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
      cwd: '/uploads',  // 初始工作目录（相对于 root）
    });
  }
  return reject(new Error('凭据无效'));
});

await server.listen();
```

### 匿名访问

```js
const server = new FtpServer({
  url: 'ftp://0.0.0.0:21',
  anonymous: true,   // 接受任意用户名/密码
  root: '/srv/ftp',  // 所有连接的默认根目录
});

server.on('login', (_, resolve) => resolve({}));

await server.listen();
```

### TLS（FTPS）

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

| 选项 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `url` | `string` | `'ftp://127.0.0.1:21'` | 监听的协议、主机名和端口。使用 `ftp://` 或 `ftps://`。 |
| `root` | `string` | — | 所有连接的默认根目录（当 `login` 的 resolve 未指定时使用）。 |
| `pasv_url` | `string \| (clientIp: string) => string` | 自动检测 | 被动连接时向客户端通告的 IP。省略时，本地连接使用客户端 IP，否则使用服务器绑定地址。 |
| `pasv_min` | `number` | `1024` | 被动端口范围起始值。 |
| `pasv_max` | `number` | `65535` | 被动端口范围结束值。 |
| `anonymous` | `boolean` | `false` | 允许匿名登录（接受任意用户名/密码）。 |
| `blacklist` | `string[]` | `[]` | 全局拒绝的 FTP 命令列表。 |
| `whitelist` | `string[]` | `[]` | 全局允许的 FTP 命令列表（其余均拒绝）。 |
| `greeting` | `string \| string[]` | — | 客户端连接时发送的欢迎消息。 |
| `tls` | `object` | — | Node.js TLS 选项（`key`、`cert` 等），用于 `ftps://` 连接。 |
| `file_format` | `'ls' \| 'ep' \| function` | `'ls'` | LIST 响应格式。`'ls'` = Unix 风格，`'ep'` = EPLF，或自定义 `(stat) => string` 函数。 |
| `log` | `Logger` | bunyan logger | 兼容 bunyan 的日志对象（`trace`、`debug`、`info`、`warn`、`error`、`fatal`、`child`）。 |
| `timeout` | `number` | `0` | 空闲 socket 超时时间（毫秒）。`0` 表示禁用。 |
| `endOnProcessSignal` | `boolean` | `true` | 收到 `SIGTERM`/`SIGINT`/`SIGQUIT` 时调用 `close()` 并退出进程。 |

### `server.listen()` → `Promise<string>`

启动服务器并开始接受连接。

### `server.close()` → `Promise<void>`

优雅关闭所有连接并停止服务器。

## 事件

### `login`

客户端尝试登录时触发。**必须**监听此事件并调用 `resolve` 或 `reject`。

```js
server.on('login', ({ connection, username, password }, resolve, reject) => {
  // 使用每用户选项 resolve：
  resolve({
    root: '/srv/ftp/alice',  // 本次会话的根目录
    cwd: '/',                // 初始工作目录（相对于 root）
    fs: customFsInstance,    // 自定义 FileSystem 实例（可选）
    blacklist: ['DELE'],     // 每连接命令黑名单
    whitelist: [],           // 每连接命令白名单
  });

  // 或拒绝登录：
  reject(new Error('凭据无效'));
});
```

### `connect`

新客户端 socket 连接时触发（登录前）。

```js
server.on('connect', ({ connection, id, newConnectionCount }) => {});
```

### `disconnect`

客户端断开连接时触发。

```js
server.on('disconnect', ({ connection, id, newConnectionCount }) => {});
```

### `client-error`

客户端连接发生错误时触发。

```js
server.on('client-error', ({ connection, context, error }) => {});
```

### `server-error`

底层 TCP 服务器发生错误时触发。

```js
server.on('server-error', ({ error }) => {});
```

### `closing` / `closed`

调用 `close()` 时及关闭完成后触发。

```js
server.on('closing', () => {});
server.on('closed', () => {});
```

## 自定义文件系统

继承 `FileSystem` 可覆盖服务器读写文件的方式。

```js
import { FileSystem } from '@electerm/ftp-srv';

class MyFileSystem extends FileSystem {
  async list(dirPath = '.') {
    // 返回带有 name 属性的 fs.Stats 类对象数组
    const entries = await super.list(dirPath);
    return entries.filter(e => !e.name.startsWith('.'));  // 隐藏点文件
  }

  async get(fileName) {
    return super.get(fileName);
  }
}

server.on('login', (_, resolve) => {
  resolve({ fs: new MyFileSystem(connection, { root: '/srv/ftp' }) });
});
```

可覆盖的方法：

| 方法 | 说明 |
|------|------|
| `currentDirectory()` | 返回当前工作目录路径。 |
| `get(fileName)` | 返回带有 `name` 属性的 `fs.Stats` 类对象。 |
| `list(dirPath)` | 返回带有 `name` 属性的 `fs.Stats` 类对象数组。 |
| `chdir(dirPath)` | 切换工作目录，返回新路径。 |
| `write(fileName, options)` | 返回 `{ stream, clientPath }` 用于写入。 |
| `read(fileName, options)` | 返回 `{ stream, clientPath }` 用于读取。 |
| `delete(fileName)` | 删除文件。 |
| `mkdir(dirPath)` | 创建目录。 |
| `rename(from, to)` | 重命名文件或目录。 |
| `chmod(fileName, mode)` | 修改文件权限。 |
| `getUniqueName(fileName)` | 返回唯一文件名（用于 STOU 命令）。 |

## 导出

```js
import FtpServer, {
  FtpServer,       // 具名导出（同一个类）
  FtpSrv,          // 向后兼容别名，兼容原始 ftp-srv 包
  FileSystem,
  FtpConnection,
  errors,
} from '@electerm/ftp-srv';
```

## 命令行

```bash
npx electermftpsrv ftp://0.0.0.0:9876 --root ~/Documents
```

## License

MIT
