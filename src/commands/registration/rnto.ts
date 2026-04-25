import type { CommandHandlerOptions } from '../index';

export default {
  directive: 'RNTO',
  handler: async function ({ log, command }: CommandHandlerOptions) {
    if (!this.fs) return this.reply(550, 'File system not instantiated');
    if (!this.fs.rename) return this.reply(402, 'Not supported');

    if (!command.arg) return this.reply(501, 'No path provided');
    if (!this._renameFrom) return this.reply(503, 'RNFR required first');

    try {
      await this.fs.rename(this._renameFrom, command.arg);
      this.emit('RNTO', null, command.arg);
      delete this._renameFrom;
      return this.reply(250, 'File renamed');
    } catch (err: any) {
      log.error(err);
      this.emit('RNTO', err, null);
      return this.reply(550, err.message || 'Rename failed');
    }
  },
  syntax: '{{cmd}} <path>',
  description: 'Rename to',
};
