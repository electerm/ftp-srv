import type { CommandHandlerOptions } from '../index';

export default {
  directive: 'HELP',
  handler: async function ({ log, command }: CommandHandlerOptions) {
    return this.reply(214, 'Help command available');
  },
  syntax: '{{cmd}} [<command>]',
  description: 'Get help',
  flags: {
    no_auth: true,
  },
};
