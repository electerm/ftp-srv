import type { CommandHandlerOptions } from '../index';

export default {
  directive: 'ABOR',
  handler: function ({ log, command }: CommandHandlerOptions) {
    return this.reply(225, 'ABOR command successful');
  },
  syntax: '{{cmd}}',
  description: 'Abort current transfer',
};
