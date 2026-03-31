import { type NextRequest, NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  const clientId = process.env.NEXT_PUBLIC_USER_POOL_CLIENT_ID;
  const lastAuthCookie = request.cookies.get(
    `CognitoIdentityServiceProvider.${clientId}.LastAuthUser`,
  );

  if (!lastAuthCookie?.value) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const username = lastAuthCookie.value;
  const accessTokenCookie = request.cookies.get(
    `CognitoIdentityServiceProvider.${clientId}.${encodeURIComponent(username)}.accessToken`,
  );

  if (!accessTokenCookie?.value) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
