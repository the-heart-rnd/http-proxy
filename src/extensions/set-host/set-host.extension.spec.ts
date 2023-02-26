import axios from 'axios';
import { createTestProxy } from 'test/create-test-proxy';
import { SetHostExtension } from 'src/extensions/set-host/set-host.extension';
import { InputHttpExtension } from 'src/extensions/input-http/input-http.extension';
import getPort from 'get-port';

it('should set correct host header', async () => {
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
  proxy.use(SetHostExtension);

  await proxy.start();

  const response = await axios.get(`http://localhost:${port}/testdeep/deeper`);

  expect(onServiceCallMock).toBeCalledTimes(1);
  expect(response.status).toBe(200);
  expect(
    onServiceCallMock.mock.calls[0][0].serviceRequestOptions.headers!.get(
      'host',
    ),
  ).toBe('example.com');
});
