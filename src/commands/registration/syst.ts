import type { CommandHandlerOptions } from '../index';

export default {
  directive: 'SYST',
  handler: async function ({ log, command }: CommandHandlerOptions) {
    return this.reply(215, 'UNIX Type: L8');
  },
  syntax: '{{cmd}}',
  description: 'Return system type',
  flags: {
    no_auth: true,
  },
};
