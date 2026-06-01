import React, { useState, useRef, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

const NAV = [
  { label: "Dashboard", path: "/dashboard" },
  { label: "Analyzer",  path: "/analyzer"  },
  { label: "History",   path: "/history"   },
  { label: "Analytics", path: "/analytics" },
  { label: "Settings",  path: "/settings"  },
];

export default function Navbar() {
  const { user, logout }   = useAuth();
  const location           = useLocation();
  const navigate           = useNavigate();
  const [open, setOpen]    = useState(false);
  const ref                = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const isActive = (path) => location.pathname.startsWith(path);

  return (
    <nav style={s.nav}>
      <div style={s.inner}>
        {/* Logo */}
        <Link to="/dashboard" style={s.logo}>
          <div style={s.logoIcon}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 11L5.5 6.5L8.5 8.5L12 3" stroke="white" strokeWidth="1.8"
                strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span style={s.logoText}>EngageAI</span>
        </Link>

        {/* Nav links */}
        <div style={s.links}>
          {NAV.map(n => (
            <Link key={n.path} to={n.path}
              style={{ ...s.link, ...(isActive(n.path) ? s.linkOn : {}) }}>
              {n.label}
            </Link>
          ))}
        </div>

        {/* User */}
        <div style={{ position: "relative" }} ref={ref}>
          <button style={s.userBtn} onClick={() => setOpen(o => !o)}>
            <div style={s.avatar}>{(user?.username || "U")[0].toUpperCase()}</div>
            <span style={s.userName}>{user?.username}</span>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ opacity: 0.5 }}>
              <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>

          {open && (
            <div style={s.drop}>
              <div style={s.dropHead}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{user?.username}</div>
                <div style={{ color: "var(--text-3)", fontSize: 12 }}>{user?.email}</div>
              </div>
              <div style={s.dropDivider} />
              <button style={s.dropItem} onClick={() => { navigate("/settings"); setOpen(false); }}>
                Settings
              </button>
              <button style={{ ...s.dropItem, color: "var(--danger)" }}
                onClick={() => { logout(); navigate("/login"); }}>
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

const s = {
  nav: {
    position: "sticky", top: 0, zIndex: 100,
    background: "var(--surface)",
    borderBottom: "1px solid var(--border)",
    boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
  },
  inner: {
    maxWidth: 1200, margin: "0 auto", padding: "0 24px",
    height: 56, display: "flex", alignItems: "center", gap: 28,
  },
  logo:     { display: "flex", alignItems: "center", gap: 8, textDecoration: "none", flexShrink: 0 },
  logoIcon: {
    width: 28, height: 28, borderRadius: 7, background: "var(--accent)",
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  logoText: { fontSize: 15, fontWeight: 700, color: "var(--text)", letterSpacing: "-0.3px" },
  links:    { display: "flex", alignItems: "center", gap: 2, flex: 1 },
  link: {
    textDecoration: "none", color: "var(--text-2)", fontSize: 14, fontWeight: 500,
    padding: "6px 12px", borderRadius: 6, transition: "all 0.12s",
  },
  linkOn: { color: "var(--accent)", background: "var(--accent-light)" },
  userBtn: {
    display: "flex", alignItems: "center", gap: 8,
    background: "none", border: "1px solid var(--border)",
    borderRadius: 20, padding: "4px 10px 4px 4px",
    cursor: "pointer", transition: "background 0.12s",
    fontFamily: "inherit",
  },
  avatar: {
    width: 26, height: 26, borderRadius: "50%",
    background: "var(--accent)", color: "#fff",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 12, fontWeight: 700,
  },
  userName: { fontSize: 13, fontWeight: 500, color: "var(--text)" },
  drop: {
    position: "absolute", right: 0, top: "calc(100% + 8px)",
    background: "var(--surface)", border: "1px solid var(--border)",
    borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.10)",
    minWidth: 190, padding: 8, zIndex: 200,
  },
  dropHead:    { padding: "8px 12px 6px" },
  dropDivider: { height: 1, background: "var(--border)", margin: "4px 0" },
  dropItem: {
    display: "block", width: "100%", padding: "8px 12px",
    background: "none", border: "none", borderRadius: 6,
    textAlign: "left", fontSize: 13, cursor: "pointer",
    color: "var(--text)", fontFamily: "inherit", transition: "background 0.1s",
  },
};
