import React, { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import { useNavigate } from "react-router-dom";
import api from "../utils/api";

const PLATFORMS  = ["instagram","youtube","twitter"];
const CATEGORIES = ["Fashion","Food","Tech","Education","Entertainment","Fitness","Travel","Business"];

export default function Settings() {
  const { user, login, logout } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    username: user?.username || "",
    preferred_platform: user?.preferred_platform || "",
    preferred_category: user?.preferred_category || "",
  });
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);
  const [err,    setErr]    = useState("");

  useEffect(() => {
    api.get("/me").then(r => setForm({
      username:           r.data.username,
      preferred_platform: r.data.preferred_platform || "",
      preferred_category: r.data.preferred_category || "",
    })).catch(()=>{});
  }, []);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true); setErr("");
    try {
      const res = await api.patch("/me", form);
      login({ ...user, username:res.data.username,
        preferred_platform:res.data.preferred_platform,
        preferred_category:res.data.preferred_category },
        localStorage.getItem("token"));
      setSaved(true); setTimeout(()=>setSaved(false), 2500);
    } catch (e) {
      setErr(e.response?.data?.detail || "Failed to save.");
    } finally { setSaving(false); }
  };

  return (
    <div style={page}>
      <div style={{ marginBottom:28 }}>
        <h1 style={title}>Settings</h1>
        <p style={{ color:"var(--text-2)", fontSize:14 }}>Account preferences and system information</p>
      </div>

      <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
        {/* Account */}
        <div className="card" style={{ padding:28 }}>
          <h2 style={st}>Account & Preferences</h2>
          <div style={div}/>
          <form onSubmit={save} style={{ display:"flex", flexDirection:"column", gap:16 }}>
            <div className="form-group">
              <label className="form-label">Username</label>
              <input className="form-input" value={form.username}
                onChange={e=>setForm({...form,username:e.target.value})} />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" value={user?.email} disabled
                style={{ opacity:0.55, cursor:"not-allowed" }} />
              <div style={{ fontSize:11, color:"var(--text-3)" }}>Email cannot be changed</div>
            </div>
            <div style={div}/>
            <div style={{ fontSize:13, fontWeight:600, color:"var(--text-2)" }}>Default Selections</div>
            <div className="form-group">
              <label className="form-label">Preferred Platform</label>
              <select className="form-select" value={form.preferred_platform}
                onChange={e=>setForm({...form,preferred_platform:e.target.value})}>
                <option value="">— No preference —</option>
                {PLATFORMS.map(p=><option key={p} value={p}>{p.charAt(0).toUpperCase()+p.slice(1)}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Preferred Content Category</label>
              <select className="form-select" value={form.preferred_category}
                onChange={e=>setForm({...form,preferred_category:e.target.value})}>
                <option value="">— No preference —</option>
                {CATEGORIES.map(c=><option key={c}>{c}</option>)}
              </select>
            </div>
            {err && <div style={{ background:"var(--danger-light)",color:"var(--danger)",border:"1px solid #fecaca",borderRadius:7,padding:"9px 14px",fontSize:13 }}>{err}</div>}
            <div style={{ display:"flex", gap:10, alignItems:"center" }}>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving?<><span className="spinner" style={{ borderTopColor:"#fff",width:14,height:14 }}/> Saving…</>:"Save changes"}
              </button>
              {saved && <span style={{ fontSize:13, color:"var(--success)" }}>✓ Saved</span>}
            </div>
          </form>
        </div>

        

        {/* Sign out */}
        <div className="card" style={{ padding:28, borderColor:"#fecaca" }}>
          <h2 style={{ ...st, color:"var(--danger)" }}>Sign Out</h2>
          <div style={div}/>
          <p style={{ fontSize:13, color:"var(--text-2)", marginBottom:14 }}>
            Sign out of EngageAI on this device.
          </p>
          <button className="btn"
            style={{ background:"var(--danger-light)", color:"var(--danger)", border:"1px solid #fecaca" }}
            onClick={()=>{ logout(); navigate("/login"); }}>
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}

const page  = { maxWidth:820, margin:"0 auto", padding:"32px 24px" };
const title = { fontSize:22, fontWeight:700, letterSpacing:"-0.4px", marginBottom:4 };
const st    = { fontSize:15, fontWeight:600 };
const div   = { height:1, background:"var(--border)", margin:"16px 0" };
