import getPort from 'get-port';
import { createTestProxy } from 'test/create-test-proxy';
import { InputHttpExtension } from 'src/extensions/input-http/input-http.extension';
import { RewriteLinksInResponseExtension } from 'src/extensions/rewrite-links-in-response/rewrite-links-in-response.extension';
import axios from 'axios';
import { OnPostServiceCall, OnServiceCall } from 'src/context.types';
import { HeadersMap } from 'src/headers.helpers';

describe('RewriteLinksInResponseExtension', () => {
  const configs: Partial<Rule>[] = [
    {
      response: {
        rewrite: {
          linksInResponse: {
            match: {
              contentTypes: 'text/html',
            },
          },
        },
      },
    },
    {
      response: { rewrite: { linksInResponse: true } },
    },
    {
      response: {
        rewrite: {
          linksInResponse: {
            match: {
              contentTypes: ['text/html', 'application/json'],
            },
          },
        },
      },
    },
    {
      response: {
        rewrite: {
          linksInResponse: {
            match: {
              contentTypes: 'text/*',
            },
          },
        },
      },
    },
    {
      response: {
        rewrite: {
          linksInResponse: {
            match: {
              contentTypes: 'text/*',
            },
          },
        },
      },
    },
    {
      rewriteBody: 'text/*',
    },
  ];

  for (const i in configs) {
    const config = configs[i];
    it(`should replace all links to matched service with links to proxy, variant ${
      i + 1
    }`, async () => {
      const port = await getPort();
      const { proxy, onServiceCallMock } = await createTestProxy({
        rules: [
          {
            target: `http://mocked.com`,
            match: {
              path: '/proxy',
            },
            ...config,
          },
        ],
        http: { port: port, host: 'localhost' },
      });
      proxy.use(InputHttpExtension);
      proxy.use(RewriteLinksInResponseExtension);
      await proxy.start();

      onServiceCallMock.mockImplementationOnce(
        (context: OnServiceCall): OnPostServiceCall => {
          return {
            ...context,
            serviceResponseHasBody: true,
            serviceResponseStatusCode: 200,
            serviceResponseHeaders: HeadersMap.from({
              'content-type': 'text/html',
            }),
            serviceResponseBody: Buffer.from(
              `<html lang="en">
            <body>
            <a href="http://mocked.com/some/path">Some link</a>
            <a href="http://mocked.com/some/other/path">Some other link</a>
            </body>
        </html>`,
            ),
          };
        },
      );

      const response = await axios.get(`http://localhost:${port}/proxy`);
      expect(response.data).toContain(
        `<a href="http://localhost:${port}/proxy/some/path">Some link</a>`,
      );
      expect(response.data).toContain(
        `<a href="http://localhost:${port}/proxy/some/other/path">Some other link</a>`,
      );
    });
  }
});
