/**
 * Stop the execution of the current flow and return a synthetic response.
 */
export class BailSynth {
  constructor(
    public statusCode: number,
    public headers?: Record<string, string>,
    public body?: Buffer | string | NodeJS.ReadableStream,
  ) {}
}
