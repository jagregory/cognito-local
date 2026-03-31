import { CognitoJwtVerifier } from "aws-jwt-verify";

let verifier: ReturnType<typeof CognitoJwtVerifier.create> | null = null;

function getVerifier() {
  if (!verifier) {
    verifier = CognitoJwtVerifier.create({
      userPoolId: process.env.COGNITO_POOL_ID!,
      tokenUse: "access",
      clientId: process.env.COGNITO_CLIENT_ID!,
    });
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
