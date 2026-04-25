export class GeneralError extends Error {
  constructor(message: string, public code: number = 400) {
    super(message);
    this.name = 'GeneralError';
  }
}

export class SocketError extends Error {
  constructor(message: string, public code: number = 500) {
    super(message);
    this.name = 'SocketError';
  }
}

export class FileSystemError extends Error {
  constructor(message: string, public code: number = 400) {
    super(message);
    this.name = 'FileSystemError';
  }
}

export class ConnectorError extends Error {
  constructor(message: string, public code: number = 400) {
    super(message);
    this.name = 'ConnectorError';
  }
}
