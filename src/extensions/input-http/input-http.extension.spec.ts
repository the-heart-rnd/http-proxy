import { connect, Socket } from 'net';
import axios from 'axios';
import { createTestProxy } from 'test/create-test-proxy';
import { InputHttpExtension } from 'src/extensions/input-http/input-http.extension';
import getPort from 'get-port';

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
