import { randomUUID } from 'crypto';

interface LogLevel {
  (obj: Record<string, unknown>, msg?: string): void;
}

export interface Logger {
  child(bindings: Record<string, unknown>): Logger;
  trace: LogLevel;
  debug: LogLevel;
  info: LogLevel;
  warn: LogLevel;
  error: LogLevel;
  fatal: LogLevel;
}

class LoggerImpl implements Logger {
  private readonly name: string;
  private readonly bindings: Record<string, unknown>;

  constructor(name = 'app', bindings: Record<string, unknown> = {}) {
    this.name = name;
    this.bindings = bindings;
  }

  child(bindings: Record<string, unknown>): Logger {
    return new LoggerImpl(this.name, { ...this.bindings, ...bindings });
  }

  private log(level: string, obj: Record<string, unknown>, msg?: string): void {
    const entry = {
      name: this.name,
      pid: process.pid,
      time: Date.now(),
      level,
      ...this.bindings,
      ...obj,
      ...(msg ? { msg } : {}),
    };

    const output = JSON.stringify(entry);

    if (level === 'fatal' || level === 'error') {
      console.error(output);
    } else {
      console.log(output);
    }
  }

  trace(obj: Record<string, unknown>, msg?: string): void {
    this.log('trace', obj, msg);
  }

  debug(obj: Record<string, unknown>, msg?: string): void {
    this.log('debug', obj, msg);
  }

  info(obj: Record<string, unknown>, msg?: string): void {
    this.log('info', obj, msg);
  }

  warn(obj: Record<string, unknown>, msg?: string): void {
    this.log('warn', obj, msg);
  }

  error(obj: Record<string, unknown>, msg?: string): void {
    this.log('error', obj, msg);
  }

  fatal(obj: Record<string, unknown>, msg?: string): void {
    this.log('fatal', obj, msg);
  }
}

export function createLogger(options: { name?: string } = {}): Logger {
  return new LoggerImpl(options.name || randomUUID().split('-')[0]);
}