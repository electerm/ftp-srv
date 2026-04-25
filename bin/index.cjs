#!/usr/bin/env node

const { Command } = require('commander');
const path = require('path');

const FtpSrv = require('../dist/cjs/index.js').default;
const errors = require('../dist/cjs/errors.js');

const program = new Command();

program
  .argument('[url]', 'FTP server URL', 'ftp://127.0.0.1:21')
  .option('-c, --credentials <path>', 'Load user & pass from json file')
  .option('--username <name>', 'Username (blank for anonymous)', '')
  .option('--password <pass>', 'Password for given username')
  .option('-r, --root <path>', 'Default root directory for users', process.cwd())
  .option('--read-only', 'Disable write actions such as upload, delete, etc', false)
  .option('--pasv_url <url>', 'URL to provide for passive connections')
  .option('--pasv_min <port>', 'Starting port for passive connections', '1024')
  .option('--pasv_max <port>', 'Ending port for passive connections', '65535')
  .parse();

const options = program.opts();
const args = program.args;

const state = {};

state.url = args[0] || 'ftp://127.0.0.1:21';
state.pasv_url = options.pasvUrl;
state.pasv_min = parseInt(options.pasvMin, 10);
state.pasv_max = parseInt(options.pasvMax, 10);
state.anonymous = options.username === '';
state.root = options.root;

state.credentials = {};

function setCredentials(username, password, root = null) {
  state.credentials[username] = { password, root };
}

if (options.credentials) {
  const credentialsFile = path.resolve(options.credentials);
  const credentials = require(credentialsFile);
  for (const cred of credentials) {
    setCredentials(cred.username, cred.password, cred.root);
  }
} else if (options.username) {
  setCredentials(options.username, options.password);
}

if (options.readOnly) {
  state.blacklist = ['ALLO', 'APPE', 'DELE', 'MKD', 'RMD', 'RNFR', 'RNTO', 'STOR', 'STRU'];
}

function startFtpServer(_state) {
  for (const key in _state) {
    if (_state[key] === undefined) delete _state[key];
  }

  function checkLogin(data, resolve, reject) {
    const user = _state.credentials[data.username];
    if (_state.anonymous || (user && user.password === data.password)) {
      return resolve({ root: (user && user.root) || _state.root });
    }
    return reject(new errors.GeneralError('Invalid username or password', 401));
  }

  const ftpServer = new FtpSrv({
    url: _state.url,
    pasv_url: _state.pasv_url,
    pasv_min: _state.pasv_min,
    pasv_max: _state.pasv_max,
    anonymous: _state.anonymous,
    blacklist: _state.blacklist,
  });

  ftpServer.on('login', checkLogin);
  ftpServer.listen();
}

startFtpServer(state);
