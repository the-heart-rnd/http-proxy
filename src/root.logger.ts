import pino from 'pino';

export const rootLogger = pino({
  level: process.env.LOG_LEVEL || 'info',
});
