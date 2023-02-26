type ResponseCorsMode = boolean | 'referer' | 'proxy' | '*';

type ResponseCorsPreflight = boolean | 'auto';

interface RuleResponse {
  cors?:
    | {
        mode?: ResponseCorsMode;
        preflight?: ResponseCorsPreflight;
      }
    | ResponseCorsMode;
}

declare interface Rule {
  response?: RuleResponse;

  /**
   * @deprecated use `response.cors` instead
   */
  cors?: ResponseCorsMode;
  /**
   * @deprecated use `response.cors` instead
   */
  preflight?: ResponseCorsPreflight;
}
