import { createTestProxy } from 'test/create-test-proxy';
import getPort from 'get-port';
import SocketIOClient, {
  Socket as SocketIOClientSocket,
} from 'socket.io-client';
import SocketIOServer, { Server } from 'socket.io';
import * as http from 'http';
import { InputWsExtension } from 'src/extensions/input-ws/input-ws.extension';

async function pingPong<ListenEvents>(client: SocketIOClientSocket) {
  await new Promise((resolve, reject) => {
    client.connect();
    client.on('connect', () => resolve(true));
    client.on('error', reject);
  });

  expect(client.connected).toBe(true);

  const response = new Promise((resolve, reject) => {
    client.emit('ping', 'hello', resolve);
    client.on('error', reject);
  });

  expect(await response).toBe('pong');
}

let socketIoServerInstance: Server;

async function setupSocketIoServer() {
  const socketIoServerPort = await getPort();
  const httpserver = http.createServer();
  httpserver.listen(socketIoServerPort);
  socketIoServerInstance = new SocketIOServer.Server(httpserver);
  socketIoServerInstance.on('connection', (socket) => {
    socket.on('ping', (data, respond) => {
      respond('pong');
    });
  });

  return socketIoServerPort;
}

afterEach(() => {
  socketIoServerInstance?.close();
});

it('test setup should work', async () => {
  const socketIoServerPort = await setupSocketIoServer();

  // Test if the server is working
  const directClient = SocketIOClient(
    'http://localhost:' + socketIoServerPort,
    {
      transports: ['websocket'],
    },
  );
  await pingPong(directClient);
});
it('should be able to proxy and upgrade connection', async () => {
  const socketIoServerPort = await setupSocketIoServer();

  // Test if the server is working
  const directClient = SocketIOClient(
    'http://localhost:' + socketIoServerPort,
    {
      transports: ['websocket'],
    },
  );
  await pingPong(directClient);

  // Test if the proxy is working
  const port = await getPort();
  const { proxy } = await createTestProxy({
    http: { port: port, host: 'localhost' },
    rules: [
      {
        target: 'http://localhost:' + socketIoServerPort + '/socket.io/',
        match: {
          path: '/sockets',
        },
      },
    ],
  });

  proxy.use(InputWsExtension);

  await proxy.start();

  const proxyClient = SocketIOClient('http://localhost:' + port, {
    path: '/sockets',
    transports: ['websocket'],
  });
  await pingPong(proxyClient);
});

it('should not start the proxy if httpPort is not set', async () => {
  const socketIoServerPort = await setupSocketIoServer();

  const { proxy } = await createTestProxy({
    rules: [
      {
        target: 'http://localhost:' + socketIoServerPort + '/socket.io/',
        match: {
          path: '/sockets',
        },
      },
    ],
  });

  proxy.use(InputWsExtension);

  await proxy.start();

  expect((proxy.get(InputWsExtension) as any).httpServer).toBeUndefined();
});

it('should close the socket if route is not found', async () => {
  const socketIoServerPort = await setupSocketIoServer();

  const port = await getPort();
  const { proxy } = await createTestProxy({
    http: { port: port, host: 'localhost' },
    rules: [
      {
        target: 'http://localhost:' + socketIoServerPort + '/socket.io/',
        match: {
          path: '/sockets',
        },
      },
    ],
  });

  proxy.use(InputWsExtension);

  await proxy.start();

  const proxyClient = SocketIOClient('http://localhost:' + port, {
    path: '/notfound',
    transports: ['websocket'],
    reconnection: false,
    reconnectionAttempts: 0,
    autoConnect: false,
  });

  proxyClient.connect();

  await new Promise((resolve, reject) => {
    proxyClient.on('connect', () => reject('Should not connect'));
    proxyClient.on('connect_error', resolve);
  });

  expect(proxyClient.connected).toBe(false);
});
