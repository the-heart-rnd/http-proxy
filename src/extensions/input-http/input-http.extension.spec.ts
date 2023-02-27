import { connect, Socket } from 'net';
import axios from 'axios';
import { createTestProxy } from 'test/create-test-proxy';
import { InputHttpExtension } from 'src/extensions/input-http/input-http.extension';
import getPort from 'get-port';
import Undici from 'undici';
import fetch = Undici.fetch;

describe('socket', () => {
  let socket: Socket | undefined;

  afterEach(() => {
    socket?.destroy();
  });

  it('should setup TCP server', async () => {
    const port = await getPort();
    const { proxy } = await createTestProxy({
      rules: [],
      http: { port: port, host: 'localhost' },
    });
    proxy.use(InputHttpExtension);
    await proxy.start();

    socket = connect({
      host: 'localhost',
      port: port,
    });

    await expect(
      new Promise((resolve, reject) => {
        socket?.on('connect', () => resolve(true));
        socket?.on('error', reject);
      }),
    ).resolves.toBeTruthy();
  });
});

it('should return 404 when no config is matching the route', async () => {
  const port = await getPort();
  const { proxy } = await createTestProxy({
    rules: [],
    http: { port: port, host: 'localhost' },
  });
  proxy.use(InputHttpExtension);
  await proxy.start();

  return axios.get(`http://localhost:${port}/notfound`).catch((error) => {
    expect(error.response?.status).toBe(404);
  });
});

it('should handle requests with body', async () => {
  const port = await getPort();
  const { proxy, onServiceCallMock } = await createTestProxy({
    rules: [
      {
        target: `http://example.com/test`,
        match: {
          path: '/test',
        },
      },
    ],
    http: { port: port, host: 'localhost' },
  });
  proxy.use(InputHttpExtension);
  await proxy.start();

  const body = Buffer.alloc(128 * 1024, 'a');
  const response = await fetch(`http://localhost:${port}/test`, {
    method: 'POST',
    body: body,
    headers: {
      'Content-Type': 'application/octet-stream',
    },
  });

  expect(response.status).toBe(200);

  expect(onServiceCallMock).toHaveBeenCalledTimes(1);
  const callToService = onServiceCallMock.mock.calls[0][0];
  expect(callToService.serviceRequestUrl).toBe('http://example.com/test');

  expect(callToService.serviceRequestBody).toBeInstanceOf(Buffer);
  expect((callToService.serviceRequestBody as Buffer).equals(body)).toBe(true);
});
