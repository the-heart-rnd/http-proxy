import { ProxyExtension } from 'src/extensions/proxy.extension';
import { DecodeBodyExtension } from 'src/extensions/decode-body/decode-body.extension';
import {
  OnModifyServiceResponseBody,
  OnModifyServiceResponseWithBody,
} from 'src/context.types';
import { parse, ParsedMediaType } from 'content-type';
import { AbstractProcessor } from 'src/extensions/rewrite-rebase/processors/abstract.processor';
import { HTMLProcessor } from 'src/extensions/rewrite-rebase/processors/html.processor';
import { TextProcessor } from 'src/extensions/rewrite-rebase/processors/text.processor';
import { CSSProcessor } from 'src/extensions/rewrite-rebase/processors/css.processor';

export class RewriteRebaseExtension extends ProxyExtension {
  static dependencies = [
    DecodeBodyExtension,
    HTMLProcessor,
    TextProcessor,
    CSSProcessor,
  ];
  private contentTypeToProcessorMap = new Map<string, AbstractProcessor>();

  async init(): Promise<void> {
    this.app.onStart
      .withOptions({ stage: -1 })
      .tap(RewriteRebaseExtension.name, this.handleDeprecatedConfig);

    this.app.onModifyServiceResponseBody
      .withOptions({
        stage: 2,
      })
      .tap(RewriteRebaseExtension.name, this.rebaseResponseBody);

    this.contentTypeToProcessorMap.set(
      'text/html',
      this.app.get(HTMLProcessor),
    );

    this.contentTypeToProcessorMap.set('text/css', this.app.get(CSSProcessor));

    this.contentTypeToProcessorMap.set('text/*', this.app.get(TextProcessor));

    this.contentTypeToProcessorMap.set(
      'application/*',
      this.app.get(TextProcessor),
    );
  }

  private rebaseResponseBody = (
    context: OnModifyServiceResponseBody,
  ): OnModifyServiceResponseBody => {
    const rewriteBody = context.match.response?.rewrite?.rebase;

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

  private handleDeprecatedConfig = () => {
    const rules = this.app.configuration.rules;
    for (const i in rules) {
      const { rewriteBody, ...rest } = rules[i];
      if (rewriteBody) {
        const rewrite: RuleResponseRewrite =
          typeof rewriteBody === 'boolean'
            ? { rebase: rewriteBody }
            : {
                rebase: { match: { contentTypes: rewriteBody } },
              };
        const updatedRule: Rule = {
          ...rest,
          response: {
            ...rest.response,
            rewrite: {
              ...rewrite,
              ...rest.response?.rewrite,
            },
          },
        };

        this.logger.warn(
          {
            deprecatedRule: rules[i],
            updatedRule: updatedRule,
            option: 'rewrite.rebase',
          },
          'The "rewriteBody" property is deprecated. Please use "response.rewrite.rebase" instead.',
        );

        rules[i] = updatedRule;
      }
    }
  };
}
