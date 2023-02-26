# @thrnd/http-proxy

`@thrnd/http-proxy` will help you when you need to route external services under different paths under single domain.

Example use cases:
* rewrite cookies set by target service to proxy host (you can disable this feature by setting 'rewriteCookies' to `false` in rewrite record in config file)
* rewrite location headers set by target service to proxy host (you can disable this feature by setting 'rewriteRedirect' to `false` in rewrite record in config file)
* rewrite urls in html body (you can enable this feature by setting `rewriteBody` to `true` in rewrite record in config file)

## Usage

### npx
```bash
npx @thrnd/http-proxy -c path/to/your/rewrite.json
```

### docker-compose
Download the contents of the `docker` folder from this repository and run `docker-compose up` in the folder.

See the [docker/README.md](docker/README.md) for more information.

### Run from source code repository

```bash
npm start -c rewrites.json -p 8000
```

If you want to use the proxy with a different port, you can use the `-p` flag. \
If you want to use a different configuration file, you can use the `-c` flag.

### Changing the host for rewrites
If you want to change the host for cookie and redirect rewrites, you can use the `-h` flag.

```bash
npm start -h https://127.0.0.1.nip.io
```

#### Verbosity
To change the verbosity of the proxy, you can use the LOG_LEVEL environment variable.

```bash
env "LOG_LEVEL=debug" npm start
```

All available LOG_LEVELs are:

* `error`
* `warn`
* `info`
* `debug`

Default is `info`.

# Configuration file
The configuration file is a JSON file that contains an array of objects.\
Each object has a `source` and a `target` property. The `source` property is the path that you want to proxy.\
The `target` property is the URL that you want to proxy to.

```json
[
  {
    "match": {
        "path": "/api"
    },
    "target": "http://localhost:3000"
  }
]
```
## Rewrite options
### response.rewrite.cookies
**Use cases**: Authorization services, APIs.

If this property is set to `true`, cookies set by the target service will be rewritten to the proxy host.

### response.rewrite.redirects
**Use cases**: API services, redirects.

If this property is set to `true`, location headers set by the target service will be rewritten to the proxy host, if they are targeting the proxied service.

```json
[
  {
    "match": {
        "path": "/api"
    },
    "target": "http://localhost:3000",
    "response": {
        "rewrite": {
            "redirects": true
        }
    }
  }
]
```

### response.rewrite.linksInResponse
**Use cases**: SPAs, forms.

You can also set `response.rewrite.linksInResponse` to `true` to rewrite the body contents of the request. This is useful if you are having issues with asset urls, form action urls etc.
It will rewrite the body contents of the request to the target url.

```json
[
  {
    "match": {
        "path": "/api"
    },
    "target": "http://localhost:3000",
    "response": {
        "rewrite": {
            "linksInResponse": true
        }
    }
  }
]
```

By default, it will only modify contents of `text/html` content types. If you want to modify other content types, you can set the `rewriteBody` property to an array of content types.

```json
[
  {
    "match": {
        "path": "/api"
    },
    "target": "http://localhost:3000",
    "response": {
      "rewrite": {
        "linksInResponse": ["text/html", "application/json"]
      }
    }
  }
]
```

### matchAbsolutePathsByReferer (CLI)
**Use cases**: SPAs
**default**: `true`

NOTE: This option is set via **CLI flag** `--rebaseAbsolutePathsByReferer`, not in the config file.

This option will help if you are proxying a service that requests assets from itself using absolute paths and you cannot or doesn't want to change the base url.

When this option is enabled, if an app requests a resource via an absolute path to itself, the path will automatically be 
rebased and forwarded to the requesting service.

Example:
SPA proxied under `/admin-panel` requests `/assets/img/logo.png`
Browser send request:
```http
GET /assets/img/logo.png HTTP/1.1
Referer: http://localhost:3000/admin-panel/index.html
...
```

Proxy will check the referer header for matching service and rebase the path to `/admin-panel/assets/img/logo.png`

**warning**: In order for this to work properly, request must be made with proper *referer* header set to requesting service.

### response.cors
**Use cases**: API services

