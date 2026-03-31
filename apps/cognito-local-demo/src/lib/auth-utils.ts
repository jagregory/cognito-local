import { CognitoJwtVerifier, JwtRsaVerifier } from "aws-jwt-verify";

type Verifier =
  | ReturnType<typeof CognitoJwtVerifier.create>
  | ReturnType<typeof JwtRsaVerifier.create>;

let verifier: Verifier | null = null;
let jwksCached = false;

function getVerifier(): Verifier {
  if (!verifier) {
    if (process.env.USE_COGNITO_LOCAL === "true") {
      const endpoint =
        process.env.COGNITO_LOCAL_ENDPOINT || "http://localhost:9229";
      const poolId = process.env.COGNITO_POOL_ID!;
      verifier = JwtRsaVerifier.create({
        issuer: `${endpoint}/${poolId}`,
        // Use an HTTPS URI so the library doesn't reject it at fetch time.
        // We pre-cache the JWKS before any verification, so it never actually fetches this URL.
        jwksUri: `https://localhost/${poolId}/.well-known/jwks.json`,
        audience: null,
      });
    } else {
      verifier = CognitoJwtVerifier.create({
        userPoolId: process.env.COGNITO_POOL_ID!,
        tokenUse: "access",
        clientId: process.env.COGNITO_CLIENT_ID!,
      });
    }
  }
  return verifier;
}

async function ensureJwksCached(): Promise<void> {
  if (jwksCached || process.env.USE_COGNITO_LOCAL !== "true") return;

  const endpoint =
    process.env.COGNITO_LOCAL_ENDPOINT || "http://localhost:9229";
  const poolId = process.env.COGNITO_POOL_ID!;
  const res = await fetch(`${endpoint}/${poolId}/.well-known/jwks.json`);
  const jwks = await res.json();
  const v = getVerifier();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (v as any).cacheJwks(jwks);
  jwksCached = true;
}

export async function verifyAccessToken(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }
  try {
    await ensureJwksCached();
    return await getVerifier().verify(authHeader.split(" ")[1]);
  } catch {
    return null;
  }
}
