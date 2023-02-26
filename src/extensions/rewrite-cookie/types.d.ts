interface RuleResponseRewrite {
  cookie?: true;
}

interface RuleResponse {
  rewrite?: RuleResponseRewrite;
}

declare interface Rule {
  response?: RuleResponse;

  /**
   * @deprecated Use rewrite.cookie instead.
   */
  rewriteCookie?: true;
}
