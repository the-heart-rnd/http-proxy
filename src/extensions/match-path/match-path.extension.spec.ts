import { Socket } from 'net';
import axios from 'axios';
import { OnServiceCall } from 'src/context.types';
import { createTestProxy } from 'test/create-test-proxy';
import { InputHttpExtension } from 'src/extensions/input-http/input-http.extension';
import { MatchPathExtension } from 'src/extensions/match-path/match-path.extension';
import getPort from 'get-port';

let socket: Socket | undefined;

afterEach(() => {
  socket?.destroy();
});

it('should call service of matching route', async () => {
  const rules: Rule[] = [
    {
      target: 'http://example.com',
      match: {
        path: '/test',
      },
    },
  ];

  const port = await getPort();
  const { proxy, onServiceCallMock } = await createTestProxy({
    rules,
    http: { port: port, host: 'localhost' },
  });
  proxy.use(InputHttpExtension);
  proxy.use(MatchPathExtension);
  await proxy.start();

  const response = await axios.get(`http://localhost:${port}/test`);

  expect(onServiceCallMock).toBeCalledTimes(1);
  expect(response.status).toBe(200);
});

it('should pass subpath appended to target', async () => {
  const rules: Rule[] = [
    {
      target: 'http://example.com/somewhere',
      match: {
        path: '/testdeep',
      },
    },
  ];

  const port = await getPort();
  const { proxy, onServiceCallMock } = await createTestProxy({
    rules,
    http: { port: port, host: 'localhost' },
  });
  proxy.use(InputHttpExtension);
  proxy.use(MatchPathExtension);
  await proxy.start();

  const response = await axios.get(`http://localhost:${port}/testdeep/deeper`);

  expect(onServiceCallMock).toBeCalledTimes(1);
  expect(response.status).toBe(200);
  expect(onServiceCallMock).toHaveBeenCalledWith(
    expect.objectContaining({
      serviceRequestUrl: 'http://example.com/somewhere/deeper',
    } as OnServiceCall),
  );
});

it('should pass query to target', async () => {
  const rules: Rule[] = [
    {
      target: 'http://example.com',
      match: {
        path: '/test',
      },
    },
  ];

  const port = await getPort();
  const { proxy, onServiceCallMock } = await createTestProxy({
    rules,
    http: { port: port, host: 'localhost' },
  });
  proxy.use(InputHttpExtension);
  proxy.use(MatchPathExtension);
  await proxy.start();

  const response = await axios.get(`http://localhost:${port}/test?test=1`);

  expect(onServiceCallMock).toBeCalledTimes(1);
  expect(response.status).toBe(200);
  expect(onServiceCallMock).toHaveBeenCalledWith(
    expect.objectContaining({
      serviceRequestUrl: 'http://example.com/?test=1',
    } as OnServiceCall),
  );
});

it('should ignore rule if path is not specified', async () => {
  const rules: Rule[] = [
    {
      target: 'http://example.com',
    },
  ];

  const port = await getPort();
  const { proxy, onServiceCallMock } = await createTestProxy({
    rules,
    http: { port: port, host: 'localhost' },
  });
  proxy.use(InputHttpExtension);
  proxy.use(MatchPathExtension);
  await proxy.start();

  const response = await axios
    .get(`http://localhost:${port}/test`)
    .catch((e) => e.response);

  expect(onServiceCallMock).toBeCalledTimes(0);
  expect(response.status).toBe(404);
});

it('should handle legacy config', async () => {
  const rules: Rule[] = [
    {
      target: 'http://example.com',
      source: '/test',
    },
  ];

  const port = await getPort();
  const { proxy, onServiceCallMock } = await createTestProxy({
    rules,
    http: { port: port, host: 'localhost' },
  });
  proxy.use(InputHttpExtension);
  proxy.use(MatchPathExtension);
  await proxy.start();

  const response = await axios.get(`http://localhost:${port}/test?test=1`);

  expect(onServiceCallMock).toBeCalledTimes(1);
  expect(response.status).toBe(200);
  expect(onServiceCallMock).toHaveBeenCalledWith(
    expect.objectContaining({
      serviceRequestUrl: 'http://example.com/?test=1',
    } as OnServiceCall),
  );
});
