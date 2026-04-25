import type FtpConnection from '../connection';
import REGISTRY from './registry';

const CMD_FLAG_REGEX = /^-(\w{1})$/;

export interface ParsedCommand {
  directive: string;
  arg: string | null;
  flags: string[];
  raw: string;
}

export interface CommandHandlerOptions {
  log: any;
  command: ParsedCommand;
  previous_command: any;
}

class FtpCommands {
  public connection: FtpConnection;
  public blacklist: string[];
  public whitelist: string[];
  public previousCommand: any;

  constructor(connection: FtpConnection) {
    this.connection = connection;
    this.previousCommand = {};
    this.blacklist = (this.connection.server.options.blacklist || []).map((cmd: string) => cmd.toUpperCase());
    this.whitelist = (this.connection.server.options.whitelist || []).map((cmd: string) => cmd.toUpperCase());
  }

  parse(message: string): ParsedCommand {
    const strippedMessage = message.replace(/"/g, '');
    const parts = strippedMessage.split(' ');
    let directive = parts[0]?.trim().toUpperCase() || '';
    const args = parts.slice(1);

    const parseCommandFlags = !['RETR', 'SIZE', 'STOR'].includes(directive);
    const params = args.reduce(
      (acc, param) => {
        if (parseCommandFlags && CMD_FLAG_REGEX.test(param)) {
          acc.flags.push(param);
        } else {
          acc.arg.push(param);
        }
        return acc;
      },
      { arg: [] as string[], flags: [] as string[] }
    );

    return {
      directive,
      arg: params.arg.length ? params.arg.join(' ') : null,
      flags: params.flags,
      raw: message,
    };
  }

  async handle(command: string | ParsedCommand): Promise<void> {
    if (typeof command === 'string') {
      command = this.parse(command);
    }

    const logCommand = { ...command };
    if (logCommand.directive === 'PASS') {
      logCommand.arg = '********';
    }

    const log = this.connection.log.child({ directive: command.directive });
    log.trace({ command: logCommand }, 'Handle command');

    if (!(command.directive in REGISTRY)) {
      await this.connection.reply(502, `Command not allowed: ${command.directive}`);
      return;
    }

    if (this.blacklist.includes(command.directive)) {
      await this.connection.reply(502, `Command blacklisted: ${command.directive}`);
      return;
    }

    if (this.whitelist.length > 0 && !this.whitelist.includes(command.directive)) {
      await this.connection.reply(502, `Command not whitelisted: ${command.directive}`);
      return;
    }

    const commandRegister = REGISTRY[command.directive];
    const commandFlags = commandRegister?.flags || {};
    
    if (!commandFlags.no_auth && !this.connection.authenticated) {
      await this.connection.reply(530, `Command requires authentication: ${command.directive}`);
      return;
    }

    if (!commandRegister.handler) {
      await this.connection.reply(502, `Handler not set on command: ${command.directive}`);
      return;
    }

    const handler = commandRegister.handler.bind(this.connection);
    await handler({ log, command, previous_command: this.previousCommand });
    this.previousCommand = { ...command };
  }
}

export default FtpCommands;
