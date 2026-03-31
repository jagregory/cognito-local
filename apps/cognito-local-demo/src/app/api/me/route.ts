import { NextResponse } from "next/server";
import { verifyAccessToken } from "@/lib/auth-utils";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const payload = await verifyAccessToken(request);
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const claims = payload as Record<string, unknown>;
  return NextResponse.json({
    sub: payload.sub,
    username: String(payload.username ?? payload.sub),
    given_name:
      claims.given_name != null ? String(claims.given_name) : undefined,
    family_name:
      claims.family_name != null ? String(claims.family_name) : undefined,
    email: claims.email != null ? String(claims.email) : undefined,
  });
}
