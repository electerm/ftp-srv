import type { CommandHandlerOptions } from '../index';

export default {
  directive: 'PROT',
  handler: async function ({ command }: CommandHandlerOptions) {
    if (!this.secure) {
      return this.reply(202, 'Not supported');
    }
    // PBSZ has to come first (RFC 4217): without it we do not know the buffer size.
    if (typeof this.bufferSize !== 'number') {
      return this.reply(503, 'Send PBSZ first');
    }

    switch ((command.arg || '').toUpperCase()) {
      case 'P':
        return this.reply(200, 'OK');
      case 'C':
      case 'S':
      case 'E':
        return this.reply(536, 'Not supported');
      default:
        return this.reply(504, 'Unknown protection level');
    }
  },
  syntax: '{{cmd}} <level>',
  description: 'Data Channel Protection Level',
  flags: {
    no_auth: true,
    feat: 'PROT',
  },
};
