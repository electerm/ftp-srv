import type { CommandHandlerOptions } from '../index';

export default {
  directive: 'PWD',
  handler: async function ({ log, command }: CommandHandlerOptions) {
    if (!this.fs) return this.reply(550, 'File system not instantiated');
    
    try {
      const cwd = this.fs.currentDirectory();
      return this.reply(257, `"${cwd}" is the current directory`);
    } catch (err: any) {
      log.error(err);
      return this.reply(550, err.message || 'Unable to get current directory');
    }
  },
  syntax: '{{cmd}}',
  description: 'Print working directory',
};
