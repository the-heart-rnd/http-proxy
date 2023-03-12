declare interface AppConfiguration {
  matchAbsolutePathsByReferer?: boolean;
}

declare interface RequestMetadata {
  isRebasing?: boolean;
}

declare interface Rule {
  /**
   * @deprecated This option is now enabled by default for all paths. Can be disabled globally
   * using the CLI option `--matchAbsolutePathsByReferer=false`
   */
  rebaseAbsolutePathsByReferer?: boolean;
}
