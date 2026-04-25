import type { CommandHandlerOptions } from '../index';

export default {
  directive: 'QUIT',
  handler: async function ({ log, command }: CommandHandlerOptions) {
    return this.close(221, 'Goodbye');
  },
  syntax: '{{cmd}}',
  description: 'Close connection',
  flags: {
    no_auth: true,
  },
};
