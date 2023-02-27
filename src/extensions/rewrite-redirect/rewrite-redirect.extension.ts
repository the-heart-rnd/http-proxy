import { ProxyExtension } from 'src/extensions/proxy.extension';
import {
  OnConfigMatchFound,
  OnModifyServiceResponseHeaders,
} from 'src/context.types';
import { MatchPathExtension } from 'src/extensions/match-path/match-path.extension';

export class RewriteRedirectExtension extends ProxyExtension {
  static dependencies = [MatchPathExtension];

  async init(): Promise<void> {
    this.app.onModifyServiceResponseHeaders.tapPromise(
      RewriteRedirectExtension.name,
      this.onModifyServiceResponseHeaders,
    );
  }

  private onModifyServiceResponseHeaders = async (
    context: OnModifyServiceResponseHeaders,
  ): Promise<OnModifyServiceResponseHeaders> => {
    const config = this.getConfig(context);
    if (!config) return context;

    let location = context.serviceResponseHeaders.get('location');
    if (!location) return context;

    if (location.startsWith('/')) {
      location = new URL(location, context.match.target).href;
    }

    const matchPathExtension = this.app.get(MatchPathExtension);
    const reverseMatch = matchPathExtension.getReverseMatch(location);

    if (!reverseMatch) return context;

    const newLocation = matchPathExtension.resolveProxyUrl(
      reverseMatch,
      location,
    );
    this.contextLogger(context).info(
      `Cannot rewrite redirect from ${location}, matcher could not create inverse url`,
    );
    if (!newLocation) return context;

    this.contextLogger(context).info(
      `Rewriting redirect from ${location} to ${newLocation}`,
    );
    context.serviceResponseHeaders.set('location', newLocation);
    return context;
  };

  private getConfig(context: OnConfigMatchFound) {
    return (
      context.match.response?.rewrite?.redirects ||
      context.match.rewriteRedirects
    );
  }
}
