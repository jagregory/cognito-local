"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { fetchAuthSession, signOut, getCurrentUser } from "aws-amplify/auth";
import StatusForm from "@/components/StatusForm";
import StatusCard from "@/components/StatusCard";
import type { StatusEntry } from "@/lib/store";

interface UserProfile {
  sub: string;
  username: string;
  given_name?: string;
  family_name?: string;
  email?: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [statuses, setStatuses] = useState<StatusEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const loadStatuses = useCallback(async () => {
    try {
      const res = await fetch("/api/statuses");
      if (res.ok) {
        setStatuses(await res.json());
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    async function load() {
      try {
        await getCurrentUser();
        const session = await fetchAuthSession();
        const accessToken = session.tokens?.accessToken?.toString();
        if (accessToken) {
          const res = await fetch("/api/me", {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          if (res.ok) {
            setProfile(await res.json());
          }
        }
        await loadStatuses();
      } catch {
        router.replace("/login");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [router, loadStatuses]);

  async function handleSignOut() {
    await signOut();
    router.replace("/");
  }

  if (loading) {
    return (
      <div style={{ maxWidth: 720, margin: "0 auto", padding: 24 }}>
        <p>Loading...</p>
      </div>
    );
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
        <h1>Dashboard</h1>
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <a href="/dashboard/history">History</a>
          <button
            onClick={handleSignOut}
            style={{
              padding: "6px 12px",
              borderRadius: 4,
              border: "1px solid #ddd",
              background: "white",
              cursor: "pointer",
            }}
          >
            Sign out
          </button>
        </div>
      </header>

      {profile && (
        <div
          style={{
            background: "#f5f5f5",
            borderRadius: 8,
            padding: 16,
            marginBottom: 24,
          }}
        >
          <h3 style={{ margin: "0 0 8px" }}>
            {profile.given_name} {profile.family_name}
          </h3>
          <p style={{ margin: 0, color: "#666" }}>{profile.email}</p>
          <small style={{ color: "#999" }}>sub: {profile.sub}</small>
        </div>
      )}

      <StatusForm onSubmit={loadStatuses} />

      <h2>Team Statuses</h2>
      {statuses.length === 0 ? (
        <p style={{ color: "#888" }}>No statuses yet.</p>
      ) : (
        statuses.map((entry) => (
          <StatusCard key={entry.userId} entry={entry} />
        ))
      )}
    </div>
  );
}
