import { InputHttpExtension } from 'src/extensions/input-http/input-http.extension';
import { ProxyTransportUndiciExtension } from 'src/extensions/proxy-transport-undici/proxy-transport-undici.extension';
import { InputWsExtension } from 'src/extensions/input-ws/input-ws.extension';
import { ResponseHeadersExtension } from 'src/extensions/response-headers/response-headers.extension';
import { RewriteLinksInResponseExtension } from 'src/extensions/rewrite-links-in-response/rewrite-links-in-response.extension';
import { DecodeBodyExtension } from 'src/extensions/decode-body/decode-body.extension';
import { MatchPathExtension } from 'src/extensions/match-path/match-path.extension';
import { SetHostExtension } from 'src/extensions/set-host/set-host.extension';
import { MatchAbsolutePathsByRefererExtension } from 'src/extensions/match-absolute-paths-by-referer/match-absolute-paths-by-referer.extension';
import { RewriteRedirectExtension } from 'src/extensions/rewrite-redirect/rewrite-redirect.extension';
import { RewriteCookieExtension } from 'src/extensions/rewrite-cookie/rewrite-cookie.extension';
import { CorsExtension } from 'src/extensions/cors/cors.extension';

export const extensions = [
  InputHttpExtension,
  ProxyTransportUndiciExtension,
  InputWsExtension,
  ResponseHeadersExtension,
  RewriteLinksInResponseExtension,
  DecodeBodyExtension,
  MatchPathExtension,
  SetHostExtension,
  MatchAbsolutePathsByRefererExtension,
  RewriteRedirectExtension,
  RewriteCookieExtension,
  CorsExtension,
];
