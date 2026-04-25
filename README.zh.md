# @electerm/ftp-srv

[![English](https://img.shields.io/badge/lang-en-blue.svg)](README.md)
[![中文](https://img.shields.io/badge/lang-中文-orange.svg)](README.zh.md)

现代、可扩展的 FTP 服务器（TypeScript 版本）。

本项目是 [ftp-srv](https://github.com/autovance/ftp-srv) 的 TypeScript 重构版本，同时发布 ESM 和 CJS 格式。

原始实现的全部功劳归于原作者 [Tyler Stewart](https://github.com/autovance/ftp-srv)。详见 [CREDITS](CREDITS) 文件。

## 安装

```bash
npm install @electerm/ftp-srv
```

## 使用

```js
// ESM
import FtpSrv from '@electerm/ftp-srv';

// CJS
const FtpSrv = require('@electerm/ftp-srv');

const ftpServer = new FtpSrv({
  url: 'ftp://0.0.0.0:21',
  anonymous: true,
});

ftpServer.on('login', ({ connection, username, password }, resolve, reject) => {
  if (username === 'anonymous' && password === 'anonymous') {
    return resolve({ root: '/' });
  }
  return reject(new Error('用户名或密码无效'));
});

ftpServer.listen().then(() => {
  console.log('FTP 服务器正在监听...');
});
```

## API

### `new FtpSrv({options})`

#### url
URL 字符串，表示协议、主机名和监听的端口。
- `ftp` - 普通 FTP
- `ftps` - 隐式 FTP over TLS

默认值: `"ftp://127.0.0.1:21"`

#### pasv_url
提供给客户端用于被动连接的 IP 地址或函数。

#### pasv_min
被动连接的起始端口。默认值: `1024`

#### pasv_max
被动连接的结束端口。默认值: `65535`

#### greeting
客户端连接时发送的欢迎消息（字符串数组或字符串）。

#### tls
用于隐式或显式 TLS 连接的 Node TLS 安全上下文对象。

#### anonymous
如果为 true，允许匿名登录。

#### blacklist
不允许的命令数组。

#### whitelist
仅允许的命令数组。

#### file_format
文件状态查询格式。默认值: `"ls"`
- `ls` - bin/ls 格式
- `ep` - 易于解析的 LIST 格式
- `function` - 自定义格式函数

#### log
bunyan 日志实例。

#### timeout
空闲连接超时时间（毫秒）。默认值: `0`

#### endOnProcessSignal
是否在收到 SIGTERM/SIGINT/SIGQUIT 时关闭服务器。默认值: `true`

## 事件

### `login`
```js
ftpServer.on('login', ({ connection, username, password }, resolve, reject) => { ... });
```

### `disconnect`
```js
ftpServer.on('disconnect', ({ connection, id, newConnectionCount }) => { ... });
```

### `closed`
```js
ftpServer.on('closed', ({}) => { ... });
```

### `client-error`
```js
ftpServer.on('client-error', ({ connection, context, error }) => { ... });
```

### `server-error`
```js
ftpServer.on('server-error', ({ error }) => { ... });
```

## 文件系统

默认文件系统可以被扩展：

```js
import { FileSystem } from '@electerm/ftp-srv';

class MyFileSystem extends FileSystem {
  constructor(connection, options) {
    super(connection, options);
  }

  async get(fileName) {
    // 自定义实现
  }
}
```

## 命令行

```bash
npx ftp-srv ftp://0.0.0.0:9876 --root ~/Documents
```

## License

MIT
