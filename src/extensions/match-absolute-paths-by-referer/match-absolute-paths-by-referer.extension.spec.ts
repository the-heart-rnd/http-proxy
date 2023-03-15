import axios from 'axios';
import { createTestProxy } from 'test/create-test-proxy';
import getPort from 'get-port';
import { MatchAbsolutePathsByRefererExtension } from 'src/extensions/match-absolute-paths-by-referer/match-absolute-paths-by-referer.extension';
import { InputHttpExtension } from 'src/extensions/input-http/input-http.extension';

it('should be able to match services by relative paths when referer is a matching rule', async () => {
  const port = await getPort();
  const { proxy, onServiceCallMock } = await createTestProxy({
    rules: [
      {
        target: `http://example.com/test`,
        match: {
          path: '/proxy',
        },
      },
    ],
    http: { port: port, host: 'localhost' },
  });
  proxy.use(InputHttpExtension);
  proxy.use(MatchAbsolutePathsByRefererExtension);
  await proxy.start();

  const response = await axios.get(`http://localhost:${port}/whatever`, {
    headers: {
      referer: `http://localhost:${port}/proxy/page`,
    },
  });
  expect(response.status).toBe(200);
  expect(onServiceCallMock).toHaveBeenCalledTimes(1);
  expect(onServiceCallMock.mock.calls[0][0].serviceRequestUrl).toBe(
    'http://example.com/whatever',
  );
});

it('if another rule matches the absolute path, referer should be omitted', async () => {
  const port = await getPort();
  const { proxy, onServiceCallMock } = await createTestProxy({
    rules: [
      {
        target: `http://example.com/test`,
        match: {
          path: '/proxy',
        },
      },
      {
        target: `http://fisher.com/other`,
        match: {
          path: '/other',
        },
      },
    ],
    http: { port: port, host: 'localhost' },
  });
  proxy.use(InputHttpExtension);
  proxy.use(MatchAbsolutePathsByRefererExtension);
  await proxy.start();

  const response = await axios.get(`http://localhost:${port}/other`, {
    headers: {
      referer: `http://localhost:${port}/proxy/page`,
    },
  });
  expect(response.status).toBe(200);
  expect(onServiceCallMock).toHaveBeenCalledTimes(1);
  expect(onServiceCallMock.mock.calls[0][0].serviceRequestUrl).toBe(
    'http://fisher.com/other',
  );
});

it('if another rule matches the absolute path and referer is not set, should use another rule', async () => {
  const port = await getPort();
  const { proxy, onServiceCallMock } = await createTestProxy({
    rules: [
      {
        target: `http://example.com/test`,
        match: {
          path: '/proxy',
        },
      },
      {
        target: `http://fisher.com/hello`,
        match: {
          path: '/other',
        },
      },
    ],
    http: { port: port, host: 'localhost' },
  });
  proxy.use(InputHttpExtension);
  proxy.use(MatchAbsolutePathsByRefererExtension);
  await proxy.start();

  const response = await axios.get(`http://localhost:${port}/other`);
  expect(response.status).toBe(200);
  expect(onServiceCallMock).toHaveBeenCalledTimes(1);
  expect(onServiceCallMock.mock.calls[0][0].serviceRequestUrl).toBe(
    'http://fisher.com/hello',
  );
});

it('should not match by referer if disabled', async () => {
  const port = await getPort();
  const { proxy, onServiceCallMock } = await createTestProxy({
    matchAbsolutePathsByReferer: false,
    rules: [
      {
        target: `http://example.com/test`,
        match: {
          path: '/proxy',
        },
      },
      {
        target: `http://fisher.com/hello`,
        match: {
          path: '/other',
        },
      },
    ],
    http: { port: port, host: 'localhost' },
  });
  proxy.use(InputHttpExtension);
  proxy.use(MatchAbsolutePathsByRefererExtension);
  await proxy.start();

  const response = await axios.get(`http://localhost:${port}/other`, {
    headers: {
      referer: `http://localhost:${port}/proxy/page`,
    },
  });
  expect(response.status).toBe(200);
  expect(onServiceCallMock).toHaveBeenCalledTimes(1);
  expect(onServiceCallMock.mock.calls[0][0].serviceRequestUrl).toBe(
    'http://fisher.com/hello',
  );
});
