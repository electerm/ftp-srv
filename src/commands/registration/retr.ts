import type { CommandHandlerOptions } from '../index';

export default {
  directive: 'RETR',
  handler: async function ({ log, command }: CommandHandlerOptions) {
    if (!this.fs) return this.reply(550, 'File system not instantiated');
    if (!this.fs.read) return this.reply(402, 'Not supported');

    if (!command.arg) return this.reply(501, 'No filename provided');

    try {
      const { stream, clientPath } = await this.fs.read(command.arg, { start: this.restByteCount });
      await this.connector.waitForConnection();
      this.commandSocket.pause();

      await this.reply(150);

      await new Promise<void>((resolve, reject) => {
        stream.pipe(this.connector.socket!);
        stream.once('end', () => resolve());
        stream.once('error', reject);
      });

      await this.reply(226, 'Transfer complete');
      this.emit('RETR', null, clientPath);
      this.connector.end();
      this.commandSocket.resume();
    } catch (err: any) {
      log.error(err);
      await this.reply(550, err.message || 'File not found');
      this.emit('RETR', err, null);
      this.connector.end();
      this.commandSocket.resume();
    }
  },
  syntax: '{{cmd}} <path>',
  description: 'Retrieve file',
};
