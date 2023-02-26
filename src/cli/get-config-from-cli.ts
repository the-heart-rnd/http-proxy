import yargs from 'yargs';
import JSON from 'json5';
import { readFileSync } from 'fs';
import path from 'path';
import { rootLogger } from 'src/root.logger';
import { extensions } from 'src/extensions';
import { createCLI, processCLI } from 'src/cli/cli.helpers';

const baseCliProvider: CliProvider<{
  host: string;
  config: string;
}> = {
  prepareCli: (yargs) =>
    yargs
      .options({
        host: {
          type: 'string',
          default: 'localhost',
          alias: 'h',
          describe: 'The host where proxy will be available',
        },
        config: {
          type: 'string',
          demandOption: true,
          alias: 'c',
          describe: 'The path to the json file containing the rules config',
        },
        logFormat: {
          type: 'string',
          options: ['pretty', 'json'],
          default: 'pretty',
          describe: 'The format of the logs',
        },
        logLevel: {
          type: 'string',
          options: ['debug', 'info', 'warn', 'error', 'fatal'],
          default: 'info',
          describe: 'The level of the logs',
        },
      })
      .example(
        'node index.js -p 8000 -h localhost -c rewrites.json',
        'Run the proxy on port 8000, rewrite the cookies, redirects and body contents to localhost and use the rewrites.json file for the rewrites config',
      ),
  processCli: ({ host, config }) => {
    rootLogger.debug(`Using config file: ${config}`);
    rootLogger.debug(`Using host: ${host}`);

    const rewritesConfig: Array<Rule> = JSON.parse(
      readFileSync(path.resolve(process.cwd(), config)).toString(),
    );

    return {
      host: host,
      rules: rewritesConfig,
    };
  },
};

const cliProviders = [baseCliProvider, ...(extensions as CliProvider<any>[])];

export const getConfigFromCli = () => {
  const cli = createCLI(yargs, cliProviders);
  const cliValues = cli.help().parseSync();
  return processCLI(cliValues, cliProviders);
};
