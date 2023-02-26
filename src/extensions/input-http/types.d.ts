declare interface AppConfiguration {
  http?: {
    port: number;
    host: string;
  };
  /**
   * @deprecated use http.port instead
   */
  port?: number;

  /**
   * @deprecated use http.host instead
   */
  host?: string;
}
