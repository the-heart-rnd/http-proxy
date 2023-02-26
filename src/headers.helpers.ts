import { IncomingHttpHeaders, OutgoingHttpHeaders } from 'http';

export class HeadersMap extends Map<string, string | string[]> {
  toJSON(): Record<string, string | string[]> {
    return Object.fromEntries(this);
  }

  static from(headers?: IncomingHttpHeaders | OutgoingHttpHeaders): HeadersMap {
    const map = new HeadersMap();
    if (headers) {
      for (const key in headers) {
        const value = headers[key];
        if (value === undefined || value === null) {
          continue;
        }
        map.set(key, typeof value === 'number' ? value.toString() : value);
      }
    }
    return map;
  }

  get(key: 'set-cookie'): string | string[] | undefined;
  get(key: Exclude<string, 'set-cookie'>): string | undefined;
  get(key: string): string | string[] | undefined {
    return super.get(key.toLowerCase());
  }

  set(key: string, value: string | string[]): this {
    return super.set(key.toLowerCase(), value);
  }

  mergeToCommaSeparatedSet(key: string, ...values: (string | undefined)[]) {
    const existingValue = this.get(key);
    const existingValues = new Set(
      existingValue ? existingValue.split(', ') : [],
    );
    const newValuesItems = values
      .filter((v) => v !== undefined)
      .map((v) => v!.split(', '))
      .flat();

    for (const newValue of newValuesItems) {
      existingValues.add(newValue);
    }
    const newValue = Array.from(existingValues).join(', ');

    this.set(key, newValue);
  }

  delete(key: string): boolean {
    return super.delete(key.toLowerCase());
  }

  has(key: string): boolean {
    return super.has(key.toLowerCase());
  }

  update(key: string, updater: (value: string) => string) {
    const existingValue = this.get(key) as string | string[] | undefined;
    if (existingValue) {
      if (typeof existingValue === 'string') {
        this.set(key, updater(existingValue));
      } else if (Array.isArray(existingValue)) {
        this.set(key, existingValue.map(updater));
      }
    }
  }

  assign(otherHeaders: HeadersMap) {
    for (const [key, value] of otherHeaders) {
      super.set(key, value);
    }
  }
}
