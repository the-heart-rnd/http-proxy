import getPort from 'get-port';
import { createServer, IncomingMessage, Server, ServerResponse } from 'http';

let server: Server | undefined;

export async function createTestHttpServer(
  handler = (req: IncomingMessage, res: ServerResponse) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('hello');
  },
) {
  const port = await getPort();
  server = createServer();
  server.listen(port);
  server.on('clientError', (err, socket) => {
    socket.end('HTTP/1.1 400 Bad Request\rConnection: close\r\r');
  });
  server.on('request', handler);
  return { server, port };
}

afterEach(() => {
  server?.close();
});