In all use cases:
* the proxy will set the `Access-Control-Allow-Methods` header to `GET, POST, PUT, PATCH, DELETE, OPTIONS`.
* the proxy will set the `Access-Control-Allow-Headers` header to `X-Requested-With, Content-Type, Accept, Origin, Authorization, Cache-Control, Pragma, Expires`.

Value of `Access-Control-Allow-Origin` and `Access-Control-Allow-Credentials` varies depending on the set value of `cors`:
#### true
If this property is set to `true`, the proxy will add `Access-Control-Allow-Origin: *` header to the response.

```json
[
  {
    "match": {
        "path": "/api"
    },
    "target": "http://localhost:3000",
    "response": {
      "cors": true
    }
  }
]
```

#### "proxy"
If this property is set to `proxy`, the proxy will add `Access-Control-Allow-Origin: http://{proxy host}:{proxy port}` header and `Access-Control-Allow-Credentials: true` header to the response.

```json
[
  {
    "match": {
        "path": "/api"
    },
    "target": "http://localhost:3000",
    "response": {
      "cors": "proxy"
    }
  }
]
```

#### "referer"
If this property is set to `referer`, the proxy will add `Access-Control-Allow-Origin: http://{referer origin}` header and `Access-Control-Allow-Credentials: true` header to the response.
**warning**: In order for this to work properly, request must be made with proper *referer* header set to requesting service.\
If referer header is not set, the proxy behaves as if the option is set to `proxy`.

```json
[
  {
    "match": {
        "path": "/api"
    },
    "target": "http://localhost:3000",
    "response": {
      "cors": "referer"
    }
  }
]
```

### preflight
**Use cases**: API services\
**Default**: `"auto"`

This option controls how the proxy handles preflight requests.

It works only if `cors` option is set.

If this property is set to `false`, the proxy will not handle preflight requests. They will be passed to the service.

```json
[
  {
    "match": {
        "path": "/api"
    },
    "target": "http://localhost:3000",
    "response": {
      "cors": {
        "mode": true,
        "preflight": false
      }
    }
  }
]
```

If this property is set to `true`, the proxy will handle preflight requests without passing them to the service.

```json
[
  {
    "match": {
        "path": "/api"
    },
    "target": "http://localhost:3000",
    "response": {
      "cors": {
        "mode": true,
        "preflight": true
      }
    }
  }
]
```

If this property is set to `"auto"`, the proxy will handle preflight requests if the service responded with non-200 status code.

```json
[
  {
    "match": {
        "path": "/api"
    },
    "target": "http://localhost:3000",
    "response": {
      "cors": {
        "mode": true,
        "preflight": "auto"
      }
    }
  }
]
```

### response.headers
NOTE: This operation modifies the response headers of the proxied service **before** any other operation that modifies the response headers (like `cors`).

#### drop
**Use cases**: API services, SPAs (IFrames, CSP)

If you want to drop any of response headers, you can set the header value to `drop` or an `action` to `drop`.

```json
[
  {
    "match": {
        "path": "/api"
    },
    "target": "http://localhost:3000",
    "response": {
      "headers": {
        "X-Frame-Options": "drop",
        "Content-Security-Policy": {
          "action": "drop"
        }
      } 
    }
  }
]
```

#### set
**Use cases**: API services, SPAs (IFrames, CSP)

If you want to set any of response headers, you can set the `action` to `set` and `value` to the value you want to set the header to.

```json
[
  {
    "match": {
        "path": "/api"
    },
    "target": "http://localhost:3000",
    "response": {
      "headers": {
        "Content-Security-Policy": {
          "action": "set",
          "value": "default-src 'self'"
        }
      }
    }
  }
]
```

#### setIfMissing
**Use cases**: API services, SPAs (IFrames, CSP)

If you want to set any of response headers only if it is not set, you can set the `action` to `setIfMissing` and `value` to the value you want to set the header to.

```json
[
  {
    "match": {
        "path": "/api"
    },
    "target": "http://localhost:3000",
    "response": {
      "headers": {
        "Content-Security-Policy": {
          "action": "setIfMissing",
          "value": "default-src 'self'"
        }
      }
    }
  }
]
```

