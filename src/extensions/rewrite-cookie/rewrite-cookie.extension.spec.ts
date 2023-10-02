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

it('should be able to change cookie domains, for multiple cookies', async () => {
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

async function check(
  requestTo: string,
  responseCookieDomain: string,
  expectRewritten: string,
) {
  const port = await getPort();
  const { proxy, onServiceCallMock } = await createTestProxy({
    rules: [
      {
        target: requestTo,
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
          responseCookieDomain
            ? 'test=value; Domain=' + responseCookieDomain
            : 'test=value',
        ],
      }),
    }),
  );

  const response = await axios.get(`http://localhost:${port}/proxy`);
  expect(response.headers['set-cookie']).toIncludeSameMembers([
    expectRewritten ? 'test=value; Domain=' + expectRewritten : 'test=value',
  ]);
}

describe('explicit domain', () => {
  it('subdomain.example.com should be able to set cookie for .example.com', async () => {
    const requestTo = `http://subdomain.example.com`;
    const responseCookie = '.example.com';
    const expectRewritten = 'localhost';
    await check(requestTo, responseCookie, expectRewritten);
  });

  it('subdomain.example.com should be able to set cookie for example.com', async () => {
    const requestTo = `http://subdomain.example.com`;
    const responseCookie = 'example.com';
    const expectRewritten = 'localhost';
    await check(requestTo, responseCookie, expectRewritten);
  });

  it('example.com should be able to set cookie for .example.com', async () => {
    const requestTo = `http://example.com`;
    const responseCookie = '.example.com';
    const expectRewritten = 'localhost';
    await check(requestTo, responseCookie, expectRewritten);
  });

  it('example.com should be able to set cookie for example.com', async () => {
    const requestTo = `http://example.com`;
    const responseCookie = 'example.com';
    const expectRewritten = 'localhost';
    await check(requestTo, responseCookie, expectRewritten);
  });

  it('example.com should not be able to set cookie for bar.com', async () => {
    const requestTo = `http://example.com`;
    const responseCookie = 'bar.com';
    const expectRewritten = 'bar.com';
    await check(requestTo, responseCookie, expectRewritten);
  });

  it('example.com should not be able to set cookie for bar.com', async () => {
    const requestTo = `http://example.com`;
    const responseCookie = 'notexample.com';
    const expectRewritten = 'notexample.com';
    await check(requestTo, responseCookie, expectRewritten);
  });

  it('example.com should not be able to set cookie for bar.com', async () => {
    const requestTo = `http://notexample.com`;
    const responseCookie = 'example.com';
    const expectRewritten = 'example.com';
    await check(requestTo, responseCookie, expectRewritten);
  });
});

describe('no explicit domain', () => {
  it('subdomain.example.com should not be able to set cookie for .example.com', async () => {
    const requestTo = `http://subdomain.example.com`;
    const responseCookie = '';
    const expectRewritten = '';
    await check(requestTo, responseCookie, expectRewritten);
  });

  it('subdomain.example.com should not be able to set cookie for example.com', async () => {
    const requestTo = `http://subdomain.example.com`;
    const responseCookie = '';
    const expectRewritten = '';
    await check(requestTo, responseCookie, expectRewritten);
  });

  it('example.com should not be able to set cookie for .example.com', async () => {
    const requestTo = `http://example.com`;
    const responseCookie = '';
    const expectRewritten = '';
    await check(requestTo, responseCookie, expectRewritten);
  });

  it('example.com should be able to set cookie for example.com', async () => {
    const requestTo = `http://example.com`;
    const responseCookie = '';
    const expectRewritten = '';
    await check(requestTo, responseCookie, expectRewritten);
  });
});
