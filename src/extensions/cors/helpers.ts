import { uniqBy } from 'rambda';

export function splitHeaderValueList(
  originalResponseHeader?: string,
): string[] {
  const normalizedValue = originalResponseHeader?.trim();
  return normalizedValue ? normalizedValue.split(/,\s*/) : [];
}

export function addValuesToHeaderValueList(
  existingItems?: string,
  newItems?: string,
) {
  return uniqBy(
    (item) => item.toLowerCase(),
    splitHeaderValueList(existingItems).concat(splitHeaderValueList(newItems)),
  ).join(', ');
}
