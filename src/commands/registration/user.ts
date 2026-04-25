import type { CommandHandlerOptions } from '../index';

export default {
  directive: 'USER',
  handler: async function ({ log, command }: CommandHandlerOptions) {
    const username = command.arg;
    const isAnonymous = username && (
      (this.server.options.anonymous === true && username === 'anonymous') ||
      username === this.server.options.anonymous
    );

    if (this.username && !isAnonymous) return this.reply(530, 'Username already set');
    if (this.authenticated) return this.reply(230);

    this.username = username;
    if (!this.username) return this.reply(501, 'Must provide username');

    if (isAnonymous) {
      try {
        await this.login(this.username, '@anonymous');
        return this.reply(230, 'Anonymous user logged in');
      } catch (err: any) {
        log.error(err);
        return this.reply(530, err.message || 'Authentication failed');
      }
    }

    return this.reply(331, 'Password required');
  },
  syntax: '{{cmd}} <username>',
  description: 'Authentication username',
  flags: {
    no_auth: true,
  },
};
