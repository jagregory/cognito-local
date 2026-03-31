export async function register() {
  if (process.env.USE_COGNITO_LOCAL !== "true") return;

  const endpoint =
    process.env.COGNITO_LOCAL_ENDPOINT || "http://localhost:9229";
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

    // Redirect JWKS requests to cognito-local
    const jwksPattern =
      /https:\/\/cognito-idp\.[^/]+\.amazonaws\.com\/([^/]+)\/.well-known\/jwks\.json/;
    const jwksMatch = url.match(jwksPattern);
    if (jwksMatch) {
      const poolId = jwksMatch[1];
      return originalFetch(`${endpoint}/${poolId}/.well-known/jwks.json`, init);
    }

    // Redirect Cognito API calls to cognito-local
    const cognitoApiPattern =
      /https:\/\/cognito-idp\.[^/]+\.amazonaws\.com\/?$/;
    if (cognitoApiPattern.test(url)) {
      return originalFetch(`${endpoint}/`, init);
    }

    return originalFetch(input, init);
  };
}
