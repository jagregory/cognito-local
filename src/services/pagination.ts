const DEFAULT_PAGE_SIZE = 60;

export interface PaginationResult<T> {
  items: T[];
  nextToken?: string;
}

export function paginate<T>(
  items: readonly T[],
  maxResults?: number,
  token?: string,
): PaginationResult<T> {
  const limit = maxResults ?? DEFAULT_PAGE_SIZE;
  const offset = token
    ? Number(Buffer.from(token, "base64").toString("utf8"))
    : 0;

  if (Number.isNaN(offset) || offset < 0) {
    return { items: items.slice(0, limit) };
  }

  const slice = items.slice(offset, offset + limit);
  const nextOffset = offset + limit;

  return {
    items: slice,
    nextToken:
      nextOffset < items.length
        ? Buffer.from(String(nextOffset)).toString("base64")
        : undefined,
  };
}
