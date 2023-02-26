import axios from 'axios';
import { createTestProxy } from 'test/create-test-proxy';
import { InputHttpExtension } from 'src/extensions/input-http/input-http.extension';
import getPort from 'get-port';
import { OnPostServiceCall, OnServiceCall } from 'src/context.types';
import { ResponseHeadersExtension } from 'src/extensions/response-headers/response-headers.extension';
import { HeadersMap } from 'src/headers.helpers';

it('should be able to drop response headers', async () => {
  const port = await getPort();
  const { proxy, onServiceCallMock } = await createTestProxy({
    rules: [
      {
        target: `http://example.com`,
        responseHeaders: {
          'X-Test-Header': 'drop',
        },
        match: {
          path: '/proxy',
        },
      },
    ],
    http: { port: port, host: 'localhost' },
  });
  proxy.use(InputHttpExtension);
  proxy.use(ResponseHeadersExtension);
  await proxy.start();

  onServiceCallMock.mockImplementationOnce(
    (context: OnServiceCall): OnPostServiceCall => ({
      ...context,
      serviceResponseHasBody: false,
      serviceResponseStatusCode: 200,
      serviceResponseHeaders: HeadersMap.from({
        'x-test-header': 'test',
        'other-header': 'test2',
      }),
    }),
  );

  const response = await axios.get(`http://localhost:${port}/proxy`);
  expect(response.headers['x-test-header']).toBe(undefined);
  expect(response.headers['other-header']).toBe('test2');
});

it('should be able to set response headers', async () => {
  const port = await getPort();
  const { proxy, onServiceCallMock } = await createTestProxy({
    rules: [
      {
        target: `http://example.com`,
        responseHeaders: {
          'X-Test-Header': {
            action: 'set',
            value: 'other-value',
          },
        },
        match: {
          path: '/proxy',
        },
      },
    ],
    http: { port: port, host: 'localhost' },
  });
  proxy.use(InputHttpExtension);
  proxy.use(ResponseHeadersExtension);
  await proxy.start();

  onServiceCallMock.mockImplementationOnce(
    (context: OnServiceCall): OnPostServiceCall => ({
      ...context,
      serviceResponseHasBody: false,
      serviceResponseStatusCode: 200,
      serviceResponseHeaders: HeadersMap.from({
        'x-test-header': 'test',
        'other-header': 'test2',
      }),
    }),
  );

  const response = await axios.get(`http://localhost:${port}/proxy`);
  expect(response.headers['x-test-header']).toBe('other-value');
  expect(response.headers['other-header']).toBe('test2');
});

it('should be able to set response headers, only if they are not already set', async () => {
  const port = await getPort();
  const { proxy, onServiceCallMock } = await createTestProxy({
    rules: [
      {
        target: `http://example.com`,
        responseHeaders: {
          'X-Test-Header': {
            action: 'setIfMissing',
            value: 'other-value',
          },
        },
        match: {
          path: '/proxy',
        },
      },
    ],
    http: { port: port, host: 'localhost' },
  });
  proxy.use(InputHttpExtension);
  proxy.use(ResponseHeadersExtension);
  await proxy.start();

  onServiceCallMock.mockImplementationOnce(
    (context: OnServiceCall): OnPostServiceCall => ({
      ...context,
      serviceResponseHasBody: false,
      serviceResponseStatusCode: 200,
      serviceResponseHeaders: HeadersMap.from({
        'x-test-header': 'test',
        'other-header': 'test2',
      }),
    }),
  );

  const response = await axios.get(`http://localhost:${port}/proxy`);
  expect(response.headers['x-test-header']).toBe('test');
  expect(response.headers['other-header']).toBe('test2');

  onServiceCallMock.mockImplementationOnce(
    (context: OnServiceCall): OnPostServiceCall => ({
      ...context,
      serviceResponseHasBody: false,
      serviceResponseStatusCode: 200,
      serviceResponseHeaders: HeadersMap.from({
        'other-header': 'test2',
      }),
    }),
  );

  const response2 = await axios.get(`http://localhost:${port}/proxy`);
  expect(response2.headers['x-test-header']).toBe('other-value');
  expect(response2.headers['other-header']).toBe('test2');
});
