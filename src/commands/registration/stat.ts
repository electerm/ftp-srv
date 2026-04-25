import type { CommandHandlerOptions } from '../index';

export default {
  directive: 'STAT',
  handler: async function ({ log, command }: CommandHandlerOptions) {
    if (!this.fs) return this.reply(550, 'File system not instantiated');

    if (!command.arg) {
      return this.reply(211, 'Server status OK');
    }

    try {
      const stat = await this.fs.get(command.arg);
      const files = stat.isDirectory() ? await this.fs.list(command.arg) : [stat];
      
      const messages = files.map((file) => {
        const mode = file.mode ? file.mode.toString(8).slice(-3) : '000';
        const date = new Date(file.mtime).toISOString().slice(0, 16).replace('T', ' ');
        const type = file.isDirectory() ? 'd' : '-';
        return `${type}${mode} ${file.uid} ${file.gid} ${file.size} ${date} ${file.name}`;
      });

      await this.reply(213, 'Status');
      for (const msg of messages) {
        this.commandSocket.write(msg + '\r\n');
      }
      return this.reply(213, 'End of status');
    } catch (err: any) {
      log.error(err);
      return this.reply(550, err.message || 'File not found');
    }
  },
  syntax: '{{cmd}} [<path>]',
  description: 'Return status',
};
