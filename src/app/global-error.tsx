"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", margin: 0 }}>
        <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12 }}>Something went wrong</h2>
        <p style={{ color: "#6B7481", marginBottom: 20 }}>{error?.message}</p>
        <button onClick={() => reset()} style={{ background: "#1E4E79", color: "#fff", border: 0, borderRadius: 12, padding: "12px 24px", fontSize: 16, fontWeight: 600, cursor: "pointer" }}>
          Try again
        </button>
      </body>
    </html>
  );
}
