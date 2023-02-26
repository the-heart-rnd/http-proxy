import getPort from 'get-port';
import { createTestProxy } from 'test/create-test-proxy';
import { InputHttpExtension } from 'src/extensions/input-http/input-http.extension';
import { RewriteRedirectExtension } from 'src/extensions/rewrite-redirect/rewrite-redirect.extension';
import { OnPostServiceCall, OnServiceCall } from 'src/context.types';
import { HeadersMap } from 'src/headers.helpers';
import axios from 'axios';

it('should rewrite location headers from service response', async () => {
  const port = await getPort();
  const { proxy, onServiceCallMock } = await createTestProxy({
    rules: [
      {
        match: {
          path: '/proxy',
        },
        target: `http://example.com/whatever`,
        response: {
          rewrite: {
            redirects: true,
          },
        },
      },
      {
        match: {
          path: '/root',
        },
        target: `http://example.com/`,
        response: {
          rewrite: {
            redirects: true,
          },
        },
      },
    ],
    http: { port: port, host: 'localhost' },
  });
  proxy.use(InputHttpExtension);
  proxy.use(RewriteRedirectExtension);
  await proxy.start();

  onServiceCallMock.mockImplementationOnce(
    (context: OnServiceCall): OnPostServiceCall => {
      return {
        ...context,
        serviceResponseHasBody: false,
        serviceResponseHeaders: HeadersMap.from({
          location: 'http://example.com/redirect',
        }),
        serviceResponseStatusCode: 200,
      };
    },
  );

  const response = await axios.get(`http://localhost:${port}/proxy`, {
    maxRedirects: 0,
  });
  const header = response.headers['location'];
  expect(header).toBe(`http://localhost:${port}/root/redirect`);

  onServiceCallMock.mockClear();

  await axios.get(header!, {
    maxRedirects: 0,
  });
  expect(onServiceCallMock).toHaveBeenCalledTimes(1);
  expect(onServiceCallMock.mock.calls[0][0].serviceRequestUrl).toBe(
    'http://example.com/redirect',
  );
});

it('should rewrite location headers from service response when redirect is an absolute path', async () => {
  const port = await getPort();
  const { proxy, onServiceCallMock } = await createTestProxy({
    rules: [
      {
        match: {
          path: '/proxy',
        },
        target: `http://example.com/whatever`,
        response: {
          rewrite: {
            redirects: true,
          },
        },
      },
      {
        match: {
          path: '/root',
        },
        target: `http://example.com/`,
        response: {
          rewrite: {
            redirects: true,
          },
        },
      },
    ],
    http: { port: port, host: 'localhost' },
  });
  proxy.use(InputHttpExtension);
  proxy.use(RewriteRedirectExtension);
  await proxy.start();

  onServiceCallMock.mockImplementationOnce(
    (context: OnServiceCall): OnPostServiceCall => {
      return {
        ...context,
        serviceResponseHasBody: false,
        serviceResponseHeaders: HeadersMap.from({
          location: '/redirect',
        }),
        serviceResponseStatusCode: 200,
      };
    },
  );

  const response = await axios.get(`http://localhost:${port}/proxy`, {
    maxRedirects: 0,
  });
  const header = response.headers['location'];
  expect(header).toBe(`http://localhost:${port}/root/redirect`);

  onServiceCallMock.mockClear();

  await axios.get(header!, {
    maxRedirects: 0,
  });
  expect(onServiceCallMock).toHaveBeenCalledTimes(1);
  expect(onServiceCallMock.mock.calls[0][0].serviceRequestUrl).toBe(
    'http://example.com/redirect',
  );
});

it("should keep location headers in they doesn't match any rules", async () => {
  const port = await getPort();
  const { proxy, onServiceCallMock } = await createTestProxy({
    rules: [
      {
        match: {
          path: '/proxy',
        },
        target: `http://example.com/whatever`,
        response: {
          rewrite: {
            redirects: true,
          },
        },
      },
      {
        match: {
          path: '/root',
        },
        target: `http://example.com/`,
        response: {
          rewrite: {
            redirects: true,
          },
        },
      },
    ],
    http: { port: port, host: 'localhost' },
  });
  proxy.use(InputHttpExtension);
  proxy.use(RewriteRedirectExtension);
  await proxy.start();

  onServiceCallMock.mockImplementationOnce(
    (context: OnServiceCall): OnPostServiceCall => {
      return {
        ...context,
        serviceResponseHasBody: false,
        serviceResponseHeaders: HeadersMap.from({
          location: 'http://another.com/redirect',
        }),
        serviceResponseStatusCode: 200,
      };
    },
  );

  const response = await axios.get(`http://localhost:${port}/proxy`, {
    maxRedirects: 0,
  });
  const header = response.headers['location'];
  expect(header).toBe(`http://another.com/redirect`);
});
