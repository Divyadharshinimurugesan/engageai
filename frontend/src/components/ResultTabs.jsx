import React, { useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from "recharts";

const TABS = ["Overview","Content Insights","Factors","Suggestions","Simulation","Post Mode","Model Info"];
const tt   = { background:"var(--surface)", border:"1px solid var(--border)", borderRadius:8, fontSize:12 };

export default function ResultTabs({ result, platform }) {
  const [tab, setTab] = useState("Overview");
  return (
    <div className="card">
      <div style={s.tabBar}>
        {TABS.map(t => (
          <button key={t} style={{ ...s.tab, ...(tab === t ? s.tabOn : {}) }} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>
      <div style={{ padding: 28 }}>
        {tab === "Overview"          && <OverviewTab       result={result} platform={platform} />}
        {tab === "Content Insights"  && <ContentTab        result={result} />}
        {tab === "Factors"           && <FactorsTab         result={result} />}
        {tab === "Suggestions"       && <SuggestionsTab     result={result} />}
        {tab === "Simulation"        && <SimulationTab      result={result} />}
        {tab === "Post Mode"         && <PostModeTab        result={result} />}
        {tab === "Model Info"        && <ModelTab           result={result} />}
      </div>
    </div>
  );
}

// ── ER Gauge ─────────────────────────────────────────────────────────────────
function ERGauge({ value }) {
  const pct   = Math.min(value, 100);
  const color = pct >= 10 ? "var(--success)" : pct >= 6 ? "#22c55e" : pct >= 3 ? "var(--warning)" : "var(--danger)";

  // Realistic scale: 0–25% ER maps to full 180° arc
  const MAX_ER   = 25;
  const arcFill  = Math.min(pct / MAX_ER, 1); // 0.0 → 1.0
  const cx = 90, cy = 84, r = 68;
  const startDeg = -90;
  const endDeg   = startDeg + arcFill * 180;
  const toRad    = (deg) => (deg - 90) * Math.PI / 180;
  const x1 = cx + r * Math.cos(toRad(startDeg));
  const y1 = cy + r * Math.sin(toRad(startDeg));
  const x2 = cx + r * Math.cos(toRad(endDeg));
  const y2 = cy + r * Math.sin(toRad(endDeg));
  const large = endDeg - startDeg > 180 ? 1 : 0;

  // Zone markers at 6% and 10% on the arc
  const marker = (erVal) => {
    const f   = Math.min(erVal / MAX_ER, 1);
    const deg = startDeg + f * 180;
    const mx  = cx + (r + 2) * Math.cos(toRad(deg));
    const my  = cy + (r + 2) * Math.sin(toRad(deg));
    return { mx, my };
  };
  const m3 = marker(6);
  const m6 = marker(10);

  return (
    <svg width={180} height={115} viewBox="0 0 180 115">
      {/* Track */}
      <path d={`M ${cx-r} ${cy} A ${r} ${r} 0 0 1 ${cx+r} ${cy}`}
        fill="none" stroke="var(--border)" strokeWidth={10} strokeLinecap="round" />
      {/* Filled arc */}
      {arcFill > 0.01 && (
        <path d={`M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`}
          fill="none" stroke={color} strokeWidth={10} strokeLinecap="round" />
      )}
      {/* Zone tick marks */}
      <circle cx={m3.mx} cy={m3.my} r={3} fill="var(--warning)" opacity={0.7} />
      <circle cx={m6.mx} cy={m6.my} r={3} fill="var(--success)" opacity={0.7} />
      {/* Zone labels */}
      <text x={cx - r - 4} y={cy + 16} textAnchor="middle" fontSize={9} fill="var(--danger)">0%</text>
      <text x={cx + r + 4} y={cy + 16} textAnchor="middle" fontSize={9} fill="var(--success)">25%+</text>
      {/* Value */}
      <text x={cx} y={cy + 8} textAnchor="middle" fontSize={22} fontWeight={800}
        fill={color} fontFamily="'DM Mono',monospace">{pct.toFixed(2)}%</text>
      <text x={cx} y={cy + 22} textAnchor="middle" fontSize={10} fill="var(--text-3)">
        Engagement Rate
      </text>
    </svg>
  );
}

// ── Overview ──────────────────────────────────────────────────────────────────
function OverviewTab({ result, platform }) {
  const er   = result.engagement_rate   ?? 0;
  const raw  = result.raw_engagement_rate ?? 0;
  const conf = Math.round(result.confidence * 100);
  const est  = result.estimated_engagement ?? 0;

  return (
    <div>
      {/* Language warning — Step 17 */}
      {result.language_warning && (
        <div style={{ background:"#fff7ed", border:"1px solid #fed7aa", borderRadius:8,
          padding:"10px 14px", fontSize:13, color:"#c2410c", marginBottom:16, display:"flex", gap:8 }}>
          ⚠️ {result.language_warning}
        </div>
      )}

      <div style={{ display:"flex", gap:28, flexWrap:"wrap", alignItems:"flex-start" }}>
        {/* Gauge */}
        <div style={{ textAlign:"center", minWidth:180 }}>
          <ERGauge value={er} />
          <div style={{ fontSize:11, color:"var(--text-3)", marginTop:4 }}>
            Raw (no trend boost): {raw}%
          </div>
          <div style={{ fontSize:11, color:"var(--text-3)" }}>
            Est. interactions: ~{est.toLocaleString()}
          </div>
          {/* Text source badge — Step 4 */}
          <div style={{ marginTop:8 }}>
            <span className={`badge badge-${result.transcript_used ? "blue" : "gray"}`} style={{ fontSize:11 }}>
              {result.transcript_used ? "🎙 Transcript used" : `✍ ${result.text_source}`}
            </span>
          </div>
          <div style={{ marginTop:4, fontSize:11, color:"var(--text-3)" }}>
            Analysis based on: {result.text_source}
          </div>
        </div>

        {/* Meta grid */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, flex:1, minWidth:240 }}>
          <MetaBox label="Confidence"
            value={`${conf}%`}
            color={conf>=80?"var(--success)":conf>=60?"var(--warning)":"var(--danger)"} />
          <MetaBox label="Platform"
            value={platform.charAt(0).toUpperCase()+platform.slice(1)} />
          <MetaBox label="Seasonal ×"
            value={result.seasonal?.boost?.toFixed(3)}
            sub={result.seasonal?.aligned ? "Aligned ✓" : "Misaligned ✗"}
            color={result.seasonal?.aligned ? "var(--success)" : "var(--warning)"} />
          <MetaBox label="Trend Boost"
            value={`+${(result.trend?.boost*100).toFixed(0)}%`}
            sub={result.trend?.category}
            color="var(--accent)" />
        </div>
      </div>

      {/* Banners — Steps 7 & 8 */}
      <div style={{ display:"flex", gap:12, marginTop:20, flexWrap:"wrap" }}>
        <Banner icon="📅" color="#6366f1"
          title={result.seasonal?.label}
          text={result.seasonal?.reason} />
        <Banner icon="🔥" color="#f59e0b"
          title="Trend Signal"
          text={result.trend?.explanation} />
      </div>

      {/* ER benchmark */}
      <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginTop:18 }}>
        {[
          { r:"< 3%",  l:"Low",       c:"var(--danger)"  },
          { r:"3–6%",  l:"Average",   c:"var(--warning)" },
          { r:"6–10%", l:"Good",      c:"#22c55e"        },
          { r:"> 10%", l:"Excellent", c:"var(--success)" },
        ].map(b => (
          <div key={b.r} style={{ display:"flex", alignItems:"center", gap:6, fontSize:12, color:"var(--text-2)" }}>
            <span style={{ width:9, height:9, borderRadius:"50%", background:b.c, display:"inline-block" }} />
            <b style={{ color:b.c }}>{b.r}</b> {b.l}
          </div>
        ))}
      </div>
    </div>
  );
}

function MetaBox({ label, value, sub, color }) {
  return (
    <div style={{ background:"var(--surface-2)", borderRadius:8, padding:"11px 14px" }}>
      <div style={{ fontSize:11, color:"var(--text-3)", fontWeight:500, marginBottom:3 }}>{label}</div>
      <div style={{ fontSize:17, fontWeight:700, color:color||"var(--text)" }} className="mono">{value}</div>
      {sub && <div style={{ fontSize:11, color:"var(--text-3)", marginTop:2 }}>{sub}</div>}
    </div>
  );
}

function Banner({ icon, title, text, color }) {
  return (
    <div style={{ flex:1, minWidth:240, background:`${color}08`, border:`1px solid ${color}22`,
      borderRadius:9, padding:"11px 14px", display:"flex", gap:10 }}>
      <span style={{ fontSize:18 }}>{icon}</span>
      <div>
        <div style={{ fontWeight:600, fontSize:12, color, marginBottom:2 }}>{title}</div>
        <div style={{ fontSize:12, color:"var(--text-2)", lineHeight:1.5 }}>{text}</div>
      </div>
    </div>
  );
}

// ── Content Insights — Steps 5, 17 ───────────────────────────────────────────
function ContentTab({ result }) {
  const nlp  = result.nlp || {};
  const sent = nlp.sentiment_score   ?? 0;
  const cq   = nlp.content_quality   ?? 0;
  const kb   = nlp.keyword_boost     ?? 0;
  const kws  = nlp.top_keywords      ?? [];

  const sentLabel = sent > 0.1 ? "Positive 😊" : sent < -0.05 ? "Negative 😕" : "Neutral 😐";
  const sentColor = sent > 0.1 ? "var(--success)" : sent < -0.05 ? "var(--danger)" : "var(--warning)";

  const radar = [
    { axis:"Sentiment",    value: Math.round(((sent+1)/2)*100) },
    { axis:"Quality",      value: Math.round(cq*100) },
    { axis:"Keywords",     value: Math.round(Math.max(0, kb/0.30)*100) },
    { axis:"Length",       value: Math.round(Math.min(1, (nlp.preview?.length||0)/100)*100) },
    { axis:"Engagement",   value: Math.round(Math.min(100, result.engagement_rate*8)) },
  ];

  return (
    <div style={{ display:"flex", gap:28, flexWrap:"wrap" }}>
      {/* Radar */}
      <div style={{ flex:1, minWidth:240 }}>
        <h3 style={s.st}>Content Score Radar</h3>
        <p style={s.ss}>Normalised dimensions 0–100</p>
        <div style={{ height:240, marginTop:12 }}>
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radar}>
              <PolarGrid stroke="var(--border)" />
              <PolarAngleAxis dataKey="axis" tick={{ fontSize:11, fill:"var(--text-2)" }} />
              <PolarRadiusAxis domain={[0,100]} tick={false} axisLine={false} />
              <Radar dataKey="value" stroke="var(--accent)" fill="var(--accent)" fillOpacity={0.18} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detail */}
      <div style={{ flex:1, minWidth:240, display:"flex", flexDirection:"column", gap:14 }}>
        <h3 style={s.st}>NLP Analysis</h3>
        <ScoreRow label="Content Quality"  v={cq}               fmt={v=>`${Math.round(v*100)}/100`} color="var(--accent)" />
        <ScoreRow label="Sentiment"        v={(sent+1)/2}       fmt={()=>sentLabel} color={sentColor} />
        <ScoreRow label="Keyword Strength" v={Math.max(0,kb/0.30)} fmt={v=>v>0?`+${(kb*100).toFixed(0)}%`:"No power phrases"} color="var(--success)" />

        {/* Text source & preview */}
        <div style={{ background:"var(--surface-2)", borderRadius:8, padding:"10px 12px", fontSize:12 }}>
          <div style={{ fontWeight:600, marginBottom:4 }}>Analysis based on: {nlp.source}</div>
          {nlp.preview && <div style={{ color:"var(--text-2)", lineHeight:1.5 }}>"{nlp.preview}"</div>}
          {kws.length > 0 && (
            <div style={{ marginTop:8, display:"flex", gap:6, flexWrap:"wrap" }}>
              {kws.map(k => (
                <span key={k} style={{ background:"var(--surface)", border:"1px solid var(--border)",
                  borderRadius:20, padding:"2px 8px", fontSize:11 }}>{k}</span>
              ))}
            </div>
          )}
          <div style={{ marginTop:6, fontSize:11, color:"var(--text-3)" }}>
            Sentiment engine: {nlp.engine}
          </div>
        </div>
      </div>
    </div>
  );
}

