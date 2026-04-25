import type { CommandHandlerOptions } from '../index';

export default {
  directive: 'STRU',
  handler: async function ({ log, command }: CommandHandlerOptions) {
    if (!command.arg || command.arg.toUpperCase() === 'F') {
      return this.reply(200, 'STRU F OK');
    }
    return this.reply(504, 'Only STRU F is supported');
  },
  syntax: '{{cmd}} <structure>',
  description: 'Set file structure',
};
