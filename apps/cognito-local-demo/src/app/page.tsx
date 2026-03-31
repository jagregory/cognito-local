import { headers } from "next/headers";
import StatusCard from "@/components/StatusCard";
import type { StatusEntry } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const headersList = await headers();
  const host = headersList.get("host") || "localhost:3000";
  const protocol = headersList.get("x-forwarded-proto") || "http";

  let statuses: StatusEntry[] = [];
  try {
    const res = await fetch(`${protocol}://${host}/api/statuses`, {
      cache: "no-store",
    });
    if (res.ok) {
      statuses = await res.json();
    }
  } catch {
    // API not ready
  }

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: 24 }}>
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
        }}
      >
        <h1>Team Status Board</h1>
        <a href="/login">Sign in</a>
      </header>

      {statuses.length === 0 ? (
        <p style={{ color: "#888" }}>
          No statuses yet. Sign in and post the first one!
        </p>
      ) : (
        statuses.map((entry) => (
          <StatusCard key={entry.userId} entry={entry} />
        ))
      )}
    </div>
  );
}
