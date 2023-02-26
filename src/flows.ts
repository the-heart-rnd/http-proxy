import {
  OnModifyRequestBody,
  OnModifyRequestHeaders,
  OnModifyResponseBody,
  OnModifyResponseHeaders,
  OnModifyServiceRequestBody,
  OnModifyServiceRequestHeaders,
  OnModifyServiceResponseBody,
  OnModifyServiceResponseHeaders,
  OnPostServiceCall,
  OnPreConfigMatch,
  OnPreServiceCall,
  OnRequestHeaders,
  OnServiceCall,
  OnServiceResponseHeaders,
} from 'src/context.types';
import { BailSynth } from 'src/flow-control';
import { ProxyFrameworkApp } from 'src/proxy-framework.app';

export interface PreServiceFlowMethods<ImplementationContext> {
  prepareRequest(
    flowContext: OnRequestHeaders,
    implementationContext: ImplementationContext,
  ): Promise<RequestMetadata>;

  prepareRequestBody(
    flowContext: OnModifyRequestHeaders,
    implementationContext: ImplementationContext,
  ): Promise<OnModifyRequestBody>;

  prepareServiceRequestHeaders(
    flowContext: OnPreServiceCall,
    implementationContext: ImplementationContext,
  ): Promise<OnModifyServiceRequestHeaders>;

  prepareServiceRequestBody(
    flowContext: OnModifyServiceRequestHeaders,
    implementationContext: ImplementationContext,
  ): Promise<OnModifyServiceRequestBody>;
}

export interface PostServiceFlowMethods<ImplementationContext> {
  prepareResponseHeaders(
    flowContext: OnPostServiceCall,
    implementationContext: ImplementationContext,
  ): Promise<OnModifyResponseHeaders>;

  prepareResponseBody(
    flowContext: OnModifyResponseHeaders,
    implementationContext: ImplementationContext,
  ): Promise<OnModifyResponseBody>;
}

export interface ServiceFlowMethods<ImplementationContext> {
  prepareServiceResponseBody(
    flowContext: OnModifyServiceResponseHeaders,
    implementationContext: ImplementationContext,
  ): Promise<OnModifyServiceResponseBody>;

  prepareServiceResponseHeaders(
    flowContext: OnServiceCall,
    implementationContext: ImplementationContext,
  ): Promise<OnServiceResponseHeaders>;
}

/**
 * This class is responsible for executing the flow of the proxy framework.
 * Flow handles calling all request hooks during the request/response cycle.
 */
export class Flows {
  constructor(private app: ProxyFrameworkApp) {}

  public async executeRequestResponseFlow<ImplementationContext>(
    onRequestHeadersArg: OnRequestHeaders,
    implementationContext: ImplementationContext,
    implementation: PreServiceFlowMethods<ImplementationContext> &
      PostServiceFlowMethods<ImplementationContext>,
  ) {
    const onModifyServiceRequestBody = await this.executePreServiceFlow(
      onRequestHeadersArg,
      implementationContext,
      implementation,
    );
    const onServiceCall = await this.findAndCallServiceFlow(
      onModifyServiceRequestBody,
    );

    return await this.executePostServiceFlow(
      onServiceCall,
      implementationContext,
      implementation,
    );
  }

  public async findAndCallServiceFlow(
    onModifyServiceRequestBody: OnServiceCall,
  ) {
    const onServiceCall = await this.app.onServiceCall.promise(
      onModifyServiceRequestBody,
    );

    if (!onServiceCall) {
      throw new BailSynth(500, {}, 'No service call response');
    }
    return onServiceCall;
  }

  public async executeServiceFlow<ImplementationContext>(
    onServiceCall: OnServiceCall,
    implementationContext: ImplementationContext,
    implementation: ServiceFlowMethods<ImplementationContext>,
  ) {
    const onServiceResponseHeaders =
      await this.app.onServiceResponseHeaders.promise(
        await implementation.prepareServiceResponseHeaders(
          onServiceCall,
          implementationContext,
        ),
      );

    const onModifyServiceResponseHeaders =
      await this.app.onModifyServiceResponseHeaders.promise(
        onServiceResponseHeaders,
      );

    const onModifyServiceResponseBody =
      await implementation.prepareServiceResponseBody(
        onModifyServiceResponseHeaders,
        implementationContext,
      );

    return await this.app.onModifyServiceResponseBody.promise(
      onModifyServiceResponseBody,
    );
  }

