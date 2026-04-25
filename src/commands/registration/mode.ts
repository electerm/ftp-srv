import type { CommandHandlerOptions } from '../index';

export default {
  directive: 'MODE',
  handler: async function ({ log, command }: CommandHandlerOptions) {
    if (!command.arg || command.arg.toUpperCase() === 'S') {
      return this.reply(200, 'MODE S OK');
    }
    return this.reply(504, 'Only MODE S is supported');
  },
  syntax: '{{cmd}} <mode>',
  description: 'Set transfer mode',
};
