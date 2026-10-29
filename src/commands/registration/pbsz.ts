import type { CommandHandlerOptions } from '../index';

export default {
  directive: 'PBSZ',
  handler: async function ({ command }: CommandHandlerOptions) {
    if (!this.secure) {
      return this.reply(202, 'Not supported');
    }
    this.bufferSize = parseInt((command.arg || '0'), 10);
    if (isNaN(this.bufferSize)) {
      this.bufferSize = 0;
    }
    return this.reply(200, this.bufferSize === 0 ? 'OK' : 'Buffer too large: PBSZ=0');
  },
  syntax: '{{cmd}} <size>',
  description: 'Protection Buffer Size',
  flags: {
    no_auth: true,
    feat: 'PBSZ',
  },
};
