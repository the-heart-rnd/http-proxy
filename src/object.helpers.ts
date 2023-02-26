export function isPlainObject(value: unknown): value is object {
  return (
    typeof value === 'object' && value !== null && value.constructor === Object
  );
}

export function mergeDeep<T extends object>(
  context: T,
  partial?: DeepPartial<T>,
): T {
  const result = {} as T;
  for (const key in context) {
    if (context.hasOwnProperty(key)) {
      const value = context[key];
      if (!partial || !partial.hasOwnProperty(key)) {
        result[key] = value;
      } else {
        const partialValue = partial[key];
        if (isPlainObject(value) && isPlainObject(partialValue)) {
          result[key] = mergeDeep(value, partialValue) as any;
        } else {
          result[key] = (partialValue ?? value) as any;
        }
      }
    }
  }
  return result;
}
