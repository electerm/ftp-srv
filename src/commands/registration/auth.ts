import type { CommandHandlerOptions } from '../index';

export default {
  directive: 'AUTH',
  handler: async function ({ log, command }: CommandHandlerOptions) {
    if (!command.arg || command.arg.toUpperCase() !== 'TLS') {
      return this.reply(504, 'Only TLS is supported');
    }

    if (this.secure) {
      return this.reply(503, 'Already secured');
    }

    if (!this.server.options.tls) {
      // Say so instead of answering 234 and leaving the socket in plaintext:
      // the client would then send a TLS ClientHello we cannot parse.
      return this.reply(502, 'TLS is not configured on this server');
    }

    // Pause before answering: the client's ClientHello arrives right after the
    // 234 and must be buffered for the TLS handshake, not parsed as a command.
    this.commandSocket.pause();
    await this.reply(234, 'AUTH command OK');

    try {
      await this.makeSecure();
    } catch (err: any) {
      log.error(err);
      await this.close();
    }
  },
  syntax: '{{cmd}} TLS',
  description: 'Authentication/Security Mechanism',
  flags: {
    no_auth: true,
    feat: 'AUTH TLS',
  },
};
