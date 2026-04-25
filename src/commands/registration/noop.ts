import type { CommandHandlerOptions } from '../index';

export default {
  directive: 'NOOP',
  handler: async function ({ log, command }: CommandHandlerOptions) {
    return this.reply(200, 'NOOP command successful');
  },
  syntax: '{{cmd}}',
  description: 'No operation',
  flags: {
    no_auth: true,
  },
};
