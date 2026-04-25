export interface Logger {
  child(bindings: Record<string, any>): Logger;
  trace(obj: any, msg?: string): void;
  debug(obj: any, msg?: string): void;
  info(obj: any, msg?: string): void;
  warn(obj: any, msg?: string): void;
  error(obj: any, msg?: string): void;
  fatal(obj: any, msg?: string): void;
}

export interface FtpServerOptions {
  url?: string;
  root?: string;
  pasv_min?: number;
  pasv_max?: number;
  pasv_url?: string | ((address: string) => string);
  anonymous?: boolean | string;
  file_format?: 'ls' | 'ep' | ((stat: any) => string | Promise<string>);
  blacklist?: string[];
  whitelist?: string[];
  greeting?: string | string[];
  tls?: any;
  timeout?: number;
  endOnProcessSignal?: boolean;
  log?: Logger;
}

export interface LoginData {
  connection: any;
  username: string;
  password: string;
}

export interface LoginResolveData {
  fs?: any;
  root?: string;
  cwd?: string;
  blacklist?: string[];
  whitelist?: string[];
}
