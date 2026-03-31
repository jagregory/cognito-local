export async function register() {
  const endpoint = process.env.NEXT_PUBLIC_COGNITO_LOCAL_ENDPOINT;
  if (!endpoint) return;

  const cognitoPattern =
    /https:\/\/cognito-idp\.[^/]+\.amazonaws\.com(\/.*)?$/;

  // Patch globalThis.fetch — used by Amplify SDK for token operations
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;

    const match = url.match(cognitoPattern);
    if (match) {
      const path = match[1] || "/";
      return originalFetch(`${endpoint}${path}`, init);
    }

    return originalFetch(input, init);
  };
}
