import { ProxyFrameworkApp } from 'src/proxy-framework.app';
import {
  OnModifyServiceResponseBody,
  OnModifyServiceResponseHeaders,
  OnPostServiceCall,
  OnServiceCall,
  OnServiceResponseHeaders,
} from 'src/context.types';
import { ProxyExtension } from 'src/extensions/proxy.extension';
import pino from 'pino';
import pretty from 'pino-pretty';
import { ServiceFlowMethods } from 'src/flows';
import { HeadersMap } from 'src/headers.helpers';

let proxy: ProxyFrameworkApp;

let onServiceCallMock: jest.Mock<
  OnPostServiceCall | Promise<OnPostServiceCall>,
  [OnServiceCall]
>;

export async function createTestProxy(
  config: PartialKeys<AppConfiguration, 'host' | 'logger'>,
) {
  onServiceCallMock = jest.fn(
    (context: OnServiceCall): OnPostServiceCall => ({
      ...context,
      serviceResponseHeaders: HeadersMap.from({
        'content-type': 'text/plain',
      }),
      serviceResponseStatusCode: 200,
      serviceResponseHasBody: true,
      serviceResponseBody: Buffer.from('test'),
    }),
  );

  class FakeServiceCallExtension
    extends ProxyExtension
    implements ServiceFlowMethods<OnPostServiceCall>
  {
    init(server: ProxyFrameworkApp): Promise<void> | void {
      server.onServiceCall
        .withOptions({
          stage: 10,
        })
        .tapPromise(
          'FakeServiceCallExtension',
          async (context: OnServiceCall) => {
            return this.app.flows.executeServiceFlow(
              context,
              await onServiceCallMock(context),
              this,
            );
          },
        );
    }

    prepareServiceResponseBody(
      flowContext: OnModifyServiceResponseHeaders,
      implementationContext: OnPostServiceCall,
    ): Promise<OnModifyServiceResponseBody> {
      return Promise.resolve(implementationContext);
    }

    prepareServiceResponseHeaders(
      flowContext: OnServiceCall,
      implementationContext: OnPostServiceCall,
    ): Promise<OnServiceResponseHeaders> {
      return Promise.resolve(implementationContext);
    }
  }

  proxy = new ProxyFrameworkApp({
    host: 'localhost',
    logger: pino(
      {
        level: 'debug',
      },
      pretty({
        colorize: true,
        sync: true,
        singleLine: true,
      }),
    ),
    ...config,
  });

  proxy.use(FakeServiceCallExtension);

  return {
    proxy,
    onServiceCallMock,
  };
}

afterEach(async () => {
  await proxy?.stop();
});
