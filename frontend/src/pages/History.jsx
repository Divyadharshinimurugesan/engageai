import React, { useEffect, useState } from "react";
import api from "../utils/api";

const PC = { instagram:"#e1306c", youtube:"#ff0000", twitter:"#1da1f2" };

function ERBadge({ er }) {
  if (er == null) return <span style={{ color:"var(--text-3)", fontSize:12 }}>—</span>;
  const c = er>=5?"green":er>=2?"yellow":"red";
  return <span className={`badge badge-${c}`}>{er.toFixed(2)}%</span>;
}

export default function History() {
  const [history,   setHistory]  = useState([]);
  const [loading,   setLoading]  = useState(true);
  const [deleteId,  setDeleteId] = useState(null);
  const [sel,       setSel]      = useState(null);
  const [likes,     setLikes]    = useState("");
  const [comments,  setComments] = useState("");
  const [shares,    setShares]   = useState("");
  const [sub,       setSub]      = useState(false);
  const [fbk,       setFbk]      = useState("");
  const [filter,    setFilter]   = useState("all");

  const load = () => {
    setLoading(true);
    api.get("/history?limit=80").then(r => setHistory(r.data)).catch(console.error).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const handleDelete = async () => {
    try {
      await api.delete(`/history/${deleteId}`);
      setHistory(prev => prev.filter(item => item.id !== deleteId));
      if (sel === deleteId) setSel(null);
    } catch (err) {
      console.error(err);
    } finally {
      setDeleteId(null);
    }
  };

  const handleSubmit = async (predId) => {
    const l = parseInt(likes)||0, c = parseInt(comments)||0, sh = parseInt(shares)||0;
    if (l+c+sh === 0) { setFbk("Enter at least one metric."); return; }
    setSub(true);
    try {
      const res = await api.post("/actual-result", { prediction_id:predId, likes:l, comments:c, shares:sh });
      setFbk(`Done! Predicted: ${res.data.predicted_er}% · Actual: ${res.data.actual_er}% · Error: ${res.data.error_pct}%`);
      load();
      setLikes(""); setComments(""); setShares("");
    } catch (err) {
      setFbk(err.response?.data?.detail || "Submission failed.");
    } finally {
      setSub(false);
    }
  };

  const platforms = ["all", ...new Set(history.map(h => h.platform))];
  const filtered  = filter === "all" ? history : history.filter(h => h.platform === filter);

  if (loading) return (
    <div style={{ display:"flex", justifyContent:"center", padding:80 }}>
      <span className="spinner" style={{ width:32, height:32 }} />
    </div>
  );

  return (
    <div style={page}>

      {/* ── Custom Delete Modal ── */}
      {deleteId && (
        <div style={{
          position:"fixed", inset:0, background:"rgba(0,0,0,0.45)",
          display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000
        }}>
          <div className="card" style={{
            padding:32, minWidth:320, textAlign:"center",
            boxShadow:"0 8px 32px rgba(0,0,0,0.18)"
          }}>
            <div style={{ fontSize:36, marginBottom:12 }}>🗑️</div>
            <p style={{ fontWeight:700, fontSize:16, marginBottom:6 }}>Delete this record?</p>
            <p style={{ fontSize:13, color:"var(--text-2)", marginBottom:24 }}>This action cannot be undone.</p>
            <div style={{ display:"flex", gap:10, justifyContent:"center" }}>
              <button className="btn btn-secondary" style={{ minWidth:90 }}
                onClick={() => setDeleteId(null)}>Cancel</button>
              <button className="btn btn-primary"
                style={{ minWidth:90, background:"var(--danger)", borderColor:"var(--danger)" }}
                onClick={handleDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:22, flexWrap:"wrap", gap:12 }}>
        <div>
          <h1 style={title}>Prediction History</h1>
          <p style={{ color:"var(--text-2)", fontSize:14 }}>{filtered.length} records · click a row to expand</p>
        </div>
        <div style={{ display:"flex", gap:6 }}>
          {platforms.map(p => (
            <button key={p} className={`btn btn-${filter===p?"primary":"secondary"}`}
              style={{ fontSize:12, padding:"5px 12px", textTransform:"capitalize" }}
              onClick={() => setFilter(p)}>{p}</button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card" style={{ textAlign:"center", padding:60, color:"var(--text-3)" }}>
          No predictions yet. Head to the Analyzer to get started.
        </div>
      ) : (
        <div className="card" style={{ overflow:"hidden" }}>
          <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <thead>
              <tr style={{ background:"var(--surface-2)", borderBottom:"1px solid var(--border)" }}>
                {["Platform","Category","Pred. ER","Actual ER","Error","Confidence","Source","Date",""].map(h => (
                  <th key={h} style={th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(row => (
                <React.Fragment key={row.id}>
                  <tr style={{ ...tr, ...(sel===row.id?trSel:{}) }}
                    onClick={() => { setSel(sel===row.id?null:row.id); setFbk(""); setLikes(""); setComments(""); setShares(""); }}>
                    <td style={td}>
                      <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                        <span style={{ width:7, height:7, borderRadius:"50%", background:PC[row.platform]||"#ccc" }} />
                        <span style={{ textTransform:"capitalize", fontWeight:500 }}>{row.platform}</span>
                      </div>
                    </td>
                    <td style={td}><span style={{ fontSize:12, color:"var(--text-2)" }}>{row.detected_category||"—"}</span></td>
                    <td style={td}><ERBadge er={row.engagement_rate} /></td>
                    <td style={td}><ERBadge er={row.actual_er} /></td>
                    <td style={td}>
                      {row.error_pct != null
                        ? <span className={`badge badge-${row.error_pct<20?"green":row.error_pct<40?"yellow":"red"}`}>
                            {row.error_pct.toFixed(1)}%</span>
                        : <span style={{ fontSize:12, color:"var(--text-3)" }}>—</span>}
                    </td>
                    <td style={td}>
                      <span className={`badge badge-${row.confidence>=0.8?"green":row.confidence>=0.6?"yellow":"red"}`}>
                        {Math.round(row.confidence*100)}%</span>
                    </td>
                    <td style={td}><span style={{ fontSize:11, color:"var(--text-3)" }}>{row.text_source||"—"}</span></td>
                    <td style={td}><span style={{ fontSize:12, color:"var(--text-2)" }}>{new Date(row.created_at).toLocaleDateString()}</span></td>
                    <td style={td}>
                      <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                        {row.actual_er == null
                          ? <button className="btn btn-secondary" style={{ fontSize:11, padding:"3px 10px" }}
                              onClick={e=>{e.stopPropagation();setSel(row.id);}}>Log</button>
                          : <span style={{ fontSize:12, color:"var(--text-3)" }}>✓</span>}
                        <button className="btn btn-secondary"
                          style={{ fontSize:11, padding:"3px 10px", color:"var(--danger)", borderColor:"var(--danger)" }}
                          onClick={e=>{e.stopPropagation();setDeleteId(row.id);}}>Delete</button>
                      </div>
                    </td>
                  </tr>

                  {sel === row.id && (
                    <tr><td colSpan={9} style={{ padding:0 }}>
                      <div style={{ display:"flex", gap:20, padding:"16px 18px",
                        background:"var(--surface-2)", borderBottom:"1px solid var(--border)" }}>
                        <div style={{ flex:1 }}>
                          <div style={{ fontWeight:600, fontSize:13, marginBottom:10 }}>Input Details</div>
                          <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                            {Object.entries(row.inputs||{}).map(([k,v])=>
                              v!==""&&v!=null?(
                                <div key={k} style={{ background:"var(--surface)", border:"1px solid var(--border)",
                                  borderRadius:6, padding:"3px 8px", fontSize:11 }}>
                                  <span style={{ color:"var(--text-3)" }}>{k.replace(/_/g," ")}: </span>
                                  <span style={{ fontWeight:600 }}>{String(v).slice(0,50)}</span>
                                </div>
                              ):null
                            )}
                          </div>
                          {row.language_warning && (
                            <div style={{ marginTop:8, fontSize:12, color:"#c2410c" }}>⚠️ {row.language_warning}</div>
                          )}
                          <div style={{ marginTop:8, fontSize:12, color:"var(--text-2)", lineHeight:1.7 }}>
                            📅 {row.seasonal_reason}<br/>
                            🔥 {row.trend_label}
                          </div>
                        </div>

                        {row.actual_er == null && (
                          <div style={{ minWidth:310, borderLeft:"1px solid var(--border)", paddingLeft:20 }}>
                            <div style={{ fontWeight:600, fontSize:13, marginBottom:6 }}>Log Actual Performance</div>
                            <p style={{ fontSize:12, color:"var(--text-2)", marginBottom:12, lineHeight:1.6 }}>
                              Enter your post's actual metrics.<br/>
                              <b>ER = (Likes + Comments + Shares) ÷ Followers × 100</b>
                            </p>
                            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginBottom:10 }}>
                              {[["Likes",likes,setLikes],["Comments",comments,setComments],["Shares",shares,setShares]].map(([label,val,setter])=>(
                                <div className="form-group" key={label}>
                                  <label className="form-label" style={{ fontSize:11 }}>{label}</label>
                                  <input className="form-input" type="number" min={0} placeholder="0"
                                    value={val} onChange={e=>setter(e.target.value)} style={{ fontSize:12 }} />
                                </div>
                              ))}
                            </div>
                            <button className="btn btn-primary" style={{ width:"100%", justifyContent:"center", height:36, fontSize:13 }}
                              disabled={sub} onClick={()=>handleSubmit(row.id)}>
                              {sub?<span className="spinner" style={{ borderTopColor:"#fff",width:14,height:14 }}/>:"Calculate & Save"}
                            </button>
                            {fbk && <div style={{ marginTop:8, fontSize:12,
                              color:fbk.startsWith("Done")?"var(--success)":"var(--danger)" }}>{fbk}</div>}
                          </div>
                        )}

                        {row.actual_er != null && (
                          <div style={{ minWidth:240, borderLeft:"1px solid var(--border)", paddingLeft:20 }}>
                            <div style={{ fontWeight:600, fontSize:13, marginBottom:10 }}>Actual Performance Logged</div>
                            {[["Predicted ER", `${row.engagement_rate}%`],
                              ["Actual ER",    `${row.actual_er}%`],
                              ["Prediction Error", `${row.error_pct}%`],
                              ["Likes",    row.actual_likes    ?? "—"],
                              ["Comments", row.actual_comments ?? "—"],
                              ["Shares",   row.actual_shares   ?? "—"],
                            ].map(([k,v])=>(
                              <div key={k} style={{ display:"flex", justifyContent:"space-between",
                                fontSize:13, padding:"5px 0", borderBottom:"1px solid var(--border)" }}>
                                <span style={{ color:"var(--text-2)" }}>{k}</span>
                                <span style={{ fontWeight:600 }}>{v}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </td></tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const page  = { maxWidth:1200, margin:"0 auto", padding:"32px 24px" };
const title = { fontSize:22, fontWeight:700, letterSpacing:"-0.4px", marginBottom:4 };
const th    = { padding:"10px 14px", textAlign:"left", fontSize:11, fontWeight:700,
  color:"var(--text-3)", whiteSpace:"nowrap", textTransform:"uppercase", letterSpacing:"0.4px" };
const tr    = { borderBottom:"1px solid var(--border)", cursor:"pointer", transition:"background 0.1s" };
const trSel = { background:"var(--accent-light)" };
const td    = { padding:"10px 14px", fontSize:13 };