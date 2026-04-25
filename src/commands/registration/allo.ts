import type { CommandHandlerOptions } from '../index';

export default {
  directive: 'ALLO',
  handler: function ({ log, command }: CommandHandlerOptions) {
    return this.reply(202, 'ALLO command not needed');
  },
  syntax: '{{cmd}}',
  description: 'Allocate storage space',
};
