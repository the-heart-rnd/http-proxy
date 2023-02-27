import { ProxyExtension } from 'src/extensions/proxy.extension';
import { ProxyFrameworkApp } from 'src/proxy-framework.app';
import {
  OnConfigMatchFound,
  OnModifyServiceResponseHeaders,
  OnPostServiceCall,
  OnPreServiceCall,
  OnServiceCall,
  ResponseHeaders,
} from 'src/context.types';
import { HeadersMap } from 'src/headers.helpers';

type CorsConfig = { mode: string | boolean; preflight: string | boolean };

export class CorsExtension extends ProxyExtension {
  init(server: ProxyFrameworkApp) {
    server.onModifyServiceResponseHeaders.tap(
      'CorsExtension',
      this.onModifyServiceResponseHeaders,
    );

    server.onServiceCall.tap('CorsExtension', this.onServiceCall);
  }

  private onModifyServiceResponseHeaders = (
    context: OnModifyServiceResponseHeaders,
  ): OnModifyServiceResponseHeaders => {
    const corsConfig = this.readConfig(context);
    if (!corsConfig) {
      return context;
    }

    const corsHeaders: ResponseHeaders = this.getCORSHeaders(
      context,
      corsConfig,
    );

    if (corsHeaders.size === 0) return context;

    this.contextLogger(context).debug({ corsHeaders }, 'Adding CORS headers');
    context.serviceResponseHeaders.assign(corsHeaders);

    if (corsConfig.preflight === 'auto' && this.isPreflight(context)) {
      context.serviceResponseStatusCode = 200;
    }

    return context;
  };

  private getCORSHeaders(
    context: OnPreServiceCall | OnPostServiceCall,
    config: CorsConfig,
  ): ResponseHeaders {
    const corsHeaders: ResponseHeaders = HeadersMap.from();
    const { mode } = config;

    if (!mode) return corsHeaders;

    const requestHeaders = context.headers;

    switch (mode) {
      case 'referer': {
        const refererHeader = requestHeaders.get('referer');
        if (!refererHeader) {
          this.contextLogger(context).info(
            'cors set to "referer" but no referer header found. Falling back to "proxy"',
          );
          return this.getCORSHeaders(context, {
            ...config,
            mode: 'proxy',
          });
        } else {
          this.contextLogger(context).debug(
            'Referer header found, setting CORS headers allowed origin to referer',
          );
          corsHeaders.set(
            'access-control-allow-origin',
            new URL(refererHeader).origin,
          );
        }
        corsHeaders.set('access-control-allow-credentials', 'true');
        break;
      }
      case 'proxy': {
        corsHeaders.set(
          'access-control-allow-origin',
          new URL(context.request.url).origin,
        );
        corsHeaders.set('access-control-allow-credentials', 'true');
        break;
      }
      case '*': {
        corsHeaders.set('access-control-allow-origin', '*');
      }
    }

    corsHeaders.mergeToCommaSeparatedSet(
      'access-control-allow-methods',
      ('serviceResponseHeaders' in context &&
        context.serviceResponseHeaders.get('access-control-allow-methods')) ||
        undefined,
      'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    );

    corsHeaders.mergeToCommaSeparatedSet(
      'access-control-allow-headers',
      ('serviceResponseHeaders' in context &&
        context.serviceResponseHeaders.get('access-control-allow-headers')) ||
        undefined,
      'X-Requested-With, Content-Type, Accept, Origin, Authorization, Cache-Control, Pragma, Expires',
    );

    if (this.isPreflight(context)) {
      corsHeaders.mergeToCommaSeparatedSet(
        'access-control-allow-methods',
        context.headers.get('access-control-request-methods'),
      );

      corsHeaders.mergeToCommaSeparatedSet(
        'access-control-allow-headers',
        context.headers.get('access-control-request-headers'),
      );
    }

    return corsHeaders;
  }

  private isPreflight(context: OnConfigMatchFound) {
    return context.request.method === 'OPTIONS';
  }

  private readConfig(context: OnConfigMatchFound): CorsConfig | null {
    let cors = context.match.response?.cors ?? {
      mode: context.match.cors,
      preflight: context.match.preflight,
    };

    if (typeof cors !== 'object') {
      cors = { mode: cors };
    }

    if (cors.mode === undefined && cors.preflight === undefined) {
      return null;
    }

    const { mode = 'referer', preflight = 'auto' } = cors;
    return { mode, preflight };
  }

  private onServiceCall = (
    context: OnServiceCall,
  ): OnPostServiceCall | undefined => {
    const config = this.readConfig(context);
    if (!config) {
      return;
    }

    if (config.preflight === true && this.isPreflight(context)) {
      const corsHeaders = this.getCORSHeaders(context, config);
      return {
        ...context,
        serviceResponseHasBody: false,
        serviceResponseStatusCode: 204,
        serviceResponseHeaders: corsHeaders,
      };
    }
  };
}
