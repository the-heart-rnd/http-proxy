declare interface RequestMetadata {
  host: string;
  path: string;
  url: string;
  method: string;
}

declare interface CliProvider<T> {
  prepareCli?: (yargs: import('yargs').Argv) => import('yargs').Argv<T>;
  processCli?: (values: T) => Partial<AppConfiguration>;
}

declare interface Rule {
  target: string;
  // source: string;
  //
  // rewriteBody?: true | string | string[];
  // rewriteCookie?: boolean;
  // rewriteRedirect?: boolean;
  // rebaseAbsolutePathsByReferer?: boolean;
  // cors?: boolean | 'referer' | 'proxy';
  // preflight?: boolean | 'auto';
  //
  // servicePath: string;
  // responseHeaders?: Record<string, HeaderActionType | HeaderActionDefinition>;
}

declare interface AppConfiguration {
  rules: Rule[];
  logger: import('pino').Logger;
  logFormat?: 'json' | 'pretty';
  logLevel?: import('pino').Level;
}
