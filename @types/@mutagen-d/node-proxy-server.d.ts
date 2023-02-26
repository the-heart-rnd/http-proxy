declare module '@mutagen-d/node-proxy-server' {
  import * as net from 'net';
  type HttpRequestOptions = {
    method: string;
    url: string;
    version: string;
    headers: Record<string, string>;
    body: Buffer;
  };
  type CreateProxyConnection = (
    info: ConnectionInfo,
    options?: HttpRequestOptions,
  ) => Promise<import('stream').Duplex>;
  type OnAuth = (
    userid: string,
    password: string,
    callback: (isAuth: boolean) => void,
    socket: net.Socket,
  ) => any;
  type ProxyServer = {
    on(
      event: 'http-proxy',
      listener: (
        socket: net.Socket,
        data: Buffer,
        options: HttpRequestOptions,
      ) => any,
    ): ProxyServer;
    on(
      event: 'http-proxy-connection',
      listener: (
        socket: net.Socket,
        data: Buffer,
        options: HttpRequestOptions,
      ) => any,
    ): ProxyServer;
    on(
      event: 'socks4-proxy',
      listener: (socket: net.Socket, data: Buffer) => any,
    ): ProxyServer;
    on(
      event: 'socks5-proxy',
      listener: (socket: net.Socket, data: Buffer) => any,
    ): ProxyServer;
    on(
      event: 'socks5-proxy-connection',
      listener: (socket: net.Socket, data: Buffer) => any,
    ): ProxyServer;
    on(event: 'proxy-auth', listener: OnAuth): ProxyServer;
    on(
      event: 'proxy-connection',
      listener: (
        connection: import('stream').Duplex,
        info: ConnectionInfo,
      ) => any,
    ): ProxyServer;
  } & net.Server;
  type ConnectionInfo = {
    dstHost: string;
    dstPort: number;
    srcHost: string;
    srcPort: number;
  };
  type ProxyServerOptions = {
    createProxyConnection?: CreateProxyConnection;
    auth?: boolean;
  };

  function createProxyServer(options: ProxyServerOptions): ProxyServer;

  module.exports = { createProxyServer };
}
