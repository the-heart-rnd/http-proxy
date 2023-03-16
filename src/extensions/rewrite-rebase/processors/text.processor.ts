import { OnModifyServiceResponseWithBody } from 'src/context.types';
import { ParsedMediaType } from 'content-type';
import { AbstractProcessor } from 'src/extensions/rewrite-rebase/processors/abstract.processor';

export class TextProcessor extends AbstractProcessor {
  process(
    context: OnModifyServiceResponseWithBody,
    contentType: ParsedMediaType,
  ): OnModifyServiceResponseWithBody {
    const encoding = contentType.parameters['charset'] as
      | BufferEncoding
      | undefined;
    const contents = context.serviceResponseBody.toString(encoding);

    const target = context.match.target;
    const servicePath = context.match.match?.path || '';
    const proxyOrigin = new URL(context.request.url).origin;

    const replaceValue = proxyOrigin + servicePath;
    this.contextLogger(context).debug(
      `Replacing all ${target} with ${replaceValue} in response`,
    );
    context.serviceResponseBody = Buffer.from(
      contents.replaceAll(target, replaceValue),
      encoding,
    );

    return context;
  }
}
