import type { CommandHandlerOptions } from '../index';
import PassiveConnector from '../../connector/passive';
import { isLocalAddress } from '../../helpers/is-local';
import net from 'net';

function resolvePasvIp(connection: any): string | ((addr: string) => string) {
  const pasvUrl = connection.server.options.pasv_url;
  if (pasvUrl) return pasvUrl;
  const clientIp = (connection.ip || '').replace(/^::ffff:/, '');
  if (isLocalAddress(clientIp)) return clientIp;
  const serverAddr = connection.server.server.address() as net.AddressInfo | null;
  return (serverAddr && serverAddr.address !== '0.0.0.0' && serverAddr.address !== '::') ? serverAddr.address : '127.0.0.1';
}

export default {
  directive: 'EPSV',
  handler: async function ({ log, command }: CommandHandlerOptions) {
    this.connector = new PassiveConnector(this, {
      pasvIp: resolvePasvIp(this),
      minPort: this.server.options.pasv_min || 1024,
      maxPort: this.server.options.pasv_max || 65535,
    });

    try {
      const { ip, port } = await this.connector.setup();
      return this.reply(229, `Entering Extended Passive Mode (|||${port}|)`);
    } catch (err: any) {
      log.error(err);
      return this.reply(425, err.message || 'EPSV failed');
    }
  },
  syntax: '{{cmd}}',
  description: 'Extended passive mode',
  flags: {
    no_auth: true,
  },
};
