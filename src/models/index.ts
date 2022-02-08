export const UUID =
  /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

export const id = (prefix: string, number?: number) =>
  `${prefix}${number ?? Math.floor(Math.random() * 100000)}`;
