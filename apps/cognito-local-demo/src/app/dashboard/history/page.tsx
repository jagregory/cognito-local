"use client";

import { useEffect, useState } from "react";
import { fetchAuthSession } from "aws-amplify/auth";
import StatusCard from "@/components/StatusCard";
import type { StatusEntry } from "@/lib/store";

export default function HistoryPage() {
  const [entries, setEntries] = useState<StatusEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const session = await fetchAuthSession();
        const accessToken = session.tokens?.accessToken?.toString();
        if (accessToken) {
          const res = await fetch("/api/me", {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          if (res.ok) {
            const profile = await res.json();
            const statusRes = await fetch(
              `/api/statuses?userId=${profile.sub}`
            );
            if (statusRes.ok) {
              setEntries(await statusRes.json());
            }
          }
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

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
        <h1>Status History</h1>
        <a href="/dashboard">Back to Dashboard</a>
      </header>

      {loading ? (
        <p>Loading...</p>
      ) : entries.length === 0 ? (
        <p style={{ color: "#888" }}>No history yet.</p>
      ) : (
        entries.map((entry, i) => <StatusCard key={i} entry={entry} />)
      )}
    </div>
  );
}
