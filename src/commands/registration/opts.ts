import type { CommandHandlerOptions } from '../index';

export default {
  directive: 'OPTS',
  handler: async function ({ log, command }: CommandHandlerOptions) {
    if (!command.arg) return this.reply(501, 'No options provided');
    return this.reply(200, 'Options set');
  },
  syntax: '{{cmd}} <name> <value>',
  description: 'Options',
};