  public async executePostServiceFlow<ImplementationContext>(
    onServiceCall: OnPostServiceCall,
    implementationContext: ImplementationContext,
    implementation: PreServiceFlowMethods<ImplementationContext> &
      PostServiceFlowMethods<ImplementationContext>,
  ) {
    const onPostServiceCall = await this.app.onPostServiceCall.promise(
      onServiceCall,
    );

    const onPrepareResponseHeaders =
      await implementation.prepareResponseHeaders(
        onPostServiceCall,
        implementationContext,
      );

    const onModifyResponseHeaders =
      await this.app.onModifyResponseHeaders.promise(onPrepareResponseHeaders);

    const onPrepareResponseBody = await implementation.prepareResponseBody(
      onModifyResponseHeaders,
      implementationContext,
    );

    const onModifyResponseBody = await this.app.onModifyResponseBody.promise(
      onPrepareResponseBody,
    );

    await this.app.onResponse.promise(onModifyResponseBody);
    return onModifyResponseBody;
  }

  public async executePreServiceFlow<ImplementationContext>(
    onRequestHeadersArg: OnRequestHeaders,
    implementationContext: ImplementationContext,
    implementation: PreServiceFlowMethods<ImplementationContext>,
  ) {
    const onRequestHeaders = await this.app.onRequestHeaders.promise(
      onRequestHeadersArg,
    );
    const onPreConfigMatchArg: OnPreConfigMatch = {
      ...onRequestHeaders,
      request: await implementation.prepareRequest(
        onRequestHeaders,
        implementationContext,
      ),
      config: this.app.configuration,
    };
    const onConfigMatchFound = await this.executeConfigMatchFlow(
      onPreConfigMatchArg,
    );
    const onModifyRequestHeaders =
      await this.app.onModifyRequestHeaders.promise(onConfigMatchFound);
    const onRequestBody = await implementation.prepareRequestBody(
      onModifyRequestHeaders,
      implementationContext,
    );

    const onModifyRequestBody = await this.app.onModifyRequestBody.promise(
      onRequestBody,
    );

    const onPreServiceCall = await this.app.onPreServiceCall.promise(
      onModifyRequestBody,
    );

    const onPrepareServiceRequestHeaders =
      await implementation.prepareServiceRequestHeaders(
        onPreServiceCall,
        implementationContext,
      );

    const onModifyServiceRequestHeaders =
      await this.app.onModifyServiceRequestHeaders.promise(
        onPrepareServiceRequestHeaders,
      );

    const onPrepareServiceRequestBody =
      await implementation.prepareServiceRequestBody(
        onModifyServiceRequestHeaders,
        implementationContext,
      );

    return await this.app.onModifyServiceRequestBody.promise(
      onPrepareServiceRequestBody,
    );
  }

  public async executeConfigMatchFlow(onPreConfigMatchArg: OnPreConfigMatch) {
    const onPreConfigMatch = await this.app.onPreConfigMatch.promise(
      onPreConfigMatchArg,
    );
    const onConfigMatch = this.app.onConfigMatch.call(onPreConfigMatch);

    if (!onConfigMatch) {
      this.app.logger.warn(
        {
          request: onPreConfigMatch.request.url,
        },
        `No match found`,
      );
      await this.app.onConfigMatchNotFound.promise(onPreConfigMatch);
      throw new BailSynth(404);
    } else {
      this.app.logger.info(
        {
          request: onConfigMatch.request.url,
          target: onConfigMatch.match.target,
        },
        `Matched rule`,
      );
    }
    return await this.app.onConfigMatchFound.promise(onConfigMatch);
  }
}
