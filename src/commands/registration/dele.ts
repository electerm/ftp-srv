import type { CommandHandlerOptions } from '../index';

export default {
  directive: 'DELE',
  handler: async function ({ log, command }: CommandHandlerOptions) {
    if (!this.fs) return this.reply(550, 'File system not instantiated');
    if (!this.fs.delete) return this.reply(402, 'Not supported');

    if (!command.arg) return this.reply(501, 'No path provided');

    try {
      await this.fs.delete(command.arg);
      return this.reply(250, 'File deleted');
    } catch (err: any) {
      log.error(err);
      return this.reply(550, err.message || 'Delete failed');
    }
  },
  syntax: '{{cmd}} <path>',
  description: 'Delete file',
};
