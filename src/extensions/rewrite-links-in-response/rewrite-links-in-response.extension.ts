import { ProxyExtension } from 'src/extensions/proxy.extension';
import { DecodeBodyExtension } from 'src/extensions/decode-body/decode-body.extension';
import { OnModifyServiceResponseBody } from 'src/context.types';
import { parse } from 'content-type';

export class RewriteLinksInResponseExtension extends ProxyExtension {
  static dependencies = [DecodeBodyExtension];

  async init(): Promise<void> {
    this.app.onModifyServiceResponseBody
      .withOptions({
        stage: 2,
      })
      .tap(
        RewriteLinksInResponseExtension.name,
        this.rewriteLinksInResponseBody,
      );
  }

  private rewriteLinksInResponseBody = (
    context: OnModifyServiceResponseBody,
  ): OnModifyServiceResponseBody => {
    let rewriteBody = context.match.response?.rewrite?.linksInResponse;

    // Handle legacy config
    if (!rewriteBody && context.match.rewriteBody !== undefined) {
      this.contextLogger(context).warn(
        { rule: context.match },
        'The "rewriteBody" property is deprecated. Please use "response.rewrite.linksInResponse" instead.',
      );
      if (context.match.rewriteBody === true) {
        rewriteBody = true;
      } else {
        rewriteBody = {
          match: {
            contentTypes: context.match.rewriteBody,
          },
        };
      }
    }
    // End legacy config

    let allowedContentTypes: string[];
    if (!rewriteBody) {
      return context;
    }

    if (!context.serviceResponseHasBody) {
      return context;
    }

    if (rewriteBody === true) {
      allowedContentTypes = [
        'text/*',
        'application/json',
        'application/javascript',
      ];
    } else if (typeof rewriteBody.match.contentTypes === 'string') {
      allowedContentTypes = [rewriteBody.match.contentTypes];
    } else {
      allowedContentTypes = rewriteBody.match.contentTypes;
    }

    let contentTypeHeader = context.serviceResponseHeaders.get('content-type');

    if (!contentTypeHeader) {
      this.contextLogger(context).warn(
        'No content-type header found in response, assuming text/html',
      );
      contentTypeHeader = 'text/html';
    }

    const contentType = parse(contentTypeHeader);
    if (!this.contentTypeMatch(allowedContentTypes, contentType.type)) {
      return context;
    }
    const contents = context.serviceResponseBody.toString(
      contentType.parameters['charset'] as BufferEncoding | undefined,
    );
    const target = context.match.target;
    const servicePath = context.match.match?.path || '';
    const proxyOrigin = new URL(context.request.url).origin;

    const replaceValue = proxyOrigin + servicePath;
    this.contextLogger(context).debug(
      `Replacing all ${target} with ${replaceValue} in response`,
    );
    context.serviceResponseBody = Buffer.from(
      contents.replaceAll(target, replaceValue),
    );

    return context;
  };

  private contentTypeMatch(allowedContentTypes: string[], type: string) {
    return allowedContentTypes.some((allowedContentType) => {
      const [allowedType, allowedSubType] = allowedContentType.split('/');
      const [typeType, typeSubType] = type.split('/');

      if (allowedType === '*' || allowedType === typeType) {
        if (allowedSubType === '*' || allowedSubType === typeSubType) {
          return true;
        }
      }
    });
  }
}
