import getPort from 'get-port';
import { createTestProxy } from 'test/create-test-proxy';
import { InputHttpExtension } from 'src/extensions/input-http/input-http.extension';
import { RewriteRebaseExtension } from 'src/extensions/rewrite-rebase/rewrite-rebase.extension';
import axios, { AxiosResponse } from 'axios';
import { OnPostServiceCall, OnServiceCall } from 'src/context.types';
import { HeadersMap } from 'src/headers.helpers';

describe('RewriteRebaseExtension', () => {
  const configs: { rules: Partial<Rule>; shouldRewriteCSS: boolean }[] = [
    {
      shouldRewriteCSS: false,
      rules: {
        response: {
          rewrite: {
            rebase: {
              match: {
                contentTypes: 'text/html',
              },
            },
          },
        },
      },
    },
    {
      shouldRewriteCSS: true,
      rules: {
        response: { rewrite: { rebase: true } },
      },
    },
    {
      shouldRewriteCSS: false,
      rules: {
        response: {
          rewrite: {
            rebase: {
              match: {
                contentTypes: ['text/html', 'application/json'],
              },
            },
          },
        },
      },
    },
    {
      shouldRewriteCSS: true,
      rules: {
        response: {
          rewrite: {
            rebase: {
              match: {
                contentTypes: 'text/*',
              },
            },
          },
        },
      },
    },
    {
      shouldRewriteCSS: true,
      rules: {
        response: {
          rewrite: {
            rebase: {
              match: {
                contentTypes: 'text/*',
              },
            },
          },
        },
      },
    },
    {
      shouldRewriteCSS: true,
      rules: {
        rewriteBody: 'text/*',
      },
    },
  ];

  for (const i in configs) {
    const config = configs[i];
    it(`should replace all links to matched service with links to proxy, variant ${
      parseInt(i) + 1
    }`, async () => {
      const port = await getPort();
      const { proxy, onServiceCallMock } = await createTestProxy({
        rules: [
          {
            target: `http://mocked.com`,
            match: {
              path: '/proxy',
            },
            ...config.rules,
          },
        ],
        http: { port: port, host: 'localhost' },
      });
      proxy.use(InputHttpExtension);
      proxy.use(RewriteRebaseExtension);
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
<head lang="en">
    <meta charset="UTF-8">
    <title>Some title</title>
    </head>
            <body>
            <a href="http://mocked.com/some/path">Some link</a>
            <a href="http://mocked.com/some/other/path">Some other link</a>
            </body>
        </html>`,
            ),
          };
        },
      );

      let response: AxiosResponse;

      response = await axios.get(`http://localhost:${port}/proxy`);
      expect(response.data).toBe(
        `<html lang="en">
<head lang="en"><base href="/proxy/">
    <meta charset="UTF-8">
    <title>Some title</title>
    </head>
            <body>
            <a href="http://localhost:${port}/proxy/some/path">Some link</a>
            <a href="http://localhost:${port}/proxy/some/other/path">Some other link</a>
            </body>
        </html>`,
      );

      const cssData = `@import url("/some/path");
@import "/some/path";
@import '/some/path';
body {
    background: url("/some/path") url(/some/path) url('/some/path');
}`;

      onServiceCallMock.mockImplementationOnce(
        (context: OnServiceCall): OnPostServiceCall => {
          return {
            ...context,
            serviceResponseHasBody: true,
            serviceResponseStatusCode: 200,
            serviceResponseHeaders: HeadersMap.from({
              'content-type': 'text/css',
            }),
            serviceResponseBody: Buffer.from(cssData),
          };
        },
      );

      response = await axios.get(`http://localhost:${port}/proxy`);

      if (config.shouldRewriteCSS) {
        const rewrittenCSS = `@import url("/proxy/some/path");
@import "/proxy/some/path";
@import '/proxy/some/path';
body {
    background: url("/proxy/some/path") url(/proxy/some/path) url('/proxy/some/path');
}`;
        expect(response.data).toBe(rewrittenCSS);
      } else {
        expect(response.data).toBe(cssData);
      }
    });
  }

  it('should replace all links to matched service with links to proxy in application/json response', async () => {
    const port = await getPort();
    const { proxy, onServiceCallMock } = await createTestProxy({
      rules: [
        {
          target: `http://mocked.com`,
          match: {
            path: '/proxy',
          },
          response: {
            rewrite: { rebase: true },
          },
        },
      ],
      http: { port: port, host: 'localhost' },
    });
    proxy.use(InputHttpExtension);
    proxy.use(RewriteRebaseExtension);
    await proxy.start();

    onServiceCallMock.mockImplementationOnce(
      (context: OnServiceCall): OnPostServiceCall => {
        return {
          ...context,
          serviceResponseHasBody: true,
          serviceResponseStatusCode: 200,
          serviceResponseHeaders: HeadersMap.from({
            'content-type': 'application/json',
          }),
          serviceResponseBody: Buffer.from(
            JSON.stringify({
              status: 'ok',
              url: 'http://mocked.com/some/path',
            }),
          ),
        };
      },
    );

    const response = await axios.get(`http://localhost:${port}/proxy`);
    expect(response.data).toStrictEqual({
      status: 'ok',
      url: `http://localhost:${port}/proxy/some/path`,
    });
  });

  it('should replace all links to matched service with links to proxy in application/xml response', async () => {
    const port = await getPort();
    const { proxy, onServiceCallMock } = await createTestProxy({
      rules: [
        {
          target: `http://mocked.com`,
          match: {
            path: '/proxy',
          },
          response: {
            rewrite: { rebase: true },
          },
        },
      ],
      http: { port: port, host: 'localhost' },
    });
    proxy.use(InputHttpExtension);
    proxy.use(RewriteRebaseExtension);
    await proxy.start();

    onServiceCallMock.mockImplementationOnce(
      (context: OnServiceCall): OnPostServiceCall => {
        return {
          ...context,
          serviceResponseHasBody: true,
          serviceResponseStatusCode: 200,
          serviceResponseHeaders: HeadersMap.from({
            'content-type': 'application/json',
          }),
          serviceResponseBody: Buffer.from(
            `<note>
<to>Tove</to>
<from>Jani</from>
<heading>Reminder</heading>
<url>http://mocked.com/some/path</url>
</note>`,
          ),
        };
      },
    );

    const response = await axios.get(`http://localhost:${port}/proxy`);
    expect(response.data).toBe(`<note>
<to>Tove</to>
<from>Jani</from>
<heading>Reminder</heading>
<url>http://localhost:${port}/proxy/some/path</url>
</note>`);
  });
});
