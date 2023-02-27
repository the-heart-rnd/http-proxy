import { ProxyExtension } from 'src/extensions/proxy.extension';
import { DecodeBodyExtension } from 'src/extensions/decode-body/decode-body.extension';
import {
  OnModifyServiceResponseBody,
  OnModifyServiceResponseWithBody,
} from 'src/context.types';
import { parse, ParsedMediaType } from 'content-type';
import { AbstractResponseProcessor } from 'src/extensions/rewrite-links-in-response/processors/abstract-response.processor';
import { HTMLResponseProcessor } from 'src/extensions/rewrite-links-in-response/processors/html-response.processor';
import { TextResponseProcessor } from 'src/extensions/rewrite-links-in-response/processors/text-response.processor';
import { CSSResponseProcessor } from 'src/extensions/rewrite-links-in-response/processors/css-response.processor';

export class RewriteLinksInResponseExtension extends ProxyExtension {
  static dependencies = [
    DecodeBodyExtension,
    HTMLResponseProcessor,
    TextResponseProcessor,
    CSSResponseProcessor,
  ];
  private contentTypeToProcessorMap = new Map<
    string,
    AbstractResponseProcessor
  >();

  async init(): Promise<void> {
    this.app.onModifyServiceResponseBody
      .withOptions({
        stage: 2,
      })
      .tap(
        RewriteLinksInResponseExtension.name,
        this.rewriteLinksInResponseBody,
      );

    this.contentTypeToProcessorMap.set(
      'text/html',
      this.app.get(HTMLResponseProcessor),
    );

    this.contentTypeToProcessorMap.set(
      'text/css',
      this.app.get(CSSResponseProcessor),
    );

    this.contentTypeToProcessorMap.set(
      'text/*',
      this.app.get(TextResponseProcessor),
    );
  }

  private rewriteLinksInResponseBody = (
    context: OnModifyServiceResponseBody,
  ): OnModifyServiceResponseBody => {
    let rewriteBody = context.match.response?.rewrite?.rebase;

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

    if (!rewriteBody) {
      return context;
    }

    if (!context.serviceResponseHasBody) {
      return context;
    }

    const contentTypeHeader =
      context.serviceResponseHeaders.get('content-type');

    if (!contentTypeHeader) {
      this.contextLogger(context).warn(
        'No content-type header found in response, cannot perform rebasing.',
      );
      return context;
    }

    const contentType = parse(contentTypeHeader);

    if (typeof rewriteBody === 'object' && rewriteBody.match.contentTypes) {
      let contentTypesAllowedByRule = rewriteBody.match.contentTypes;
      if (!Array.isArray(contentTypesAllowedByRule)) {
        contentTypesAllowedByRule = [contentTypesAllowedByRule];
      }

      let allowed = false;
      for (const contentTypeToMatchTo of contentTypesAllowedByRule) {
        if (this.contentTypeMatch(contentTypeToMatchTo, contentType.type)) {
          allowed = true;
          break;
        }
      }

      if (!allowed) {
        this.contextLogger(context).debug(
          { contentType: contentType.type },
          'Content type not allowed by rule, skipping.',
        );
        return context;
      }
    }

    return this.processResponseBody(context, contentType);
  };

  private contentTypeMatch(
    contentTypeToMatchTo: string,
    contentTypeToTest: string,
  ) {
    const [allowedType, allowedSubType] = contentTypeToMatchTo.split('/');
    const [typeType, typeSubType] = contentTypeToTest.split('/');

    if (allowedType === '*' || allowedType === typeType) {
      if (allowedSubType === '*' || allowedSubType === typeSubType) {
        return true;
      }
    }

    return false;
  }

  private processResponseBody(
    context: OnModifyServiceResponseWithBody,
    contentType: ParsedMediaType,
  ) {
    let processed = false;
    for (const [contentTypeToMatchTo, processor] of this
      .contentTypeToProcessorMap) {
      if (this.contentTypeMatch(contentTypeToMatchTo, contentType.type)) {
        this.contextLogger(context).debug(
          {
            contentType: contentType.type,
            processor: processor.constructor.name,
            processorContentType: contentTypeToMatchTo,
          },
          `Processing response body with processor for content-type ${contentTypeToMatchTo}`,
        );
        processed = true;
        try {
          context = processor.process(context, contentType);
        } catch (e) {
          this.contextLogger(context).error(
            {
              error: e,
              contentType: contentType.type,
              processorContentType: contentTypeToMatchTo,
              processor: processor.constructor.name,
            },
            'Error while processing response body',
          );
        }
      }
    }

    if (!processed) {
      this.contextLogger(context).debug(
        `No processor found for content-type ${contentType.type}`,
      );
    }

    return context;
  }
}