function ScoreRow({ label, v, fmt, color }) {
  const pct = Math.min(100, Math.round(v*100));
  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", fontSize:13, marginBottom:5 }}>
        <span style={{ color:"var(--text-2)" }}>{label}</span>
        <span style={{ fontWeight:600, color }}>{fmt(v)}</span>
      </div>
      <div style={{ height:5, background:"var(--border)", borderRadius:3, overflow:"hidden" }}>
        <div style={{ height:"100%", width:`${pct}%`, background:color, borderRadius:3, transition:"width 0.5s" }} />
      </div>
    </div>
  );
}

// ── Factors — Step 14 transparency ───────────────────────────────────────────
function FactorsTab({ result }) {
  const imp    = result.feature_importance || {};
  const sorted = Object.entries(imp).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([k,v])=>({
    name: k.replace(/_/g," ").replace(/\b\w/g,l=>l.toUpperCase()),
    value: parseFloat((v*100).toFixed(1)),
  }));
  const feats = result.features_used || {};

  return (
    <div style={{ display:"flex", gap:24, flexWrap:"wrap" }}>
      <div style={{ flex:2, minWidth:280 }}>
        <h3 style={s.st}>Feature Importance</h3>
        <p style={s.ss}>XGBoost-computed contribution of each feature</p>
        <div style={{ height:280, marginTop:16 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={sorted} layout="vertical" margin={{ left:10, right:24 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
              <XAxis type="number" tick={{ fontSize:11, fill:"var(--text-3)" }} tickFormatter={v=>`${v}%`} />
              <YAxis type="category" dataKey="name" tick={{ fontSize:11, fill:"var(--text-2)" }} width={130} />
              <Tooltip formatter={v=>[`${v}%`,"Importance"]} contentStyle={tt} />
              <Bar dataKey="value" fill="var(--accent)" radius={[0,4,4,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div style={{ flex:1, minWidth:200 }}>
        <h3 style={s.st}>Feature Values</h3>
        <p style={s.ss}>Normalised inputs fed to model</p>
        <div style={{ marginTop:12, display:"flex", flexDirection:"column", gap:5 }}>
          {Object.entries(feats).map(([k,v])=>(
            <div key={k} style={{ display:"flex", justifyContent:"space-between",
              fontSize:12, padding:"5px 10px", background:"var(--surface-2)", borderRadius:6 }}>
              <span style={{ color:"var(--text-2)", textTransform:"capitalize" }}>{k.replace(/_/g," ")}</span>
              <span style={{ fontWeight:600 }} className="mono">{typeof v==="number"?v.toFixed(4):v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Suggestions — Step 13 ─────────────────────────────────────────────────────
function SuggestionsTab({ result }) {
  const sugg = result.suggestions || [];
  const IC   = { high:"var(--danger)", medium:"var(--warning)", low:"var(--success)" };
  return (
    <div>
      <h3 style={s.st}>Performance Suggestions</h3>
      <p style={s.ss}>Specific actions to improve your engagement rate</p>
      {sugg.length === 0 ? (
        <div style={{ textAlign:"center", padding:48, color:"var(--text-3)" }}>
          Your setup looks well-optimised — no major suggestions.
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:12, marginTop:20 }}>
          {sugg.map((sg,i) => (
            <div key={i} style={{ display:"flex", gap:14, padding:"13px 16px",
              border:"1px solid var(--border)", borderRadius:9, alignItems:"flex-start" }}>
              <span style={{ width:9, height:9, borderRadius:"50%", marginTop:4, flexShrink:0,
                background:IC[sg.impact] }} />
              <div style={{ flex:1 }}>
                <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:4 }}>
                  <span style={{ fontWeight:600, fontSize:14 }}>{sg.factor}</span>
                  <span className={`badge badge-${sg.impact==="high"?"red":sg.impact==="medium"?"yellow":"green"}`}>
                    {sg.impact} impact
                  </span>
                </div>
                <p style={{ fontSize:13, color:"var(--text-2)", lineHeight:1.6 }}>{sg.message}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Simulation — posting time ─────────────────────────────────────────────────
function SimulationTab({ result }) {
  const sim  = result.simulation || [];
  const best = [...sim].sort((a,b)=>b.engagement_rate-a.engagement_rate).slice(0,3);
  return (
    <div>
      <h3 style={s.st}>Posting Time Simulation</h3>
      <p style={s.ss}>Estimated engagement rate (%) at each posting hour — all other inputs held constant</p>
      <div style={{ height:270, marginTop:20 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={sim} margin={{ left:0, right:16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="hour" tick={{ fontSize:10, fill:"var(--text-3)" }}
              tickFormatter={h=>`${h}:00`} interval={2} />
            <YAxis tick={{ fontSize:11, fill:"var(--text-3)" }} tickFormatter={v=>`${v}%`} />
            <Tooltip formatter={v=>[`${v}%`,"Est. ER"]} labelFormatter={h=>`${h}:00`} contentStyle={tt} />
            <Line type="monotone" dataKey="engagement_rate"
              stroke="var(--accent)" strokeWidth={2} dot={false} activeDot={{ r:5 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div style={{ marginTop:14 }}>
        <div style={{ fontSize:13, fontWeight:600, marginBottom:10 }}>Best 3 posting times:</div>
        <div style={{ display:"flex", gap:10 }}>
          {best.map((h,i) => (
            <div key={h.hour} style={{ background:i===0?"var(--accent-light)":"var(--surface-2)",
              border:i===0?"1px solid var(--accent)":"1px solid var(--border)",
              borderRadius:9, padding:"11px 18px", textAlign:"center" }}>
              <div style={{ fontWeight:700, fontSize:16, color:i===0?"var(--accent)":"var(--text)" }}>
                {h.hour}:00
              </div>
              <div style={{ fontSize:12, color:"var(--text-2)", marginTop:2 }}>
                {h.engagement_rate}% ER
              </div>
              {i===0 && <div style={{ fontSize:11, color:"var(--accent)", marginTop:2 }}>Best</div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Post Mode — Step 18 ───────────────────────────────────────────────────────
function PostModeTab({ result }) {
  const [likes,    setLikes]    = useState("");
  const [comments, setComments] = useState("");
  const [shares,   setShares]   = useState("");
  const [actRes,   setActRes]   = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [err,      setErr]      = useState("");

  const followers = result.followers || 1;

  const calc = () => {
    const l = parseInt(likes)    || 0;
    const c = parseInt(comments) || 0;
    const sh= parseInt(shares)   || 0;
    const total = l + c + sh;
    if (total === 0) { setErr("Enter at least one metric."); return; }
    setErr("");
    const actual_er = Math.min((total / followers) * 100, 100);
    const predicted  = result.engagement_rate;
    const error_pct  = Math.abs(predicted - actual_er) / Math.max(actual_er, 0.01) * 100;
    setActRes({ actual_er: actual_er.toFixed(2), predicted, error_pct: error_pct.toFixed(1), total });
    setLoading(false);
  };

  return (
    <div>
      <h3 style={s.st}>Post Performance Comparison</h3>
      <p style={s.ss}>Enter your actual post metrics to compare predicted vs actual engagement rate</p>

      <div style={{ background:"var(--surface-2)", borderRadius:10, padding:"18px 20px", marginTop:20 }}>
        <div style={{ fontSize:13, marginBottom:14, color:"var(--text-2)" }}>
          <strong style={{ color:"var(--text)" }}>Formula:</strong> Actual ER = (Likes + Comments + Shares) ÷ {followers.toLocaleString()} followers × 100
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, marginBottom:14 }}>
          {[
            { label:"Likes",    val:likes,    set:setLikes },
            { label:"Comments", val:comments, set:setComments },
            { label:"Shares",   val:shares,   set:setShares },
          ].map(({ label, val, set: setter }) => (
            <div className="form-group" key={label}>
              <label className="form-label">{label}</label>
              <input className="form-input" type="number" min={0} placeholder="0"
                value={val} onChange={e => setter(e.target.value)} />
            </div>
          ))}
        </div>
        {err && <div style={{ fontSize:12, color:"var(--danger)", marginBottom:8 }}>{err}</div>}
        <button className="btn btn-primary" onClick={calc} style={{ height:38 }}>
          Calculate Actual ER
        </button>
      </div>

      {actRes && (
        <div style={{ marginTop:20, display:"flex", gap:16, flexWrap:"wrap" }} className="fade-in">
          <CompCard label="Predicted ER"   value={`${actRes.predicted}%`}  color="var(--accent)" />
          <CompCard label="Actual ER"      value={`${actRes.actual_er}%`}  color="var(--success)" />
          <CompCard label="Total Interactions" value={actRes.total.toLocaleString()} color="var(--text)" />
          <CompCard label="Prediction Error"
            value={`${actRes.error_pct}%`}
            color={parseFloat(actRes.error_pct) < 20 ? "var(--success)" : "var(--warning)"} />
        </div>
      )}

      <div style={{ marginTop:20, fontSize:12, color:"var(--text-3)", lineHeight:1.6 }}>
        Tip: Save these results in History by submitting your likes, comments, and shares after posting.
      </div>
    </div>
  );
}

function CompCard({ label, value, color }) {
  return (
    <div style={{ flex:1, minWidth:140, padding:"16px 18px",
      border:"1px solid var(--border)", borderRadius:9, textAlign:"center" }}>
      <div style={{ fontSize:11, color:"var(--text-3)", fontWeight:500, marginBottom:6, textTransform:"uppercase", letterSpacing:"0.4px" }}>{label}</div>
      <div style={{ fontSize:22, fontWeight:800, color }} className="mono">{value}</div>
    </div>
  );
}

// ── Model Info ────────────────────────────────────────────────────────────────
function ModelTab({ result }) {
  const m = result.model_metrics || {};
  return (
    <div>
      <h3 style={s.st}>Model Performance Metrics</h3>
      <p style={s.ss}>XGBoost evaluation on held-out 15% test set · Trained on 15,000 synthetic records</p>
      <div style={{ display:"flex", gap:14, marginTop:20, flexWrap:"wrap" }}>
        {[
          { label:"R² Score", value: m.r2!=null?m.r2.toFixed(4):"—",
            desc:"Variance explained (1.0 = perfect)", good:m.r2>0.65 },
          { label:"MAE",  value: m.mae!=null?`${m.mae.toFixed(3)}%`:"—",
            desc:"Mean absolute error in predicted ER %", good:true },
          { label:"RMSE", value: m.rmse!=null?`${m.rmse.toFixed(3)}%`:"—",
            desc:"Root mean squared error", good:true },
        ].map(c => (
          <div key={c.label} style={{ flex:1, minWidth:160, padding:"16px 18px",
            border:"1px solid var(--border)", borderRadius:9 }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
              <span style={{ fontSize:11, color:"var(--text-3)", fontWeight:600 }}>{c.label}</span>
              <span className={`badge badge-${c.good?"green":"yellow"}`}>Good</span>
            </div>
            <div style={{ fontSize:24, fontWeight:800, letterSpacing:"-0.5px" }} className="mono">{c.value}</div>
            <div style={{ fontSize:11, color:"var(--text-3)", marginTop:4 }}>{c.desc}</div>
          </div>
        ))}
      </div>
      <div style={{ marginTop:20, padding:"14px 18px", background:"var(--surface-2)", borderRadius:9,
        fontSize:13, color:"var(--text-2)", lineHeight:1.7 }}>
        <strong style={{ color:"var(--text)" }}>Architecture: </strong>
        XGBRegressor — n_estimators=300, learning_rate=0.05, max_depth=5, subsample=0.8.
        Target: Engagement Rate (%). Features: log-scaled follower count, time-of-day score,
        hashtag efficiency, NLP content quality, sentiment polarity, category multiplier,
        media-type multiplier, seasonal boost, video length, thumbnail quality, temporal (hour/day/month).
        Seasonal and trend boosts are rule-based multipliers applied to model output for full explainability.
      </div>
    </div>
  );
}

// ── Shared styles ─────────────────────────────────────────────────────────────
const s = {
  tabBar: { display:"flex", borderBottom:"1px solid var(--border)", padding:"0 24px", gap:1, overflowX:"auto" },
  tab: {
    padding:"13px 13px", background:"none", border:"none",
    borderBottom:"2px solid transparent", cursor:"pointer",
    fontFamily:"inherit", fontSize:13, fontWeight:500,
    color:"var(--text-2)", transition:"all 0.12s", whiteSpace:"nowrap",
  },
  tabOn: { color:"var(--accent)", borderBottom:"2px solid var(--accent)" },
  st:    { fontSize:15, fontWeight:600, letterSpacing:"-0.2px" },
  ss:    { fontSize:13, color:"var(--text-2)", marginTop:4 },
};