import type { CommandHandlerOptions } from '../index';

export default {
  directive: 'MKD',
  handler: async function ({ log, command }: CommandHandlerOptions) {
    if (!this.fs) return this.reply(550, 'File system not instantiated');
    if (!this.fs.mkdir) return this.reply(402, 'Not supported');

    if (!command.arg) return this.reply(501, 'No path provided');

    try {
      const path = await this.fs.mkdir(command.arg);
      return this.reply(257, `Directory created: ${command.arg}`);
    } catch (err: any) {
      log.error(err);
      return this.reply(550, err.message || 'Directory creation failed');
    }
  },
  syntax: '{{cmd}} <path>',
  description: 'Make directory',
};
