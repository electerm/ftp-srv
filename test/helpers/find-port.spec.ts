import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import net from 'net';
import { getNextPortFactory } from '../../src/helpers/find-port';

describe('getNextPortFactory', () => {
  describe('finds available ports', () => {
    let getNextPort: () => Promise<number>;
    let serverAlreadyRunning: net.Server;

    beforeEach(() => {
      return new Promise<void>((resolve) => {
        getNextPort = getNextPortFactory('127.0.0.1', 8821, 8830);
        serverAlreadyRunning = net.createServer();
        serverAlreadyRunning.listen(8821, () => resolve());
      });
    });

    afterEach(() => {
      return new Promise<void>((resolve) => {
        serverAlreadyRunning.close(() => resolve());
      });
    });

    it('skips occupied ports', async () => {
      const port = await getNextPort();
      expect(port).toBeGreaterThan(8820);
    });
  });

  it('finds ports concurrently', async () => {
    const portStart = 10000;
    const getCount = 10;

    const getNextPort = getNextPortFactory('127.0.0.1', portStart, portStart + getCount + 10);
    const portFinders = new Array(getCount).fill(null).map(() => getNextPort());
    const ports = await Promise.all(portFinders);

    expect(ports.length).to.equal(getCount);
    const uniquePorts = new Set(ports);
    expect(uniquePorts.size).to.equal(getCount);
  });
});
