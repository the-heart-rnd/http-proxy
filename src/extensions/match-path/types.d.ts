declare interface Rule {
  match?: {
    path?: string;
  };

  /**
   * @deprecated use `match.path` instead
   */
  source?: string;
}
