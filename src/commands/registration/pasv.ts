import type { CommandHandlerOptions } from '../index';
import PassiveConnector from '../../connector/passive';
import { isLocalAddress } from '../../helpers/is-local';
import net from 'net';

function resolvePasvIp(connection: any): string | ((addr: string) => string) {
  const pasvUrl = connection.server.options.pasv_url;
  if (pasvUrl) return pasvUrl;
  // No pasv_url configured: fall back to the client's IP for local connections,
  // otherwise use the server's bound address.
  const clientIp = (connection.ip || '').replace(/^::ffff:/, '');
  if (isLocalAddress(clientIp)) return clientIp;
  const serverAddr = connection.server.server.address() as net.AddressInfo | null;
  return (serverAddr && serverAddr.address !== '0.0.0.0' && serverAddr.address !== '::') ? serverAddr.address : '127.0.0.1';
}

export default {
  directive: 'PASV',
  handler: async function ({ log, command }: CommandHandlerOptions) {
    this.connector = new PassiveConnector(this, {
      pasvIp: resolvePasvIp(this),
      minPort: this.server.options.pasv_min || 1024,
      maxPort: this.server.options.pasv_max || 65535,
    });

    try {
      const { ip, port } = await this.connector.setup();
      const host = ip.replace(/\./g, ',');
      const portByte1 = Math.floor(port / 256);
      const portByte2 = port % 256;

      return this.reply(227, `Entering Passive Mode (${host},${portByte1},${portByte2})`);
    } catch (err: any) {
      log.error(err);
      return this.reply(err.code || 425, err.message);
    }
  },
  syntax: '{{cmd}}',
  description: 'Initiate passive mode',
  flags: {
    no_auth: true,
  },
};
