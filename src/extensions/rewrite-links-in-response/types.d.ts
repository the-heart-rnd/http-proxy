interface RuleResponseRewrite {
  /**
   * If set, the urls in the response body will be rewritten to match the proxy
   * rules.
   * If set to true, content types of text/*, application/json and application/javascript will be rewritten.
   * If set to a string, the content type will be matched against the string.
   * If set to an array of strings, the content type will be matched against the
   * array.
   */
  linksInResponse?:
    | {
        match: {
          contentTypes: string | string[];
        };
      }
    | boolean;
}

interface RuleResponse {
  rewrite?: RuleResponseRewrite;
}

declare interface Rule {
  response?: RuleResponse;

  /**
   * @deprecated use "rewrite.linksInResponse"
   */
  rewriteBody?: true | string | string[];
}
