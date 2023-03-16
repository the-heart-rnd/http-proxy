import { OnModifyServiceResponseWithBody } from 'src/context.types';
import { ParsedMediaType } from 'content-type';
import { AbstractProcessor } from 'src/extensions/rewrite-rebase/processors/abstract.processor';

export class HTMLProcessor extends AbstractProcessor {
  process(
    context: OnModifyServiceResponseWithBody,
    contentType: ParsedMediaType,
  ): OnModifyServiceResponseWithBody {
    context.serviceResponseBody = this.addRebaseHeader(
      context,
      contentType,
      context.serviceResponseBody,
    );

    return context;
  }

  private addRebaseHeader(
    context: OnModifyServiceResponseWithBody,
    contentType: ParsedMediaType,
    serviceResponseBody: Buffer,
  ): Buffer {
    const serviceBasePath = context.match.match?.path;
    if (!serviceBasePath) {
      this.contextLogger(context).info(
        "Rule doesn't define match.path, cannot add <base> header",
      );
      return serviceResponseBody;
    }

    const tagToInsert = `<base href="${context.match.match?.path}">`;

    const contents = serviceResponseBody.toString(
      contentType.parameters['charset'] as BufferEncoding | undefined,
    );

    const headTagMatch = contents.match(/<head([^>]*)>/i);
    if (!headTagMatch) {
      this.contextLogger(context).warn(
        `Could not find <head> tag in HTML response. Skipping rebase.`,
      );
      return serviceResponseBody;
    }

    const headTagIndex = headTagMatch.index;

    const headTagEndIndex = headTagIndex! + headTagMatch[0].length;

    const headTagContents =
      contents.substring(0, headTagEndIndex) +
      tagToInsert +
      contents.substring(headTagEndIndex);

    return Buffer.from(
      headTagContents,
      contentType.parameters['charset'] as BufferEncoding | undefined,
    );
  }
}
