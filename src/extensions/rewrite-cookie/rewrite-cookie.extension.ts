import { ProxyExtension } from 'src/extensions/proxy.extension';
import { OnModifyServiceResponseHeaders } from 'src/context.types';

export class RewriteCookieExtension extends ProxyExtension {
  async init(): Promise<void> {
    this.app.onModifyServiceResponseHeaders.tapPromise(
      RewriteCookieExtension.name,
      this.onModifyServiceResponseHeaders,
    );
  }

  private onModifyServiceResponseHeaders = async (
    context: OnModifyServiceResponseHeaders,
  ): Promise<OnModifyServiceResponseHeaders> => {
    const config =
      context.match.response?.rewrite?.cookie || context.match.rewriteCookie;
    if (!config) {
      return context;
    }

    const originalResponseHeaders = context.serviceResponseHeaders;

    if (!originalResponseHeaders?.has('set-cookie')) {
      this.logger.debug('No cookie to rewrite');
    } else {
      const targetHost = new URL(context.match.target).hostname;
      const proxyHost = new URL(context.request.url).hostname;
      this.logger.info(
        'Rewriting cookie from: ' + targetHost + ' to: ' + proxyHost,
      );
      context.serviceResponseHeaders.update('set-cookie', (cookie) =>
        cookie.replaceAll(`Domain=${targetHost}`, `Domain=${proxyHost}`),
      );
    }

    return context;
  };
}
