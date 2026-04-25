import { randomUUID } from 'crypto';
import type { CommandHandlerOptions } from '../index';

export default {
  directive: 'STOU',
  handler: async function ({ log, command }: CommandHandlerOptions) {
    if (!this.fs) return this.reply(550, 'File system not instantiated');
    if (!this.fs.write) return this.reply(402, 'Not supported');

    const uniqueName = randomUUID().replace(/-/g, '') + (command.arg ? '_' + command.arg : '');
    
    try {
      const { stream, clientPath } = this.fs.write(uniqueName);
      await this.connector.waitForConnection();
      this.commandSocket.pause();

      await this.reply(150);

      await new Promise<void>((resolve, reject) => {
        this.connector.socket!.pipe(stream);
        stream.once('finish', () => resolve());
        stream.once('error', reject);
      });

      await this.reply(226, `Transfer complete. Unique filename: ${uniqueName}`);
      this.connector.end();
      this.commandSocket.resume();
    } catch (err: any) {
      log.error(err);
      await this.reply(451, err.message || 'Error writing file');
      this.connector.end();
      this.commandSocket.resume();
    }
  },
  syntax: '{{cmd}} [<path>]',
  description: 'Store file uniquely',
};
