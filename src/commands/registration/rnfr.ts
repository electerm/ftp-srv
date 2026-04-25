import type { CommandHandlerOptions } from '../index';

export default {
  directive: 'RNFR',
  handler: async function ({ log, command }: CommandHandlerOptions) {
    if (!this.fs) return this.reply(550, 'File system not instantiated');
    if (!this.fs.get) return this.reply(402, 'Not supported');

    if (!command.arg) return this.reply(501, 'No path provided');

    try {
      await this.fs.get(command.arg);
      this._renameFrom = command.arg;
      return this.reply(350, 'Ready for RNTO');
    } catch (err: any) {
      log.error(err);
      return this.reply(550, err.message || 'File not found');
    }
  },
  syntax: '{{cmd}} <path>',
  description: 'Rename from',
};
