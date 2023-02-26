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
    const referer = this.app.onConfigMatch.call({
      ...context,
      request: {
        ...context.request,
        isRebasing: true,
        url: refererHeader,
        path: refererPathName,
      },
    });

    if (!referer) return undefined;

    return {
      ...context,
      match: referer.match,
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
