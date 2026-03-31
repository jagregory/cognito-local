import { NextRequest, NextResponse } from "next/server";
import { createServerRunner } from "@aws-amplify/adapter-nextjs";
import { fetchAuthSession } from "aws-amplify/auth/server";
import { amplifyConfig } from "@/lib/amplify-config";

const { runWithAmplifyServerContext } = createServerRunner({
  config: amplifyConfig,
});

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();

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

  if (!authenticated) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
