import { SocksClient } from 'socks';
import { createTestProxy } from 'test/create-test-proxy';
import { TransportSocksExtension } from 'src/extensions/transport-socks/transport-socks.extension';
import { SocksClientOptions } from 'socks/typings/common/constants';
import getPort from 'get-port';
import { createTestHttpServer } from 'test/create-test-http-server';

it('should proxy direct requests if no config is matching the route', async () => {
  const { port: httpPort } = await createTestHttpServer();

  const port = await getPort();
  const { proxy } = await createTestProxy({
    rules: [],
    socksPort: port,
  });
  proxy.use(TransportSocksExtension);
  await proxy.start();

  const options: SocksClientOptions = {
    proxy: {
      host: 'localhost',
      port: port,
      type: 5,
    },

    command: 'connect',

    destination: {
      host: 'localhost',
      port: httpPort,
    },
  };

  const connection = await SocksClient.createConnection(options);
  expect(connection.socket).toBeDefined();
  connection.socket.write(`GET / HTTP/1.1\r\n`);
  connection.socket.write(`Host: localhost\r\n`);
  connection.socket.write(`\r`);
  connection.socket.write(`\r`);

  const response = await new Promise((resolve) => {
    connection.socket.on('data', (data) => {
      resolve(data.toString());
    });
  });

  expect(response).toContain('HTTP/1.1 200 OK');
  expect(response).toContain('hello');
});
