import type { CommandHandlerOptions } from '../../index';

export default {
  directive: 'CHMOD',
  handler: async function ({ log, command }: CommandHandlerOptions) {
    if (!this.fs) return this.reply(550, 'File system not instantiated');
    if (!this.fs.chmod) return this.reply(402, 'Not supported');

    const parts = command.arg?.split(' ') || [];
    if (parts.length < 2) return this.reply(501, 'Usage: SITE CHMOD <mode> <path>');

    const [mode, ...pathParts] = parts;
    const targetPath = pathParts.join(' ');

    try {
      await this.fs.chmod(targetPath, mode);
      return this.reply(200, 'CHMOD successful');
    } catch (err: any) {
      log.error(err);
      return this.reply(550, err.message || 'CHMOD failed');
    }
  },
  syntax: '{{cmd}} <mode> <path>',
  description: 'Change file mode',
};
