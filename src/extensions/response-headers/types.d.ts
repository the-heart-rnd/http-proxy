declare namespace ResponseHeadersNamespace {
  type HeaderActionType = 'drop' | 'set' | 'setIfMissing';
  type HeaderActionDefinition =
    | {
        action: 'drop';
      }
    | {
        action: 'set';
        value: string;
      }
    | {
        action: 'setIfMissing';
        value: string;
      };
}

type RuleResponseHeaders = Record<
  string,
  'drop' | ResponseHeadersNamespace.HeaderActionDefinition
>;

interface RuleResponse {
  headers?: RuleResponseHeaders;
}

declare interface Rule {
  response?: RuleResponse;

  /**
   * @deprecated use "response.headers"
   */
  responseHeaders?: RuleResponseHeaders;
}
