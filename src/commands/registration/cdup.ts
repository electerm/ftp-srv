import type { CommandHandlerOptions } from '../index';

export default {
  directive: 'CDUP',
  handler: async function ({ log, command }: CommandHandlerOptions) {
    if (!this.fs) return this.reply(550, 'File system not instantiated');
    if (!this.fs.chdir) return this.reply(402, 'Not supported');

    try {
      await this.fs.chdir('..');
      return this.reply(250, 'Directory changed');
    } catch (err: any) {
      log.error(err);
      return this.reply(550, err.message || 'Directory change failed');
    }
  },
  syntax: '{{cmd}}',
  description: 'Change to parent directory',
};
