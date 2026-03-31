"use client";

import { useState } from "react";
import { fetchAuthSession } from "aws-amplify/auth";

const EMOJI_OPTIONS = ["🟢", "🔴", "🟡", "💻", "🍕", "☕", "🎯", "🚀"];

export default function StatusForm({
  onSubmit,
}: {
  onSubmit?: () => void;
}) {
  const [status, setStatus] = useState("");
  const [emoji, setEmoji] = useState("🟢");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!status.trim()) return;

    setSubmitting(true);
    setError(null);

    try {
      const session = await fetchAuthSession();
      const accessToken = session.tokens?.accessToken?.toString();
      if (!accessToken) {
        setError("Not authenticated");
        return;
      }

      const res = await fetch("/api/statuses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ status, emoji }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error || "Failed to update status");
        return;
      }

      setStatus("");
      onSubmit?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ marginBottom: 24 }}>
      <h3>Update your status</h3>
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        {EMOJI_OPTIONS.map((e) => (
          <button
            key={e}
            type="button"
            onClick={() => setEmoji(e)}
            style={{
              fontSize: 20,
              padding: "4px 8px",
              border: emoji === e ? "2px solid #0070f3" : "1px solid #ddd",
              borderRadius: 4,
              background: emoji === e ? "#e8f0fe" : "white",
              cursor: "pointer",
            }}
          >
            {e}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          type="text"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          placeholder="What are you working on?"
          style={{
            flex: 1,
            padding: 8,
            borderRadius: 4,
            border: "1px solid #ddd",
          }}
        />
        <button
          type="submit"
          disabled={submitting || !status.trim()}
          style={{
            padding: "8px 16px",
            borderRadius: 4,
            border: "none",
            background: "#0070f3",
            color: "white",
            cursor: submitting ? "wait" : "pointer",
          }}
        >
          {submitting ? "Posting..." : "Post"}
        </button>
      </div>
      {error && <p style={{ color: "red", marginTop: 8 }}>{error}</p>}
    </form>
  );
}
