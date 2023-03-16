import { ProxyExtension } from 'src/extensions/proxy.extension';
import { OnModifyServiceResponseBody } from 'src/context.types';

import { gunzip, inflate } from 'zlib';
import { promisify } from 'util';

import brotli from 'brotli/decompress';

export class DecodeBodyExtension extends ProxyExtension {
  async init(): Promise<void> {
    this.app.onModifyServiceResponseBody.tapPromise(
      DecodeBodyExtension.name,
      this.decodeBody,
    );
  }

  private decodeBody = async (
    context: OnModifyServiceResponseBody,
  ): Promise<OnModifyServiceResponseBody> => {
    if (!context.serviceResponseHasBody) {
      return context;
    }

    const headers = context.serviceResponseHeaders;
    if (headers.get('content-encoding') === 'gzip') {
      context.serviceResponseHeaders.set('content-encoding', 'identity');
      context.serviceResponseBody = await promisify(gunzip)(
        context.serviceResponseBody,
      );
    } else if (headers.get('content-encoding') === 'br') {
      context.serviceResponseHeaders.set('content-encoding', 'identity');
      context.serviceResponseBody = Buffer.from(
        brotli(context.serviceResponseBody),
      );
    } else if (headers.get('content-encoding') === 'deflate') {
      context.serviceResponseHeaders.set('content-encoding', 'identity');
      context.serviceResponseBody = await promisify(inflate)(
        context.serviceResponseBody,
      );
    }

    context.serviceResponseHeaders.delete('content-length');

    return context;
  };
}
