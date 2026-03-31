import { CognitoJwtVerifier } from "aws-jwt-verify";
import { SimpleJwksCache } from "aws-jwt-verify/jwk";

const cognitoPattern =
  /https:\/\/cognito-idp\.[^/]+\.amazonaws\.com(\/.*)?$/;

function createJwksCache() {
  const endpoint = process.env.NEXT_PUBLIC_COGNITO_LOCAL_ENDPOINT;
  if (!endpoint) {
    return new SimpleJwksCache();
  }

  // Custom fetcher that redirects Cognito JWKS URLs to the local endpoint.
  // aws-jwt-verify uses Node's https module internally, which can't reach
  // localhost. This fetcher uses globalThis.fetch instead.
  return new SimpleJwksCache({
    fetcher: {
      async fetch(uri: string): Promise<ArrayBuffer> {
        const match = uri.match(cognitoPattern);
        const url = match ? `${endpoint}${match[1] || "/"}` : uri;
        const res = await globalThis.fetch(url);
        return res.arrayBuffer();
      },
    },
  });
}

let verifier: ReturnType<typeof CognitoJwtVerifier.create> | null = null;

function getVerifier() {
  if (!verifier) {
    verifier = CognitoJwtVerifier.create(
      {
        userPoolId: process.env.COGNITO_POOL_ID!,
        tokenUse: "access",
        clientId: process.env.COGNITO_CLIENT_ID!,
      },
      { jwksCache: createJwksCache() },
    );
  }
  return verifier;
}

export async function verifyAccessToken(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }
  try {
    return await getVerifier().verify(authHeader.split(" ")[1]);
  } catch {
    return null;
  }
}
