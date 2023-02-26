import { ProxyExtension } from 'src/extensions/proxy.extension';
import { OnModifyServiceRequestHeaders } from 'src/context.types';
import { HeadersMap } from 'src/headers.helpers';

export class SetHostExtension extends ProxyExtension {
  async init(): Promise<void> {
    this.app.onModifyServiceRequestHeaders
      .withOptions({
        stage: 2,
      })
      .tap('SetHostExtension', (context: OnModifyServiceRequestHeaders) => {
        const targetUrl = new URL(context.serviceRequestUrl);
        if (!context.serviceRequestOptions.headers) {
          context.serviceRequestOptions.headers = new HeadersMap();
        }
        context.serviceRequestOptions.headers.set('host', targetUrl.host);
        return context;
      });
  }
}
