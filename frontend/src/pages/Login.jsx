import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../utils/api";
import { useAuth } from "../hooks/useAuth";

export default function Login() {
  const [mode,     setMode]     = useState("login");
  const [email,    setEmail]    = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const { login } = useAuth();
  const navigate  = useNavigate();

  // Clear error only when user changes the RELEVANT field — not on every keystroke
  const handleEmailChange    = (v) => { setEmail(v);    };
  const handlePasswordChange = (v) => { setPassword(v); };
  const handleUsernameChange = (v) => { setUsername(v); };

  const switchMode = (m) => {
    setMode(m);
    setError("");
    setEmail(""); setPassword(""); setUsername("");
  };

  // ── Client-side validation before hitting the API ──────────────────────────
  const validate = () => {
    if (!email.trim()) return "Email address is required.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      return "Please enter a valid email address.";
    if (!password) return "Password is required.";
    if (password.length < 6) return "Password must be at least 6 characters.";
    if (mode === "signup") {
      if (!username.trim()) return "Username is required.";
      if (username.trim().length < 2) return "Username must be at least 2 characters.";
    }
    return null;
  };

  const submit = async (e) => {
    e.preventDefault();

    // Run client-side validation first — show error immediately, don't hit API
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    // IMPORTANT: Do NOT call setError("") here — that causes the flash.
    // Only update loading state now; error stays visible until new response arrives.
    setLoading(true);

    try {
      if (mode === "signup") {
        const res = await api.post("/signup", { email: email.trim(), username: username.trim(), password });
        login({ username: res.data.username, email: res.data.email }, res.data.access_token);
        navigate("/dashboard");
      } else {
        const params = new URLSearchParams();
        params.append("username", email.trim());
        params.append("password", password);
        const res = await api.post("/login", params, {
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
        });
        login({ username: res.data.username, email: res.data.email }, res.data.access_token);
        navigate("/dashboard");
      }
    } catch (err) {
      const detail = err.response?.data?.detail;
      let msg = "Something went wrong. Please try again.";
      if (typeof detail === "string") msg = detail;
      else if (Array.isArray(detail)) msg = detail.map(d => d.msg).join("; ");
      else if (err.message === "Network Error")
        msg = "Cannot reach server. Is the backend running on port 8000?";

      // React 18 batches these two setStates into ONE re-render — no flash
      setError(msg);
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center",
      justifyContent:"center", background:"var(--bg)", padding:24 }}>
      <div className="card" style={{ padding:"40px 36px", width:"100%", maxWidth:400 }}>

        {/* Logo */}
        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:28 }}>
          <div style={{ width:28, height:28, borderRadius:7, background:"var(--accent)",
            display:"flex", alignItems:"center", justifyContent:"center" }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 11L5.5 6.5L8.5 8.5L12 3" stroke="white" strokeWidth="1.8"
                strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span style={{ fontSize:18, fontWeight:700 }}>EngageAI</span>
        </div>

        <h1 style={{ fontSize:21, fontWeight:700, letterSpacing:"-0.4px", marginBottom:6 }}>
          {mode === "login" ? "Welcome back" : "Create account"}
        </h1>
        <p style={{ color:"var(--text-2)", fontSize:14, marginBottom:26 }}>
          {mode === "login"
            ? "Sign in to your workspace"
            : "Start estimating content performance"}
        </p>

        <form onSubmit={submit} style={{ display:"flex", flexDirection:"column", gap:14 }}>
          {mode === "signup" && (
            <div className="form-group">
              <label className="form-label">Username</label>
              <input className="form-input" placeholder="Your name"
                value={username}
                onChange={e => handleUsernameChange(e.target.value)} />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Email address</label>
            <input className="form-input" type="text" placeholder="you@example.com"
              value={email}
              onChange={e => handleEmailChange(e.target.value)} />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input className="form-input" type="password" placeholder="••••••••"
              value={password}
              onChange={e => handlePasswordChange(e.target.value)} />
          </div>

          {/* Persistent error box — only renders when there's an error */}
          {error && (
            <div style={{
              background: "var(--danger-light)", color: "var(--danger)",
              border: "1px solid #fecaca", borderRadius: 7,
              padding: "10px 13px", fontSize: 13,
              display: "flex", gap: 8, alignItems: "flex-start",
            }}>
              <span style={{ flexShrink: 0 }}>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <button type="submit" className="btn btn-primary"
            style={{ width:"100%", justifyContent:"center", height:40 }}
            disabled={loading}>
            {loading
              ? <span className="spinner" style={{ borderTopColor:"#fff" }} />
              : mode === "login" ? "Sign in" : "Create account"}
          </button>
        </form>

        <div style={{ textAlign:"center", marginTop:18, fontSize:13, color:"var(--text-2)" }}>
          {mode === "login"
            ? <>Don't have an account? <button style={toggle} onClick={() => switchMode("signup")}>Sign up</button></>
            : <>Already have an account? <button style={toggle} onClick={() => switchMode("login")}>Sign in</button></>}
        </div>
      </div>
    </div>
  );
}

const toggle = {
  background:"none", border:"none", color:"var(--accent)",
  fontWeight:600, cursor:"pointer", fontFamily:"inherit", fontSize:13,
};