import { ProxyFrameworkApp } from 'src/proxy-framework.app';
import pino from 'pino';

export abstract class ProxyExtension {
  protected logger: pino.Logger;
  constructor(protected app: ProxyFrameworkApp) {
    this.logger = this.app.logger.child({
      extension: this.constructor.name,
    });
  }

  protected contextLogger(context: { logger: pino.Logger }) {
    return context.logger.child(this.logger.bindings());
  }

  abstract init(server: ProxyFrameworkApp): Promise<void> | void;
}
