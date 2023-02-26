import axios from 'axios';
import { createTestProxy } from 'test/create-test-proxy';
import { InputHttpExtension } from 'src/extensions/input-http/input-http.extension';
import getPort from 'get-port';
import { deflateSync, gzipSync } from 'zlib';
import brotli from 'compress-brotli';
import { DecodeBodyExtension } from 'src/extensions/decode-body/decode-body.extension';
import { OnPostServiceCall, OnServiceCall } from 'src/context.types';
import { HeadersMap } from 'src/headers.helpers';

it('should decode deflate-compressed body', async () => {
  const port = await getPort();
  const { proxy, onServiceCallMock } = await createTestProxy({
    rules: [
      {
        match: {
          path: '/proxy',
        },
        target: `http://example.com`,
      },
    ],
    http: { port: port, host: 'localhost' },
  });
  proxy.use(InputHttpExtension);
  proxy.use(DecodeBodyExtension);
  await proxy.start();

  onServiceCallMock.mockImplementationOnce(
    (context: OnServiceCall): OnPostServiceCall => ({
      ...context,
      serviceResponseHasBody: true,
      serviceResponseHeaders: HeadersMap.from({
        'content-encoding': 'deflate',
      }),
      serviceResponseStatusCode: 200,
      serviceResponseBody: deflateSync('Hello World!'),
    }),
  );

  const response = await axios.get(`http://localhost:${port}/proxy`);
  expect(response.headers['content-encoding']).toBe('identity');
  expect(response.data).toBe('Hello World!');
});

it('should decode gzip-compressed body', async () => {
  const port = await getPort();
  const { proxy, onServiceCallMock } = await createTestProxy({
    rules: [
      {
        match: {
          path: '/proxy',
        },
        target: `http://example.com`,
      },
    ],
    http: { port: port, host: 'localhost' },
  });
  proxy.use(InputHttpExtension);
  proxy.use(DecodeBodyExtension);
  await proxy.start();

  onServiceCallMock.mockImplementationOnce(
    (context: OnServiceCall): OnPostServiceCall => ({
      ...context,
      serviceResponseHasBody: true,
      serviceResponseHeaders: HeadersMap.from({
        'content-encoding': 'gzip',
      }),
      serviceResponseStatusCode: 200,
      serviceResponseBody: gzipSync('Hello World!'),
    }),
  );

  const response = await axios.get(`http://localhost:${port}/proxy`);
  expect(response.headers['content-encoding']).toBe('identity');
  expect(response.data).toBe('Hello World!');
});

it('should decode brotli-compressed body', async () => {
  const port = await getPort();
  const { proxy, onServiceCallMock } = await createTestProxy({
    rules: [
      {
        match: {
          path: '/proxy',
        },
        target: `http://example.com`,
      },
    ],
    http: { port: port, host: 'localhost' },
  });
  proxy.use(InputHttpExtension);
  proxy.use(DecodeBodyExtension);
  await proxy.start();

  onServiceCallMock.mockImplementationOnce(
    async (context: OnServiceCall): Promise<OnPostServiceCall> => ({
      ...context,
      serviceResponseHasBody: true,
      serviceResponseHeaders: HeadersMap.from({
        'content-encoding': 'br',
      }),
      serviceResponseStatusCode: 200,
      serviceResponseBody: await brotli().compress('Hello World!'),
    }),
  );

  const response = await axios.get(`http://localhost:${port}/proxy`);
  expect(response.headers['content-encoding']).toBe('identity');
  expect(response.data).toBe('Hello World!');
});
