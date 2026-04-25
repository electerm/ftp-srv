import type { CommandHandlerOptions } from '../index';

export default {
  directive: 'EPRT',
  handler: async function ({ log, command }: CommandHandlerOptions) {
    if (!command.arg) return this.reply(501, 'No address provided');

    const parts = command.arg.split('|');
    if (parts.length < 4) return this.reply(501, 'Invalid EPRT format');

    const [, , host, port] = parts;
    
    try {
      await this.connector.setup(host, parseInt(port, 10));
      return this.reply(200, 'EPRT command successful');
    } catch (err: any) {
      log.error(err);
      return this.reply(425, err.message || 'EPRT failed');
    }
  },
  syntax: '{{cmd}} |<protocol>|<address>|<port>|',
  description: 'Extended port for active connection',
  flags: {
    no_auth: true,
  },
};
