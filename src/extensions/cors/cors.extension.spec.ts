import axios from 'axios';
import { createTestProxy } from 'test/create-test-proxy';
import { InputHttpExtension } from 'src/extensions/input-http/input-http.extension';
import getPort from 'get-port';
import { CorsExtension } from 'src/extensions/cors/cors.extension';
import { createTestHttpServer } from 'test/create-test-http-server';
import { splitHeaderValueList } from 'src/extensions/cors/helpers';
import { OnPostServiceCall, OnServiceCall } from 'src/context.types';
import { HeadersMap } from 'src/headers.helpers';

it('should handle cors in "proxy" mode', async () => {
  const { port: fakeAppPort } = await createTestHttpServer();

  const port = await getPort();
  const { proxy } = await createTestProxy({
    rules: [
      {
        target: `http://localhost:${fakeAppPort}`,
        response: {
          cors: 'proxy',
        },
        match: {
          path: '/proxy',
        },
      },
    ],
    http: { port: port, host: 'localhost' },
  });
  proxy.use(InputHttpExtension);
  proxy.use(CorsExtension);
  await proxy.start();

  const response = await axios.get(`http://localhost:${port}/proxy`);
  expect(response.headers['access-control-allow-origin']).toBe(
    `http://localhost:${port}`,
  );
  expect(response.headers['access-control-allow-headers']).toBe(
    'X-Requested-With, Content-Type, Accept, Origin, Authorization, Cache-Control, Pragma, Expires',
  );
  expect(response.headers['access-control-allow-methods']).toBe(
    'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  );
});

it('should handle cors in "referer" mode', async () => {
  const { port: fakeAppPort } = await createTestHttpServer();

  const port = await getPort();
  const { proxy } = await createTestProxy({
    rules: [
      {
        target: `http://localhost:${fakeAppPort}`,
        response: {
          cors: 'referer',
        },
        match: {
          path: '/proxy',
        },
      },
    ],
    http: { port: port, host: 'localhost' },
  });
  proxy.use(InputHttpExtension);
  proxy.use(CorsExtension);
  await proxy.start();

  const response = await axios.get(`http://localhost:${port}/proxy`, {
    headers: {
      referer: `http://some-other-domain.com`,
    },
  });
  expect(response.headers['access-control-allow-origin']).toBe(
    `http://some-other-domain.com`,
  );
  expect(response.headers['access-control-allow-headers']).toBe(
    'X-Requested-With, Content-Type, Accept, Origin, Authorization, Cache-Control, Pragma, Expires',
  );
  expect(response.headers['access-control-allow-methods']).toBe(
    'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  );
});

it('should handle cors in "referer" mode and fallback to "proxy" if there is no referer header', async () => {
  const { port: fakeAppPort } = await createTestHttpServer();

  const port = await getPort();
  const { proxy } = await createTestProxy({
    rules: [
      {
        target: `http://localhost:${fakeAppPort}`,
        response: {
          cors: 'referer',
        },
        match: {
          path: '/proxy',
        },
      },
    ],
    http: { port: port, host: 'localhost' },
  });
  proxy.use(InputHttpExtension);
  proxy.use(CorsExtension);
  await proxy.start();

  const response = await axios.get(`http://localhost:${port}/proxy`);
  expect(response.headers['access-control-allow-origin']).toBe(
    `http://localhost:${port}`,
  );
  expect(response.headers['access-control-allow-headers']).toBe(
    'X-Requested-With, Content-Type, Accept, Origin, Authorization, Cache-Control, Pragma, Expires',
  );
  expect(response.headers['access-control-allow-methods']).toBe(
    'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  );
});

it('should not handle cors if cors is disabled', async () => {
  const { port: fakeAppPort } = await createTestHttpServer();

  const port = await getPort();
  const { proxy } = await createTestProxy({
    rules: [
      {
        target: `http://localhost:${fakeAppPort}`,
        response: {
          cors: false,
        },
        match: {
          path: '/proxy',
        },
      },
    ],
    http: { port: port, host: 'localhost' },
  });
  proxy.use(InputHttpExtension);
  proxy.use(CorsExtension);
  await proxy.start();

  const response = await axios.get(`http://localhost:${port}/proxy`);
  expect(response.headers['access-control-allow-origin']).toBeUndefined();
  expect(response.headers['access-control-allow-headers']).toBeUndefined();
  expect(response.headers['access-control-allow-methods']).toBeUndefined();
});

it('should extend cors headers send by upstream service', async () => {
  const port = await getPort();
  const { proxy, onServiceCallMock } = await createTestProxy({
    rules: [
      {
        target: `http://example.com`,
        response: {
          cors: 'proxy',
        },
        match: {
          path: '/proxy',
        },
      },
    ],
    http: { port: port, host: 'localhost' },
  });
  proxy.use(InputHttpExtension);
  proxy.use(CorsExtension);
  await proxy.start();

  onServiceCallMock.mockImplementationOnce(
    (context: OnServiceCall): OnPostServiceCall => ({
      ...context,
      serviceResponseHasBody: false,
      serviceResponseHeaders: HeadersMap.from({
        'access-control-allow-origin': 'http://some-other-domain.com',
        'access-control-allow-headers': 'X-Test-Header',
      }),
      serviceResponseStatusCode: 200,
    }),
  );

  const response = await axios.get(`http://localhost:${port}/proxy`);
  expect(response.headers['access-control-allow-origin']).toBe(
    `http://localhost:${port}`,
  );
  expect(
    splitHeaderValueList(response.headers['access-control-allow-headers']),
  ).toIncludeAllMembers(
    splitHeaderValueList(
      'X-Requested-With, Content-Type, Accept, Origin, Authorization, Cache-Control, Pragma, Expires, X-Test-Header',
    ),
  );
  expect(response.headers['access-control-allow-methods']).toBe(
    'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  );
});

it('should set allow origin to "*" if cors is enabled and mode is "*"', async () => {
  const port = await getPort();
  const { proxy } = await createTestProxy({
    rules: [
      {
        target: `http://example.com`,
        response: {
          cors: '*',
        },
        match: {
          path: '/proxy',
        },
      },
    ],
    http: { port: port, host: 'localhost' },
  });
  proxy.use(InputHttpExtension);
  proxy.use(CorsExtension);
  await proxy.start();

  const response = await axios.get(`http://localhost:${port}/proxy`);
  expect(response.headers['access-control-allow-origin']).toBe('*');
  expect(response.headers['access-control-allow-headers']).toBe(
    'X-Requested-With, Content-Type, Accept, Origin, Authorization, Cache-Control, Pragma, Expires',
  );
  expect(response.headers['access-control-allow-methods']).toBe(
    'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  );
});

it("should handle preflight requests, even if upstream server doesn't support them", async () => {
  const port = await getPort();
  const { proxy, onServiceCallMock } = await createTestProxy({
    rules: [
      {
        target: `http://example.com`,
        response: {
          cors: {
            mode: 'proxy',
            preflight: 'auto',
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
  proxy.use(CorsExtension);
  await proxy.start();

  onServiceCallMock.mockImplementationOnce(
    (context: OnServiceCall): OnPostServiceCall => ({
      ...context,
      serviceResponseHasBody: false,
      serviceResponseHeaders: HeadersMap.from(),
      serviceResponseStatusCode: 500,
    }),
  );

  const response = await axios.options(`http://localhost:${port}/proxy`, {
    headers: {
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'X-Test-Header',
    },
  });
  expect(response.headers['access-control-allow-origin']).toBe(
    `http://localhost:${port}`,
  );
  expect(
    splitHeaderValueList(response.headers['access-control-allow-headers']),
  ).toIncludeAllMembers(
    splitHeaderValueList(
      'X-Requested-With, Content-Type, Accept, Origin, Authorization, Cache-Control, Pragma, Expires, X-Test-Header',
    ),
  );
  expect(response.headers['access-control-allow-methods']).toBe(
    'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  );
});

it('if preflight is "true", should handle preflight requests without passing them to upstream server', async () => {
  const port = await getPort();
  const { proxy, onServiceCallMock } = await createTestProxy({
    rules: [
      {
        target: `http://anything.com`,
        response: {
          cors: {
            mode: 'proxy',
            preflight: true,
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
  proxy.use(CorsExtension);
  await proxy.start();

  const response = await axios.options(`http://localhost:${port}/proxy`, {
    headers: {
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'X-Test-Header',
    },
  });
  expect(response.headers['access-control-allow-origin']).toBe(
    `http://localhost:${port}`,
  );
  expect(
    splitHeaderValueList(response.headers['access-control-allow-headers']),
  ).toIncludeAllMembers(
    splitHeaderValueList(
      'X-Requested-With, Content-Type, Accept, Origin, Authorization, Cache-Control, Pragma, Expires, X-Test-Header',
    ),
  );
  expect(response.headers['access-control-allow-methods']).toBe(
    'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  );
  expect(onServiceCallMock).not.toHaveBeenCalled();
});
