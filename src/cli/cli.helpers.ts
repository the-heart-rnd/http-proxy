import { Argv } from 'yargs';

export function createCLI(
  yargs: Argv,
  extensions: Array<CliProvider<any>>,
): Argv {
  for (const extension of extensions) {
    if (extension.prepareCli) {
      yargs = extension.prepareCli(yargs);
    }
  }
  return yargs;
}

export function processCLI(
  values: any,
  extensions: Array<CliProvider<any>>,
): Partial<AppConfiguration> {
  const config: Partial<AppConfiguration> = values;
  for (const extension of extensions) {
    if (extension.processCli) {
      Object.assign(config, extension.processCli(values));
    }
  }
  return config;
}
