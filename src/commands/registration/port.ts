import type { CommandHandlerOptions } from '../index';
import ActiveConnector from '../../connector/active';

export default {
  directive: 'PORT',
  handler: async function ({ log, command }: CommandHandlerOptions) {
    if (!command.arg) return this.reply(501, 'No address provided');

    const parts = command.arg.split(',');
    if (parts.length !== 6) return this.reply(501, 'Invalid PORT format');

    const host = parts.slice(0, 4).join('.');
    const port = parseInt(parts[4], 10) * 256 + parseInt(parts[5], 10);

    this.connector = new ActiveConnector(this);
    
    try {
      await this.connector.setup(host, port);
      return this.reply(200, 'PORT command successful');
    } catch (err: any) {
      log.error(err);
      return this.reply(425, err.message || 'PORT failed');
    }
  },
  syntax: '{{cmd}} <host-port>',
  description: 'Specifies an address and port for the server to connect',
  flags: {
    no_auth: true,
  },
};
