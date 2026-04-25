import type { CommandHandlerOptions } from '../index';

export default {
  directive: 'PASS',
  handler: async function ({ log, command }: CommandHandlerOptions) {
    if (!this.username) return this.reply(503, 'Username not set');
    if (this.authenticated) return this.reply(202, 'Already authenticated');

    const password = command.arg;
    if (!password) return this.reply(501, 'Must provide password');

    try {
      await this.login(this.username, password);
      return this.reply(230, 'User logged in');
    } catch (err: any) {
      log.error(err);
      return this.reply(530, err.message || 'Authentication failed');
    }
  },
  syntax: '{{cmd}} <password>',
  description: 'Authentication password',
  flags: {
    no_auth: true,
  },
};
