import type { StatusEntry } from "@/lib/store";

export default function StatusCard({ entry }: { entry: StatusEntry }) {
  return (
    <div
      style={{
        border: "1px solid #ddd",
        borderRadius: 8,
        padding: 16,
        marginBottom: 12,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 24 }}>{entry.emoji}</span>
        <strong>{entry.displayName}</strong>
      </div>
      <p style={{ margin: "8px 0 4px" }}>{entry.status}</p>
      <small style={{ color: "#888" }}>
        {new Date(entry.updatedAt).toLocaleString()}
      </small>
    </div>
  );
}
