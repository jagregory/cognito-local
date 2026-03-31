import { NextRequest, NextResponse } from "next/server";
import { createServerRunner } from "@aws-amplify/adapter-nextjs";
import { fetchAuthSession } from "aws-amplify/auth/server";
import { amplifyConfig } from "@/lib/amplify-config";

const { runWithAmplifyServerContext } = createServerRunner({
  config: amplifyConfig,
});

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Try Amplify's fetchAuthSession first (works with real Cognito)
  const authenticated = await runWithAmplifyServerContext({
    nextServerContext: { request, response },
    operation: async (contextSpec) => {
      try {
        const session = await fetchAuthSession(contextSpec);
        return session.tokens !== undefined;
      } catch {
        return false;
      }
    },
  });

  if (authenticated) {
    return response;
  }

  // Fallback: check Amplify auth cookies directly.
  // fetchAuthSession may fail to parse cookies when the username contains
  // special characters (e.g. email with @) due to URL-encoding in cookie names.
  const clientId = process.env.NEXT_PUBLIC_USER_POOL_CLIENT_ID;
  if (clientId) {
    const lastAuthCookie = request.cookies.get(
      `CognitoIdentityServiceProvider.${clientId}.LastAuthUser`
    );
    if (lastAuthCookie?.value) {
      const username = lastAuthCookie.value;
      const accessTokenCookie = request.cookies.get(
        `CognitoIdentityServiceProvider.${clientId}.${encodeURIComponent(username)}.accessToken`
      );
      if (accessTokenCookie?.value) {
        return response;
      }
    }
  }

  return NextResponse.redirect(new URL("/login", request.url));
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
