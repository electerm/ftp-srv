import type { CommandHandlerOptions } from '../index';

export default {
  directive: 'SIZE',
  handler: async function ({ log, command }: CommandHandlerOptions) {
    if (!this.fs) return this.reply(550, 'File system not instantiated');
    if (!this.fs.get) return this.reply(402, 'Not supported');

    if (!command.arg) return this.reply(501, 'No path provided');

    try {
      const stat = await this.fs.get(command.arg);
      return this.reply(213, String(stat.size));
    } catch (err: any) {
      log.error(err);
      return this.reply(550, err.message || 'File not found');
    }
  },
  syntax: '{{cmd}} <path>',
  description: 'Return file size',
};
