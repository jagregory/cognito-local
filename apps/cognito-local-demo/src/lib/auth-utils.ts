import * as jose from "jose";

const region = process.env.NEXT_PUBLIC_COGNITO_REGION ?? "us-east-1";
const poolId = process.env.COGNITO_POOL_ID!;
const clientId = process.env.COGNITO_CLIENT_ID!;
const issuer = `https://cognito-idp.${region}.amazonaws.com/${poolId}`;

let jwks: ReturnType<typeof jose.createRemoteJWKSet> | null = null;

function getJwks() {
  if (!jwks) {
    // The JWKS URL uses the standard Cognito issuer format.
    // When running against cognito-local, the instrumentation.ts fetch
    // interceptor redirects this request to the local endpoint.
    jwks = jose.createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks.json`));
  }
  return jwks;
}

export async function verifyAccessToken(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }
  try {
    const { payload } = await jose.jwtVerify(
      authHeader.split(" ")[1],
      getJwks(),
      { issuer },
    );
    if (payload.token_use !== "access") return null;
    if (payload.client_id !== clientId) return null;
    return payload;
  } catch {
    return null;
  }
}
