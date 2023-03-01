import { ProxyExtension } from 'src/extensions/proxy.extension';
import {
  OnModifyServiceResponseBody,
  OnModifyServiceResponseHeaders,
  OnPostServiceCall,
  OnServiceCall,
  OnServiceResponseHeaders,
} from 'src/context.types';
import { Dispatcher, request } from 'undici';
import { ServiceFlowMethods } from 'src/flows';
import { HeadersMap } from 'src/headers.helpers';
import { omit } from 'rambda';
import { wrap } from '@hitorisensei/errors.wrap';
import RequestOptions = Dispatcher.RequestOptions;

/**
 * This extension is responsible for sending the request to the target service
 * and returning the response to the proxy client.
 */
export class ProxyTransportUndiciExtension
  extends ProxyExtension
  implements ServiceFlowMethods<Dispatcher.ResponseData>
{
  async init(): Promise<void> {
    this.app.onServiceCall
      .withOptions({
        stage: 2,
      })
      .tapPromise('ProxyTransportUndiciExtension', this.callService);
  }

  private callService = async (
    context: OnServiceCall,
  ): Promise<OnPostServiceCall> => {
    this.contextLogger(context).debug(
      {
        url: context.serviceRequestUrl,
        options: context.serviceRequestOptions,
      },
      'Sending request to service',
    );
    try {
      const headers = context.serviceRequestOptions.headers?.toJSON();

      const options: Omit<RequestOptions, 'origin' | 'path' | 'method'> &
        Partial<Pick<RequestOptions, 'method'>> = {
        ...omit(['path', 'origin'], context.serviceRequestOptions),
        headers: headers,
        maxRedirections: 0,
        idempotent: false,
      };

      if (context.serviceRequestHasBody) {
        options.body = context.serviceRequestBody;
      }

      const response = await request(context.serviceRequestUrl, options);

      return this.app.flows.executeServiceFlow(context, response, this);
    } catch (e) {
      const wrappedError = wrap(e, 'failed to call service');
      this.contextLogger(context).error(wrappedError);
      throw wrappedError;
    }
  };

  public async prepareServiceResponseHeaders(
    context: OnServiceCall,
    response: Dispatcher.ResponseData,
  ): Promise<OnServiceResponseHeaders> {
    return {
      ...context,
      serviceResponseHeaders: HeadersMap.from(response.headers),
      serviceResponseStatusCode: response.statusCode,
    };
  }

  public async prepareServiceResponseBody(
    onModifyServiceResponseHeaders: OnModifyServiceResponseHeaders,
    response: Dispatcher.ResponseData,
  ): Promise<OnModifyServiceResponseBody> {
    const chunks: Buffer[] = [];
    response.body.on('data', async (chunk) => {
      const onRequestBodyChunk =
        await this.app.onServiceResponseBodyChunk.promise({
          ...onModifyServiceResponseHeaders,
          chunk,
        });
      chunks.push(onRequestBodyChunk.chunk);
    });

    await new Promise((resolve, reject) => {
      response.body.on('end', resolve);
      response.body.on('error', reject);
    });

    return chunks.length > 0
      ? {
          ...onModifyServiceResponseHeaders,
          serviceResponseHasBody: true,
          serviceResponseBody: Buffer.concat(chunks),
        }
      : {
          ...onModifyServiceResponseHeaders,
          serviceResponseHasBody: false,
        };
  }
}
