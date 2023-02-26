import axios from 'axios';
import { createTestProxy } from 'test/create-test-proxy';
import { InputHttpExtension } from 'src/extensions/input-http/input-http.extension';
import getPort from 'get-port';
import { OnPostServiceCall, OnServiceCall } from 'src/context.types';
import { RewriteCookieExtension } from 'src/extensions/rewrite-cookie/rewrite-cookie.extension';
import { HeadersMap } from 'src/headers.helpers';

it('should be able to change cookie domains', async () => {
  const port = await getPort();
  const { proxy, onServiceCallMock } = await createTestProxy({
    rules: [
      {
        target: `http://example.com`,
        rewriteCookie: true,
        match: {
          path: '/proxy',
        },
      },
    ],
    http: { port: port, host: 'localhost' },
  });
  proxy.use(InputHttpExtension);
  proxy.use(RewriteCookieExtension);
  await proxy.start();

  onServiceCallMock.mockImplementationOnce(
    (context: OnServiceCall): OnPostServiceCall => ({
      ...context,
      serviceResponseHasBody: false,
      serviceResponseStatusCode: 200,
      serviceResponseHeaders: HeadersMap.from({
        'set-cookie': 'test=value; Domain=example.com',
      }),
    }),
  );

  const response = await axios.get(`http://localhost:${port}/proxy`);
  expect(response.headers['set-cookie']).toIncludeSameMembers([
    'test=value; Domain=localhost',
  ]);
});

it('should be able to change cookie domains, for multible cookies', async () => {
  const port = await getPort();
  const { proxy, onServiceCallMock } = await createTestProxy({
    rules: [
      {
        target: `http://example.com`,
        rewriteCookie: true,
        match: {
          path: '/proxy',
        },
      },
    ],
    http: { port: port, host: 'localhost' },
  });
  proxy.use(InputHttpExtension);
  proxy.use(RewriteCookieExtension);
  await proxy.start();

  onServiceCallMock.mockImplementationOnce(
    (context: OnServiceCall): OnPostServiceCall => ({
      ...context,
      serviceResponseHasBody: false,
      serviceResponseStatusCode: 200,
      serviceResponseHeaders: HeadersMap.from({
        'set-cookie': [
          'test=value; Domain=example.com',
          'test2=value2; Domain=example.com',
        ],
      }),
    }),
  );

  const response = await axios.get(`http://localhost:${port}/proxy`);
  expect(response.headers['set-cookie']).toIncludeSameMembers([
    'test=value; Domain=localhost',
    'test2=value2; Domain=localhost',
  ]);
});
