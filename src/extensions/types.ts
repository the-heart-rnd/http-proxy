import { ProxyFrameworkApp } from 'src/proxy-framework.app';
import { ProxyExtension } from 'src/extensions/proxy.extension';

export type ExtensionClass<T extends ProxyExtension = ProxyExtension> = (new (
  server: ProxyFrameworkApp,
) => T) &
  CliProvider<any> & {
    dependencies?: ExtensionClass[];
  };
