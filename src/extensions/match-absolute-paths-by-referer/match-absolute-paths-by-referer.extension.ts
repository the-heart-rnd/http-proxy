import { ProxyExtension } from 'src/extensions/proxy.extension';
import { OnConfigMatchFound, OnPreConfigMatch } from 'src/context.types';
import { Argv } from 'yargs';

export class MatchAbsolutePathsByRefererExtension extends ProxyExtension {
  async init(): Promise<void> {
    if (this.app.configuration.matchAbsolutePathsByReferer === false) {
      this.logger.info(
        'MatchAbsolutePathsByRefererExtension is disabled by configuration',
      );
      return;
    }

    this.app.onConfigMatch
      .withOptions({
        stage: -1,
      })
      .tap(MatchAbsolutePathsByRefererExtension.name, this.onPreConfigMatch);
  }

  private onPreConfigMatch = (
    context: OnPreConfigMatch,
  ): OnConfigMatchFound | undefined => {
    const refererHeader = context.headers.get('referer');
    if (!refererHeader || context.request.isRebasing) return undefined;

    const refererPathName = new URL(refererHeader).pathname;

    context.logger.info(
      {
        refererHeader,
      },
      'Trying to match path by referer',
    );

    const request = {
      ...context.request,
      isRebasing: true,
      url: refererHeader,
      path: refererPathName,
    };

    const logger = this.contextLogger(context).child({
      request: request,
      originalRequest: context.request,
    });

    const referer = this.app.onConfigMatch.call({
      ...context,
      logger: logger,
      request: request,
    });

    if (!referer) return undefined;

    logger.info('Matched path by referer');

    const match = referer.match;

    return {
      ...context,
      logger: logger,
      match: match,
    };
  };

  // CLI
  static prepareCli(cli: Argv) {
    return cli.option('matchAbsolutePathsByReferer', {
      type: 'boolean',
      default: true,
      description: 'Match absolute paths by referer (see readme)',
    });
  }
}
