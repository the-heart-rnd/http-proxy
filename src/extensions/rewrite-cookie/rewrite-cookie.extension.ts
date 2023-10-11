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
      this.contextLogger(context).debug('No cookie to rewrite');
    } else {
      const targetHost = new URL(context.match.target).hostname;
      const proxyHost = new URL(context.request.url).hostname;
      this.contextLogger(context).info(
        'Rewriting cookie from: ' + targetHost + ' to: ' + proxyHost,
      );
      context.serviceResponseHeaders.update('set-cookie', (cookie) =>
        this.rewriteCookie(cookie, targetHost, proxyHost),
      );
    }

    return context;
  };

  private rewriteCookie(
    cookie: string,
    requestedHost: string,
    rewriteHost: string,
  ): string {
    // get domain from cookie
    const [toReplace, cookieDomain] = cookie.match(/Domain=([^;]+)/) ?? [];
    if (!toReplace || !cookieDomain) {
      return cookie;
    }

    if (!this.domainMatches(cookieDomain, requestedHost)) {
      return cookie;
    }

    return cookie.replaceAll(toReplace, `Domain=${rewriteHost}`);
  }

  private domainMatches(domain: string, host: string): boolean {
    // .sth.com matches sth.com
    // sth.com matches sth.com
    // sth.com does not match nonsth.com
    // nonsth.com does not match sth.com
    // a.sth.com matches sth.com
    // sth.com matches a.sth.com
    // a.sth.com matches .sth.com
    // a.sth.com does not match b.sth.com

    const domainGtHost = domain.length;
    const longer = domainGtHost > host.length ? domain : host;
    const shorter = domainGtHost > host.length ? host : domain;

    if (longer === shorter) {
      return true;
    }

    if (shorter[0] !== '.') {
      return longer.endsWith(`.${shorter}`);
    }

    return longer.endsWith(shorter);
  }
}
