import { ProxyFrameworkApp } from 'src/proxy-framework.app';
import pino from 'pino';

export abstract class ProxyExtension {
  protected logger: pino.Logger;
  constructor(protected app: ProxyFrameworkApp) {
    this.logger = this.app.logger.child({
      extension: this.constructor.name,
    });
  }

  abstract init(server: ProxyFrameworkApp): Promise<void> | void;
}
