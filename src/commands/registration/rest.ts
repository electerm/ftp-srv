import type { CommandHandlerOptions } from '../index';

export default {
  directive: 'REST',
  handler: async function ({ log, command }: CommandHandlerOptions) {
    if (!command.arg) return this.reply(501, 'No offset provided');
    
    const offset = parseInt(command.arg, 10);
    if (isNaN(offset)) return this.reply(501, 'Invalid offset');

    this.restByteCount = offset;
    return this.reply(350, `Restarting at ${offset}`);
  },
  syntax: '{{cmd}} <offset>',
  description: 'Restart transfer from offset',
};
