import { NextResponse } from "next/server";
import { verifyAccessToken } from "@/lib/auth-utils";
import { getAll, getHistory, set } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");

  if (userId) {
    return NextResponse.json(getHistory(userId));
  }

  return NextResponse.json(getAll());
}

export async function POST(request: Request) {
  const payload = await verifyAccessToken(request);
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { status, emoji } = body;

  if (!status || typeof status !== "string") {
    return NextResponse.json({ error: "status is required" }, { status: 400 });
  }

  const entry = set({
    userId: payload.sub ?? "unknown",
    username: String(payload.username ?? payload.sub),
    displayName: String(body.displayName ?? payload.username ?? "Unknown"),
    status,
    emoji: emoji ?? "🟢",
    updatedAt: new Date().toISOString(),
  });

  return NextResponse.json(entry);
}
