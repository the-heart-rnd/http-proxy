import { ProxyExtension } from 'src/extensions/proxy.extension';
import * as http from 'http';
import { IncomingMessage, Server } from 'http';
import WebSocketProxyServer from 'http-proxy';
import { BailSynth } from 'src/flow-control';
import { Socket } from 'net';
import { InputHttpExtension } from 'src/extensions/input-http/input-http.extension';
import { HeadersMap } from 'src/headers.helpers';

export class InputWsExtension extends ProxyExtension {
  private wsProxy?: WebSocketProxyServer;

  static dependencies = [InputHttpExtension];

  private transportHttpExtension: InputHttpExtension;
  private httpServer: Server;

  async init(): Promise<void> {
    if (!this.getConfig()) {
      return;
    }

    this.app.onStart.tapPromise('WsExtension', this.startWSServer);
  }

  private startWSServer = async () => {
    const config = this.getConfig();
    this.transportHttpExtension = this.app.get(InputHttpExtension);
    const httpServer = this.transportHttpExtension.httpServer;
    if (!httpServer) {
      this.logger.warn('No HTTP server, skipping WebSocket proxy server');
      return;
    }

    this.httpServer = httpServer;

    this.logger.info(
      `Starting WebSocket proxy server on ${config.host}:${config.port}`,
    );

    this.wsProxy = WebSocketProxyServer.createProxy();

    this.httpServer.on('upgrade', this.onUpgrade);
  };

  public getConfig() {
    return this.app.get(InputHttpExtension).getConfig()!;
  }

  private onUpgrade = async (
    req: IncomingMessage,
    socket: Socket,
    head: Buffer,
  ) => {
    try {
      const preServiceFlowResult = await this.app.flows.executePreServiceFlow(
        {
          headers: HeadersMap.from(req.headers),
        },
        { req },
        this.transportHttpExtension,
      );

      const serviceRequestHeaders =
        preServiceFlowResult.serviceRequestOptions.headers;
      const options = {
        target: preServiceFlowResult.serviceRequestUrl,
        headers:
          serviceRequestHeaders &&
          this.prepareRequestHeaders(serviceRequestHeaders),
        // path is part of the target, so we don't need to set it twice
        ignorePath: true,
      };

      this.logger.debug(
        {
          options,
        },
        'Proxying WebSocket upgrade request',
      );

      this.wsProxy!.ws(req, socket, head, options);
    } catch (err) {
      if (err instanceof BailSynth) {
        this.bailSocket(socket, err);
      } else {
        this.errorSocket(err, socket);
      }
    }
  };

  private errorSocket(err: unknown, socket: Socket) {
    this.logger.error(err, 'Error while handling WebSocket request');
    socket.write(
      `HTTP/1.1 500 ${http.STATUS_CODES[500]}
`,
    );
    socket.end();
  }

  private bailSocket(socket: Socket, err: BailSynth) {
    this.logger.info(
      {
        err,
      },
      'Bailing on WebSocket request',
    );
    socket.write(
      `HTTP/1.1 ${err.statusCode} ${http.STATUS_CODES[err.statusCode]}
`,
    );
    socket.end();
  }

  private prepareRequestHeaders(object: HeadersMap): Record<string, string> {
    const result = {} as Record<string, string>;
    for (const key in object) {
      const value = object.get(key) as string | string[];
      if (typeof value === 'string') {
        result[key] = value;
      } else if (Array.isArray(value)) {
        result[key] = value.join(', ');
      }
    }
    return result;
  }
}
