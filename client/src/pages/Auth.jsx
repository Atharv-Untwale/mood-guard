import { useState } from "react";
import { supabase } from "../lib/supabase";

export default function Auth() {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");
    const { error: err } = mode === "login"
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password });
    if (err) setError(err.message);
    else if (mode === "signup") setMessage("Check your email to confirm your account.");
    setLoading(false);
  }

  async function handleGoogle() {
    setGoogleLoading(true);
    setError("");
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/`,
        queryParams: { access_type: "offline", prompt: "consent" },
      },
    });
    if (err) { setError(err.message); setGoogleLoading(false); }
  }

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "1rem",
    }}>
      <div style={{ width: "100%", maxWidth: 400 }}>

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 8 }}>
          <span style={{ fontFamily: "'Syne', sans-serif", fontSize: 30, fontWeight: 700, color: "var(--text)", letterSpacing: "-0.02em" }}>
            MoodGuard
          </span>
          <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: "var(--yellow)", marginLeft: 4, marginBottom: 8, verticalAlign: "middle" }} />
        </div>
        <p style={{ textAlign: "center", color: "var(--text3)", fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 32 }}>
          Your private wellness journal
        </p>
        <div style={{ width: 40, height: 1, background: "var(--divider)", margin: "0 auto 32px" }} />

        {/* Card */}
        <div style={{
          background: "var(--glass-light)",
          backdropFilter: "blur(18px)",
          WebkitBackdropFilter: "blur(18px)",
          border: "1px solid var(--glass-border-light)",
          borderRadius: 24,
          padding: 28,
          boxShadow: "var(--shadow)",
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}>

          {/* Google Button */}
          <button
            type="button"
            onClick={handleGoogle}
            disabled={googleLoading}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
              width: "100%", padding: "11px 16px",
              background: "rgba(255,252,245,0.6)",
              border: "1px solid var(--divider)",
              borderRadius: 12,
              fontSize: 13, fontFamily: "'Syne', sans-serif", fontWeight: 600,
              color: "var(--text)", cursor: googleLoading ? "not-allowed" : "pointer",
              opacity: googleLoading ? 0.5 : 1,
              transition: "background 0.2s",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            {googleLoading ? "Redirecting..." : "Continue with Google"}
          </button>

          {/* OR divider */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ flex: 1, height: 1, background: "var(--divider)" }} />
            <span style={{ fontSize: 11, color: "var(--text4)", fontWeight: 500, letterSpacing: "0.06em" }}>or</span>
            <div style={{ flex: 1, height: 1, background: "var(--divider)" }} />
          </div>

          {/* Email */}
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            <label style={{ fontSize: 10, fontWeight: 600, color: "var(--text3)", letterSpacing: "0.1em", textTransform: "uppercase" }}>Email</label>
            <input
  type="text"
  inputMode="email"
  value={email}
  onChange={e => setEmail(e.target.value)}
  placeholder="you@example.com"
  autoComplete="off"
  style={{
    padding: "11px 14px", border: "1px solid var(--divider)", borderRadius: 12,
    fontSize: 14, fontFamily: "'Syne', sans-serif",
    background: "rgba(255,252,245,0.5)", color: "var(--text)", outline: "none",
    backdropFilter: "blur(8px)", width: "100%",
  }}
/>
          </div>

          {/* Password */}
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            <label style={{ fontSize: 10, fontWeight: 600, color: "var(--text3)", letterSpacing: "0.1em", textTransform: "uppercase" }}>Password</label>
           <input
  type="password"
  value={password}
  onChange={e => setPassword(e.target.value)}
  placeholder="••••••••"
  minLength={6}
  autoComplete="new-password"
  style={{
    padding: "11px 14px", border: "1px solid var(--divider)", borderRadius: 12,
    fontSize: 14, fontFamily: "'Syne', sans-serif",
    background: "rgba(255,252,245,0.5)", color: "var(--text)", outline: "none",
    backdropFilter: "blur(8px)", width: "100%",
  }}
/>
          </div>

          {error && (
            <p style={{ color: "#c0392b", fontSize: 12, padding: "8px 12px", background: "rgba(192,57,43,0.08)", borderRadius: 10, border: "1px solid rgba(192,57,43,0.2)" }}>
              {error}
            </p>
          )}
          {message && (
            <p style={{ color: "var(--green)", fontSize: 12, padding: "8px 12px", background: "var(--green-bg)", borderRadius: 10, border: "1px solid var(--green-border)" }}>
              {message}
            </p>
          )}

          {/* Submit */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            style={{
              padding: 12, background: "var(--text)", color: "var(--yellow)",
              border: "none", borderRadius: 12, fontSize: 11,
              fontFamily: "'Syne', sans-serif", fontWeight: 700,
              letterSpacing: "0.1em", textTransform: "uppercase",
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.5 : 1, transition: "opacity 0.2s",
            }}
          >
            {loading ? "..." : mode === "login" ? "Sign in" : "Create account"}
          </button>
        </div>

        {/* Toggle */}
        <p style={{ textAlign: "center", marginTop: 20, fontSize: 13, color: "var(--text3)" }}>
          {mode === "login" ? "No account? " : "Already have one? "}
          <button
            onClick={() => setMode(mode === "login" ? "signup" : "login")}
            style={{ background: "none", border: "none", color: "var(--yellow-text)", fontWeight: 700, cursor: "pointer", fontFamily: "'Syne', sans-serif", textDecoration: "underline", textUnderlineOffset: 3 }}
          >
            {mode === "login" ? "Sign up" : "Sign in"}
          </button>
        </p>

      </div>
    </div>
  );
}