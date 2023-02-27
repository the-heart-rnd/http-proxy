import { ProxyExtension } from 'src/extensions/proxy.extension';
import { createServer, IncomingMessage, RequestListener, Server } from 'http';
import {
  HttpMethod,
  OnModifyRequestBody,
  OnModifyRequestHeaders,
  OnModifyResponseBody,
  OnModifyResponseHeaders,
  OnModifyServiceRequestBody,
  OnModifyServiceRequestHeaders,
  OnPostServiceCall,
  OnPreServiceCall,
  OnRequestHeaders,
} from 'src/context.types';
import { BailSynth } from 'src/flow-control';
import { PostServiceFlowMethods, PreServiceFlowMethods } from 'src/flows';
import { SetHostExtension } from 'src/extensions/set-host/set-host.extension';
import { MatchPathExtension } from 'src/extensions/match-path/match-path.extension';
import { Argv } from 'yargs';
import { HeadersMap } from 'src/headers.helpers';

type TransportContext = { req: IncomingMessage };

type Configuration = {
  port: number;
  host: string;
};

export class InputHttpExtension
  extends ProxyExtension
  implements
    PreServiceFlowMethods<TransportContext>,
    PostServiceFlowMethods<TransportContext>
{
  static dependencies = [SetHostExtension, MatchPathExtension];

  public httpServer?: Server;

  // CLI
  static prepareCli = (yargs: Argv) =>
    yargs.options({
      httpPort: {
        type: 'number',
        default: 8000,
        demandOption: false,
        alias: ['p', 'port'],
        describe: 'The port to run the HTTP proxy on',
      },
    });

  async init(): Promise<void> {
    if (!this.getConfig()) {
      return;
    }

    this.app.onStart.tapPromise('HttpExtension', this.startHttpServer);

    this.app.onStop.tapPromise('HttpExtension', this.stopHttpServer);
  }

  public async prepareRequestBody(
    onModifyRequestHeaders: OnModifyRequestHeaders,
    { req }: TransportContext,
  ): Promise<OnModifyRequestBody> {
    const chunks: Buffer[] = [];
    req.on('data', async (chunk) => {
      const onRequestBodyChunk = await this.app.onRequestBodyChunk.promise({
        ...onModifyRequestHeaders,
        chunk,
      });
      chunks.push(onRequestBodyChunk.chunk);
    });
    await new Promise((resolve, reject) => {
      req.on('end', () => {
        if (!req.complete) {
          reject(new BailSynth(500, {}, 'Request not complete'));
        }
        resolve(void 0);
      });
      req.on('error', reject);
    });

    return chunks.length > 0
      ? {
          ...onModifyRequestHeaders,
          body: Buffer.concat(chunks),
          hasBody: true,
        }
      : {
          ...onModifyRequestHeaders,
          hasBody: false,
        };
  }

  public async prepareServiceRequestHeaders(
    onPreServiceCall: OnPreServiceCall,
    { req }: TransportContext,
  ): Promise<OnModifyServiceRequestHeaders> {
    const target = onPreServiceCall.match.target;
    return {
      ...onPreServiceCall,
      serviceRequestOptions: {
        headers: HeadersMap.from(req.headers),
        path: new URL(target).pathname,
        method: req.method! as HttpMethod,
      },
      serviceRequestUrl: target,
    };
  }

  public async prepareServiceRequestBody(
    onModifyServiceRequestHeaders: OnModifyServiceRequestHeaders,
    transportContext: TransportContext,
  ): Promise<OnModifyServiceRequestBody> {
    return onModifyServiceRequestHeaders.hasBody
      ? {
          ...onModifyServiceRequestHeaders,
          serviceRequestBody: onModifyServiceRequestHeaders.body,
          serviceRequestHasBody: true,
        }
      : {
          ...onModifyServiceRequestHeaders,
          serviceRequestHasBody: false,
        };
  }

  public async prepareResponseHeaders(
    onPostServiceCall: OnPostServiceCall,
    transportContext: TransportContext,
  ): Promise<OnModifyResponseHeaders> {
    return {
      ...onPostServiceCall,
      responseHeaders: onPostServiceCall.serviceResponseHeaders,
      responseStatusCode: onPostServiceCall.serviceResponseStatusCode,
    };
  }

  public async prepareResponseBody(
    onModifyResponseHeaders: OnModifyResponseHeaders,
    transportContext: TransportContext,
  ): Promise<OnModifyResponseBody> {
    return onModifyResponseHeaders.serviceResponseHasBody
      ? {
          ...onModifyResponseHeaders,
          responseBody: onModifyResponseHeaders.serviceResponseBody,
          responseHasBody: true,
        }
      : {
          ...onModifyResponseHeaders,
          responseHasBody: false,
        };
  }

  public async prepareRequest(
    onRequestHeaders: OnRequestHeaders,
    { req }: TransportContext,
  ): Promise<RequestMetadata> {
    return {
      host: req.headers.host!,
      path: req.url!,
      url: 'http://' + req.headers.host! + req.url!,
      method: req.method! as HttpMethod,
    };
  }

  private startHttpServer = async () => {
    const config = this.getConfig()!;
    this.logger.info(
      `Starting HTTP proxy server on ${config.host}:${config.port}`,
    );

    this.httpServer = await new Promise((resolve) => {
      const server = createServer(this.onRequest);
      server.listen(config.port, config.host, () => resolve(server));
    });

    await this.httpServer.on('connection', async (socket) => {
      socket.pause();

      await this.app.onConnection.promise({
        connection: socket,
      });

      socket.resume();
    });
  };

  private stopHttpServer = async () => {
    this.logger.info(`Stopping HTTP proxy server`);

    await this.httpServer?.close();
  };

  private onRequest: RequestListener = async (req, res) => {
    try {
      this.logger.debug(
        {
          headers: req.headers,
          method: req.method,
          url: req.url,
        },
        'Incoming HTTP request',
      );
      const requestResponseFlowResult =
        await this.app.flows.executeRequestResponseFlow(
          {
            headers: HeadersMap.from(req.headers),
          },
          { req },
          this,
        );

      res.writeHead(
        requestResponseFlowResult.responseStatusCode,
        requestResponseFlowResult.responseHeaders.toJSON(),
      );
      if (requestResponseFlowResult.responseHasBody) {
        res.write(requestResponseFlowResult.responseBody);
      }
      res.end();
    } catch (error) {
      if (error instanceof BailSynth) {
        res.writeHead(error.statusCode, error.headers);
        if (error.body) {
          res.write(error.body);
        }
        res.end();
      } else {
        if (error instanceof Error) {
          this.logger.error(error);
        } else if (
          typeof error === 'object' &&
          error !== null &&
          'stack' in error &&
          'message' in error
        ) {
          const repackedError = new Error(String(error.message));
          repackedError.stack = String(error.stack);
          this.logger.error(repackedError);
        } else {
          this.logger.error(error);
        }
        res.writeHead(500, 'Proxy Server Error');
        res.end();
      }
    }
  };

  public getConfig(): Configuration | undefined {
    if (this.app.configuration.http) {
      return this.app.configuration.http;
    }
    if (this.app.configuration.host && this.app.configuration.port) {
      return {
        host: this.app.configuration.host,
        port: this.app.configuration.port,
      };
    }
    return undefined;
  }
}
