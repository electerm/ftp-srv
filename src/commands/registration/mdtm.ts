import type { CommandHandlerOptions } from '../index';

export default {
  directive: 'MDTM',
  handler: async function ({ log, command }: CommandHandlerOptions) {
    if (!this.fs) return this.reply(550, 'File system not instantiated');
    if (!this.fs.get) return this.reply(402, 'Not supported');

    if (!command.arg) return this.reply(501, 'No path provided');

    try {
      const stat = await this.fs.get(command.arg);
      const mtime = stat.mtime.toISOString().replace(/[-:]/g, '').slice(0, 14);
      return this.reply(213, mtime);
    } catch (err: any) {
      log.error(err);
      return this.reply(550, err.message || 'File not found');
    }
  },
  syntax: '{{cmd}} <path>',
  description: 'Return the last-modified time of a specified file',
};
