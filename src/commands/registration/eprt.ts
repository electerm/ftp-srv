import type { CommandHandlerOptions } from '../index';
import ActiveConnector from '../../connector/active';

const FAMILY: Record<string, number> = {
  1: 4,
  2: 6,
};

export default {
  directive: 'EPRT',
  handler: async function ({ log, command }: CommandHandlerOptions) {
    if (!command.arg) return this.reply(501, 'No address provided');

    const [, protocol, host, port] = command.arg.split('|');
    const family = FAMILY[protocol];
    if (!family) return this.reply(504, 'Unknown network protocol');
    if (!host || !port) return this.reply(501, 'Invalid EPRT format');

    // Always a fresh connector: reusing the current one would keep a PASV
    // listener alive and connect nowhere.
    this.connector?.end();
    this.connector = new ActiveConnector(this);

    try {
      await this.connector.setup(host, parseInt(port, 10), family);
      return this.reply(200, 'EPRT command successful');
    } catch (err: any) {
      log.error(err);
      return this.reply(err.code || 425, err.message || 'EPRT failed');
    }
  },
  syntax: '{{cmd}} |<protocol>|<address>|<port>|',
  description: 'Extended port for active connection',
};
