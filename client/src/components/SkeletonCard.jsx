export function SkeletonCard() {
  return (
    <div style={{
      background: "var(--bg2)",
      border: "1px solid var(--border)",
      borderRadius: 12,
      padding: 16,
    }}>
      <div className="skeleton" style={{ width: 80, height: 10, marginBottom: 12 }} />
      <div className="skeleton" style={{ width: 60, height: 28 }} />
    </div>
  );
}

export function SkeletonEntry() {
  return (
    <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <div className="skeleton" style={{ width: 70, height: 18, borderRadius: 6 }} />
        <div className="skeleton" style={{ width: 100, height: 18, borderRadius: 6 }} />
      </div>
      <div className="skeleton" style={{ width: "100%", height: 14, marginBottom: 6 }} />
      <div className="skeleton" style={{ width: "60%", height: 14 }} />
    </div>
  );
}