import { OnModifyServiceResponseWithBody } from 'src/context.types';
import { ParsedMediaType } from 'content-type';
import { AbstractResponseProcessor } from 'src/extensions/rewrite-rebase/processors/abstract-response.processor';

export class CSSResponseProcessor extends AbstractResponseProcessor {
  process(
    context: OnModifyServiceResponseWithBody,
    contentType: ParsedMediaType,
  ): OnModifyServiceResponseWithBody {
    context.serviceResponseBody = this.processURLExpressions(
      context,
      contentType,
      context.serviceResponseBody,
    );

    return context;
  }

  private processURLExpressions(
    context: OnModifyServiceResponseWithBody,
    contentType: ParsedMediaType,
    serviceResponseBody: Buffer,
  ): Buffer {
    const serviceBasePath = context.match.match?.path;
    if (!serviceBasePath) {
      this.contextLogger(context).info(
        "Rule doesn't define match.path, cannot add rebase url() expressions",
      );
      return serviceResponseBody;
    }

    const contents = serviceResponseBody.toString(
      contentType.parameters['charset'] as BufferEncoding | undefined,
    );

    const replacedContents = contents.replaceAll(
      /(url\(|@import\s)(["']?)\//g,
      `$1$2${serviceBasePath}/`,
    );

    return Buffer.from(
      replacedContents,
      contentType.parameters['charset'] as BufferEncoding | undefined,
    );
  }
}
