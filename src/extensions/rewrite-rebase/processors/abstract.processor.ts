import { ProxyExtension } from 'src/extensions/proxy.extension';
import { OnModifyServiceResponseWithBody } from 'src/context.types';
import { ParsedMediaType } from 'content-type';
import { ProxyFrameworkApp } from 'src/proxy-framework.app';

export abstract class AbstractProcessor extends ProxyExtension {
  abstract process(
    context: OnModifyServiceResponseWithBody,
    contentType: ParsedMediaType,
  ): OnModifyServiceResponseWithBody;

  init(server: ProxyFrameworkApp): Promise<void> | void {
    return undefined;
  }
}
