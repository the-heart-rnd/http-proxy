import { ProxyExtension } from 'src/extensions/proxy.extension';
import { OnModifyServiceResponseHeaders } from 'src/context.types';

export class ResponseHeadersExtension extends ProxyExtension {
  async init(): Promise<void> {
    this.app.onModifyServiceResponseHeaders.tapPromise(
      ResponseHeadersExtension.name,
      this.onModifyServiceResponseHeaders,
    );
  }

  private onModifyServiceResponseHeaders = async (
    context: OnModifyServiceResponseHeaders,
  ): Promise<OnModifyServiceResponseHeaders> => {
    const config =
      context.match.response?.headers || context.match.responseHeaders;
    if (!config) {
      return context;
    }

    for (const header in config) {
      let actionDefinition = config[header];
      if (typeof actionDefinition === 'string') {
        actionDefinition = {
          action: actionDefinition as ResponseHeadersNamespace.HeaderActionType,
        } as ResponseHeadersNamespace.HeaderActionDefinition;
      }

      switch (actionDefinition.action) {
        case 'drop':
          if (context.serviceResponseHeaders.has(header)) {
            this.contextLogger(context).debug(
              `Dropping header ${header} from response`,
            );

            context.serviceResponseHeaders.delete(header);
          } else {
            this.contextLogger(context).debug(
              `Header ${header} not found in response, nothing to drop`,
            );
          }
          break;
        case 'set':
          this.contextLogger(context).debug(
            `Setting header ${header} to ${actionDefinition.value}`,
          );
          context.serviceResponseHeaders.set(header, actionDefinition.value);
          break;
        case 'setIfMissing':
          if (!context.serviceResponseHeaders.has(header)) {
            this.contextLogger(context).debug(
              `Setting header ${header} to ${actionDefinition.value}`,
            );
            context.serviceResponseHeaders.set(header, actionDefinition.value);
          } else {
            this.contextLogger(context).debug(
              `Header ${header} already exists, not setting`,
            );
          }
          break;
      }
    }

    return context;
  };
}
