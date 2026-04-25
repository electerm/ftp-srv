import type { CommandHandlerOptions } from '../index';

export default {
  directive: 'TYPE',
  handler: async function ({ log, command }: CommandHandlerOptions) {
    if (!command.arg) return this.reply(501, 'No type provided');

    const type = command.arg.toUpperCase();
    if (type === 'I' || type === 'A') {
      this.transferType = type === 'I' ? 'binary' : 'ascii';
      return this.reply(200, `Type set to ${type}`);
    }
    return this.reply(504, 'Type not supported');
  },
  syntax: '{{cmd}} <type>',
  description: 'Set transfer type',
};
