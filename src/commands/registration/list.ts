import type { CommandHandlerOptions } from '../index';
import { formatFileStatLs, formatFileStatEp } from '../../helpers/file-stat';

export default {
  directive: ['LIST', 'NLST'],
  handler: async function ({ log, command }: CommandHandlerOptions) {
    if (!this.fs) return this.reply(550, 'File system not instantiated');
    if (!this.fs.get) return this.reply(402, 'Not supported');
    if (!this.fs.list) return this.reply(402, 'Not supported');

    const simple = command.directive === 'NLST';
    const dirPath = command.arg || '.';

    try {
      await this.connector.waitForConnection();
      this.commandSocket.pause();

      const stat = await this.fs.get(dirPath);
      const files = stat.isDirectory() ? await this.fs.list(dirPath) : [stat];

      await this.reply(150);

      for (const file of files) {
        let message: string;
        if (simple) {
          message = file.name;
        } else {
          const fileFormat = this.server.options.file_format || 'ls';
          if (typeof fileFormat === 'function') {
            message = await fileFormat(file);
          } else if (fileFormat === 'ep') {
            message = formatFileStatEp(file);
          } else {
            message = formatFileStatLs(file);
          }
        }

        this.connector.socket!.write(message + '\r\n');
      }

      await this.reply(226, 'Transfer complete');
      this.connector.end();
      this.commandSocket.resume();
    } catch (err: any) {
      log.error(err);
      await this.reply(451, err.message || 'Error listing directory');
      this.connector.end();
      this.commandSocket.resume();
    }
  },
  syntax: '{{cmd}} [<path>]',
  description: 'List directory contents',
};
