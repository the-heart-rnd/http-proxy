#!/usr/bin/env node
import { ProxyFrameworkApp } from 'src/proxy-framework.app';
import { getConfigFromCli } from 'src/cli/get-config-from-cli';
import { extensions } from 'src/extensions';
import { rootLogger } from 'src/root.logger';
import pino from 'pino';
import pretty from 'pino-pretty';

async function main() {
  const configFromCli = getConfigFromCli();
  const logFormat = configFromCli.logFormat || 'pretty';
  const logLevel = (configFromCli.logLevel ||
    process.env.LOG_LEVEL ||
    'info') as pino.Level;
  const proxy = new ProxyFrameworkApp({
    rules: [],
    logger:
      logFormat === 'json'
        ? pino({
            level: logLevel,
          })
        : pino(
            {
              level: logLevel,
            },
            pretty({
              colorize: true,
            }),
          ),
    ...configFromCli,
  });
  for (const extension of extensions) {
    proxy.use(extension);
  }

  await proxy.start();
}

main().catch((error) => rootLogger.fatal(error));
