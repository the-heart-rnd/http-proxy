import { Socket } from 'net';
import { Readable } from 'stream';
import { FormData } from 'undici/types/formdata';
import { HeadersMap } from 'src/headers.helpers';
import pino from 'pino';

export type RequestHeaders = HeadersMap;
export type ResponseHeaders = HeadersMap;

export type OnConnection = {
  connection: Socket;
  logger: pino.Logger;
};

export type OnRequestHeaders = OnConnection & {
  headers: RequestHeaders;
};
export type OnPreConfigMatch = OnRequestHeaders & {
  config: AppConfiguration;
  request: RequestMetadata;
};

export type OnConfigMatchFound = OnPreConfigMatch & {
  match: Rule;
};

export type OnConfigMatchNotFound = OnPreConfigMatch;

export type OnModifyRequestHeaders = OnConfigMatchFound & {
  headers: RequestHeaders;
};

export type OnRequestBodyChunk = OnConfigMatchFound & {
  chunk: Buffer;
};

export type OnPrepareRequestBody = OnConfigMatchFound & {
  chunks: Buffer[];
};

export type OnModifyRequestBody = Omit<OnPrepareRequestBody, 'chunks'> &
  (
    | {
        hasBody: true;
        body: Buffer;
      }
    | {
        hasBody: false;
      }
  );

export type OnPreServiceCall = OnModifyRequestBody;

export type HttpMethod =
  | 'GET'
  | 'HEAD'
  | 'POST'
  | 'PUT'
  | 'DELETE'
  | 'CONNECT'
  | 'OPTIONS'
  | 'TRACE'
  | 'PATCH';

export interface DispatchOptions {
  origin?: string;
  path: string;
  method: HttpMethod;
  /** Default: `null` */
  body?: string | Buffer | Uint8Array | Readable | null | FormData;
  /** Default: `null` */
  headers?: HeadersMap;
  /** Query string params to be embedded in the request URL. Default: `null` */
  query?: Record<string, any>;
}

export type OnPrepareServiceRequestHeaders = OnPreServiceCall & {
  serviceRequestOptions: DispatchOptions;
  serviceRequestUrl: string;
};

export type OnModifyServiceRequestHeaders = OnPrepareServiceRequestHeaders;

export type OnModifyServiceRequestBody = OnModifyServiceRequestHeaders &
  (
    | {
        serviceRequestHasBody: true;
        serviceRequestBody: Buffer;
      }
    | {
        serviceRequestHasBody: false;
        serviceRequestBody?: undefined;
      }
  );

export type OnServiceCall = OnModifyServiceRequestBody;

export type OnServiceResponseHeaders = OnServiceCall & {
  serviceResponseHeaders: ResponseHeaders;
  serviceResponseStatusCode: number;
};

export type OnModifyServiceResponseHeaders = OnServiceResponseHeaders;

export type OnServiceResponseBodyChunk = OnServiceResponseHeaders & {
  chunk: Buffer;
};

export type OnModifyServiceResponseWithBody = OnModifyServiceResponseHeaders & {
  serviceResponseHasBody: true;
  serviceResponseBody: Buffer;
};

export type OnModifyServiceResponseWithoutBody =
  OnModifyServiceResponseHeaders & {
    serviceResponseHasBody: false;
  };

export type OnModifyServiceResponseBody =
  | OnModifyServiceResponseWithBody
  | OnModifyServiceResponseWithoutBody;

export type OnPostServiceCall = OnModifyServiceResponseBody;

export type OnModifyResponseHeaders = OnPostServiceCall & {
  responseHeaders: RequestHeaders;
  responseStatusCode: number;
};

export type OnModifyResponseBody = OnModifyResponseHeaders &
  (
    | {
        responseHasBody: true;
        responseBody: Buffer;
      }
    | {
        responseHasBody: false;
      }
  );

export type OnResponse = OnModifyResponseBody;
