import StepRouter from "@/components/StepRouter";
import Link from "next/link";

export default function Home() {
  return (
    <main style={{ padding: "40px", maxWidth: "1200px", margin: "0 auto" }}>
      <header style={{ marginBottom: "40px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ width: "32px", height: "32px", border: "2px solid var(--accent-primary)", borderRadius: "8px" }}></div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 600 }}>Floor<span style={{ color: "var(--accent-primary)" }}>2</span>Feed</h1>
        </div>
        <Link href="/brands" style={{
          background: "var(--accent-primary, #0070f3)",
          color: "white",
          padding: "8px 16px",
          borderRadius: "8px",
          textDecoration: "none",
          fontWeight: 600,
          fontSize: "0.875rem"
        }}>
          Brand Monitor
        </Link>
      </header>
      
      <StepRouter />
    </main>
  );
}
