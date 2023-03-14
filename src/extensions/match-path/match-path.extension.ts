import { ProxyExtension } from 'src/extensions/proxy.extension';
import {
  OnConfigMatchFound,
  OnModifyServiceRequestHeaders,
  OnPreConfigMatch,
} from 'src/context.types';
import urlJoin from 'url-join';
import { ProxyFrameworkApp } from 'src/proxy-framework.app';

type Configuration = { host: string; port: number };

/**
 * This extension is responsible for binding services under a specific request (sub)path.
 */
export class MatchPathExtension extends ProxyExtension {
  async init(): Promise<void> {
    const config = this.getConfig();
    if (!config) {
      return;
    }

    this.app.onModifyServiceRequestHeaders.tap(
      'RewriteExtension',
      this.onModifyServiceRequestHeaders,
    );

    this.app.onConfigMatch.tap(MatchPathExtension.name, this.matchPath);

    this.app.onStart
      .withOptions({ stage: -1 })
      .tap(MatchPathExtension.name, this.handleDeprecatedConfig);

    this.app.onStart.tap(MatchPathExtension.name, this.logAppliedRewrites);
  }

  public resolveServiceUrl = (context: OnConfigMatchFound): string => {
    const { match, request } = context;
    if (!match.match?.path) return match.target;

    const requestUrl = new URL(request.url);
    const targetUrl = new URL(match.target);

    const matchResult = this.match(requestUrl.pathname, match.match.path);
    if (matchResult) {
      const subpath = this.getSubpath(requestUrl.pathname, match.match.path);

      targetUrl.pathname = subpath
        ? urlJoin(targetUrl.pathname, subpath)
        : targetUrl.pathname;
    } else {
      targetUrl.pathname = requestUrl.pathname;
    }

    targetUrl.search = requestUrl.search;
    targetUrl.hash = requestUrl.hash;

    return targetUrl.toString();
  };

  public resolveProxyUrl(rule: Rule, targetUrl: string): string | undefined {
    const config = this.getConfig();
    if (!config) {
      return;
    }

    if (!rule.match?.path) return undefined;

    const proxyUrl = new URL(targetUrl);
    proxyUrl.protocol = 'http:';
    proxyUrl.host = config.host;
    proxyUrl.port = config.port.toFixed(0);
    proxyUrl.pathname = urlJoin(
      rule.match.path,
      this.getSubpath(targetUrl, rule.target),
    );
    return proxyUrl.toString();
  }

  public getReverseMatch(location: string): Rule | undefined {
    let bestmatch: Rule | undefined;
    for (const rule of this.app.configuration.rules) {
      if (!location.startsWith(rule.target)) continue;
      if (
        !bestmatch ||
        (bestmatch.match?.path?.length || 0) > (rule.match?.path?.length || 0)
      ) {
        bestmatch = rule;
      }
    }
    return bestmatch;
  }

  private getSubpath(requestUrl: string, rulePath: string) {
    return requestUrl.substring(rulePath.length).replace(/^\//, '');
  }

  private onModifyServiceRequestHeaders = (
    context: OnModifyServiceRequestHeaders,
  ): OnModifyServiceRequestHeaders => {
    if (!context.match.match?.path) return context;

    return {
      ...context,
      serviceRequestUrl: this.resolveServiceUrl(context)!,
    };
  };

  private handleDeprecatedConfig = (app: ProxyFrameworkApp) => {
    const { rules } = app.configuration;

    for (const i in rules) {
      let rule = rules[i];
      // Handle legacy configs
      if (rule.source) {
        const correctRule = { ...rule, match: { path: rule.source } };
        delete correctRule.source;

        this.logger.warn(
          { deprecatedRule: rule, updatedRule: correctRule, option: 'source' },
          `The "source" property is deprecated. Please use "match.path" instead.`,
        );

        rules[i] = rule = correctRule;
      }
    }
  };

  private logAppliedRewrites = (app: ProxyFrameworkApp) => {
    const { rules } = app.configuration;

    for (const rule of rules) {
      if (!rule.match?.path) continue;

      const { target, match } = rule;

      this.logger.info(`Binding path ${match.path} to service ${target}`);
    }
  };

  private matchPath = (context: OnPreConfigMatch) => {
    const { config, request } = context;
    const { rules } = config;

    const contextLogger = this.contextLogger(context);

    contextLogger.info(`Trying to match by path ${request.path}`);

    for (const rule of rules) {
      let isLegacyConfig = false;
      // Handle legacy configs
      if (rule.source) {
        isLegacyConfig = true;
        rule.match = { path: rule.source };
      }

      // Handle legacy configs
      if (!rule.match?.path) continue;

      const match = this.match(request.path, rule.match.path);

      if (match) {
        if (isLegacyConfig) {
          contextLogger.warn(
            { rule },
            `The "source" property is deprecated. Please use "match.path" instead.`,
          );
        }

        const logger = contextLogger.child({ rule });

        logger.info(`Matched rule by path`);

        return {
          ...context,
          logger: logger,
          match: rule,
        };
      }
    }

    contextLogger.info(`No match found by path`);
    return undefined;
  };

  private match(requestedPath: string, rulePath: string) {
    return requestedPath.startsWith(rulePath);
  }

  private getConfig(): Configuration | undefined {
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
