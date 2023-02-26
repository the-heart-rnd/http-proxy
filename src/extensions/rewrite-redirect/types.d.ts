interface RuleResponseRewrite {
  redirects?: boolean;
}

interface RuleResponse {
  rewrite?: RuleResponseRewrite;
}

declare interface Rule {
  response?: RuleResponse;

  /**
   * @deprecated use "response.rewrite.redirects"
   */
  rewriteRedirects?: boolean;
}
