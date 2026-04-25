import type { CommandHandlerOptions } from '../index';

export default {
  directive: 'PBSZ',
  handler: async function ({ log, command }: CommandHandlerOptions) {
    return this.reply(200, 'PBSZ=0');
  },
  syntax: '{{cmd}}',
  description: 'Protection Buffer Size',
  flags: {
    no_auth: true,
  },
};
