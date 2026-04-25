import type { CommandHandlerOptions } from '../index';

export default {
  directive: 'PROT',
  handler: async function ({ log, command }: CommandHandlerOptions) {
    if (!command.arg || command.arg.toUpperCase() === 'C') {
      return this.reply(200, 'PROT OK');
    }
    if (command.arg.toUpperCase() === 'P') {
      return this.reply(200, 'PROT P OK');
    }
    return this.reply(536, 'Only C and P levels are supported');
  },
  syntax: '{{cmd}} <level>',
  description: 'Data Channel Protection Level',
  flags: {
    no_auth: true,
  },
};
