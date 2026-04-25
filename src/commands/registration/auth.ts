import type { CommandHandlerOptions } from '../index';

export default {
  directive: 'AUTH',
  handler: async function ({ log, command }: CommandHandlerOptions) {
    if (!command.arg || command.arg.toUpperCase() !== 'TLS') {
      return this.reply(504, 'Only TLS is supported');
    }

    if (this.secure) {
      return this.reply(503, 'Already secured');
    }

    await this.reply(234, 'AUTH command OK');

    this.commandSocket.removeAllListeners('data');
    this.secure = true;
    
    this.commandSocket.on('data', this._handleData.bind(this));
  },
  syntax: '{{cmd}} TLS',
  description: 'Authentication/Security Mechanism',
  flags: {
    no_auth: true,
  },
};
