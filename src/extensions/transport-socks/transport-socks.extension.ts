import {
  ConnectionInfo,
  createProxyServer,
  HttpRequestOptions,
  ProxyServer,
} from '@mutagen-d/node-proxy-server';
import { Duplex } from 'stream';
import net from 'net';
import { ProxyExtension } from 'src/extensions/proxy.extension';
import { Argv } from 'yargs';

export class TransportSocksExtension extends ProxyExtension {
  private proxy?: ProxyServer;

  // CLI
  static prepareCli = (yargs: Argv) =>
    yargs.options({
      socksPort: {
        type: 'number',
        default: 1080,
        demandOption: false,
        describe: 'The port to run the SOCKS proxy on',
      },
    });

  async init(): Promise<void> {
    this.app.onStart.tapPromise('SocksServer start', this.startSocksServer);

    this.app.onStop.tapPromise('SocksServer stop', this.stopSocksServer);
  }

  private createProxyConnection = async (
    info: ConnectionInfo,
    options?: HttpRequestOptions,
  ): Promise<Duplex> => {
    this.logger.info(
      `Got proxy connection request for ${info.dstHost}:${info.dstPort} from ${info.srcHost}:${info.srcPort}`,
    );
    const socket = net.createConnection({
      host: info.dstHost,
      port: info.dstPort,
    });
    return new Promise((resolve, reject) => {
      socket.on('connect', () => resolve(socket));
      socket.on('error', (error) => reject(error));
    });
  };

  private startSocksServer = async () => {
    this.logger.info(
      `Starting SOCKS proxy server on ${this.app.configuration.host}:${this.app.configuration.socksPort}`,
    );

    this.proxy = await new Promise((resolve) => {
      const server = createProxyServer({
        auth: false,
        createProxyConnection: this.createProxyConnection,
      });

      server.listen(
        this.app.configuration.socksPort,
        this.app.configuration.host,
        () => resolve(server),
      );
    });
  };

  private stopSocksServer = async () => {
    this.logger.info(
      `Stopping SOCKS proxy server on ${this.app.configuration.host}:${this.app.configuration.socksPort}`,
    );

    this.proxy?.removeAllListeners();
    this.proxy?.close();
  };
}
