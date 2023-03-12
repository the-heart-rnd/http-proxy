import {
  ArgumentNames,
  AsArray,
  AsyncParallelHook,
  AsyncSeriesBailHook,
  AsyncSeriesHook,
  AsyncSeriesWaterfallHook,
  SyncBailHook,
} from 'tapable';
import pino from 'pino';
import {
  OnConfigMatchFound,
  OnConfigMatchNotFound,
  OnConnection,
  OnModifyRequestBody,
  OnModifyRequestHeaders,
  OnModifyResponseBody,
  OnModifyResponseHeaders,
  OnModifyServiceRequestBody,
  OnModifyServiceRequestHeaders,
  OnModifyServiceResponseBody,
  OnModifyServiceResponseHeaders,
  OnPostServiceCall,
  OnPreConfigMatch,
  OnPreServiceCall,
  OnRequestBodyChunk,
  OnRequestHeaders,
  OnResponse,
  OnServiceCall,
  OnServiceResponseBodyChunk,
  OnServiceResponseHeaders,
} from 'src/context.types';
import { Flows } from 'src/flows';
import { ProxyExtension } from 'src/extensions/proxy.extension';
import { ExtensionClass } from 'src/extensions/types';
import { sync as readPackageUpSync } from 'read-pkg-up';

function readVersion(): string {
  try {
    // TODO: replace with build-time variable
    const pkg = readPackageUpSync({
      cwd: __dirname,
    });
    return pkg?.packageJson.version || '';
  } catch (_) {
    return '';
  }
}

class AsyncSeriesBailRejectHook<T, R> extends AsyncSeriesBailHook<
  T,
  R | undefined
> {
  constructor(args?: ArgumentNames<AsArray<T>>, name?: string) {
    super(args, name);
    this.withOptions({ stage: 100 }).tap(
      'AsyncSeriesBailRejectHook default',
      () => {
        throw new Error('AsyncSeriesBailRejectHook: No hook handler found');
      },
    );
  }
}

export class ProxyFrameworkApp {
  public onInitExtensions = new AsyncSeriesHook<[ProxyFrameworkApp]>([
    'server',
  ]);
  public onStart = new AsyncSeriesHook<[ProxyFrameworkApp]>(['server']);
  public onStop = new AsyncSeriesHook<[ProxyFrameworkApp]>(['server']);

  public onConnection = new AsyncSeriesHook<[OnConnection]>(['context']);
  public onRequestHeaders = new AsyncSeriesWaterfallHook<[OnRequestHeaders]>([
    'context',
  ]);
  public onPreConfigMatch = new AsyncSeriesWaterfallHook<[OnPreConfigMatch]>([
    'context',
  ]);
  public onConfigMatch = new SyncBailHook<
    [OnPreConfigMatch],
    OnConfigMatchFound | undefined
  >(['context']);
  public onConfigMatchFound = new AsyncSeriesWaterfallHook<
    [OnConfigMatchFound]
  >(['context']);
  public onConfigMatchNotFound = new AsyncParallelHook<[OnConfigMatchNotFound]>(
    ['context'],
  );
  public onModifyRequestHeaders = new AsyncSeriesWaterfallHook<
    [OnModifyRequestHeaders]
  >(['context']);
  public onRequestBodyChunk = new AsyncSeriesWaterfallHook<
    [OnRequestBodyChunk]
  >(['context']);
  public onModifyRequestBody = new AsyncSeriesWaterfallHook<
    [OnModifyRequestBody]
  >(['context']);
  public onPreServiceCall = new AsyncSeriesWaterfallHook<[OnPreServiceCall]>([
    'context',
  ]);
  public onModifyServiceRequestHeaders = new AsyncSeriesWaterfallHook<
    [OnModifyServiceRequestHeaders]
  >(['context']);
  public onModifyServiceRequestBody = new AsyncSeriesWaterfallHook<
    [OnModifyServiceRequestBody]
  >(['context']);
  public onServiceCall = new AsyncSeriesBailRejectHook<
    [OnServiceCall],
    OnPostServiceCall
  >(['context']);
  public onServiceResponseHeaders = new AsyncSeriesWaterfallHook<
    [OnServiceResponseHeaders]
  >(['context']);
  public onModifyServiceResponseHeaders = new AsyncSeriesWaterfallHook<
    [OnModifyServiceResponseHeaders]
  >(['context']);
  public onServiceResponseBodyChunk = new AsyncSeriesWaterfallHook<
    [OnServiceResponseBodyChunk]
  >(['context']);
  public onModifyServiceResponseBody = new AsyncSeriesWaterfallHook<
    [OnModifyServiceResponseBody]
  >(['context']);
  public onPostServiceCall = new AsyncSeriesWaterfallHook<[OnPostServiceCall]>([
    'context',
  ]);
  public onModifyResponseHeaders = new AsyncSeriesWaterfallHook<
    [OnModifyResponseHeaders]
  >(['context']);
  public onModifyResponseBody = new AsyncSeriesWaterfallHook<
    [OnModifyResponseBody]
  >(['context']);
  public onResponse = new AsyncParallelHook<[OnResponse]>(['context']);

  public version: string;
  public logger: pino.Logger;
  public flows: Flows;

  constructor(public readonly configuration: AppConfiguration) {
    this.version = readVersion();
    this.logger = configuration.logger;
    this.flows = new Flows(this);
  }

  public async start() {
    this.logger.info(`Starting proxy server v${this.version}`);
    this.logger.debug(`Log level: ${this.logger.level}`);
    this.logger.info(`Initializing extensions`);

    await this.onInitExtensions.promise(this);
    await this.onStart.promise(this);

    this.logger.info(`Proxy server started`);
  }

  public async stop() {
    this.logger.info(`Stopping proxy server`);
    await this.onStop.promise(this);
    this.logger.info(`Proxy server stopped`);
    this.logger.flush();
  }

  extensionsMap = new Map<ExtensionClass, ProxyExtension>();
  extensionsSet = new Set<ExtensionClass>();

  use(extension: ExtensionClass) {
    if (this.extensionsSet.has(extension)) {
      return;
    }
    this.extensionsSet.add(extension);

    this.onInitExtensions.tapPromise('App', async () => {
      await this.initializeExtension(extension);
    });
  }

  private async initializeExtension<Extension extends ProxyExtension>(
    extension: ExtensionClass<Extension>,
  ): Promise<Extension> {
    const existingInstance = this.extensionsMap.get(extension) as
      | Extension
      | undefined;
    if (existingInstance) {
      return existingInstance;
    }

    if (extension.dependencies)
      for (const dependency of extension.dependencies) {
        await this.initializeExtension(dependency);
      }

    const instance = new extension(this);
    this.extensionsMap.set(extension, instance);
    await instance.init(this);
    return instance;
  }

  get<Extension extends ProxyExtension>(
    extension: ExtensionClass<Extension>,
  ): Extension {
    const extensionInstance = this.extensionsMap.get(extension);
    if (!extensionInstance) {
      throw new Error(`Extension ${extension.name} is not loaded in the app`);
    }
    return extensionInstance as Extension;
  }
}
