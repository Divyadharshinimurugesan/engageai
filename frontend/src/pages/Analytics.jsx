import React, { useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, ScatterChart, Scatter,
  ReferenceLine, Cell,
} from "recharts";
import api from "../utils/api";

const tt  = { background:"var(--surface)", border:"1px solid var(--border)", borderRadius:8, fontSize:12 };
const PC  = { instagram:"#e1306c", youtube:"#ff0000", twitter:"#1da1f2" };
const CAT_COLORS = ["#6366f1","#f59e0b","#10b981","#ef4444","#3b82f6","#8b5cf6","#ec4899","#14b8a6"];

export default function Analytics() {
  const [data, setData]   = useState(null);
  const [load, setLoad]   = useState(true);

  useEffect(() => {
    api.get("/analytics").then(r=>setData(r.data)).catch(console.error).finally(()=>setLoad(false));
  }, []);

  if (load) return <div style={{ display:"flex", justifyContent:"center", padding:80 }}><span className="spinner" style={{ width:32,height:32 }}/></div>;

  const platBar = Object.entries(data?.platform_avg_er||{}).map(([p,er])=>({
    platform: p.charAt(0).toUpperCase()+p.slice(1), er, fill:PC[p]||"var(--accent)"
  }));
  const catBar = Object.entries(data?.category_counts||{}).map(([cat,count],i)=>({
    category:cat, count, fill:CAT_COLORS[i%CAT_COLORS.length]
  }));
  const scatter = (data?.actual_records||[]).map(r=>({
    predicted_er: parseFloat(r.predicted_er?.toFixed(2)),
    actual_er:    parseFloat(r.actual_er?.toFixed(2)),
  }));
  const errTrend = (data?.actual_records||[]).slice(-15).map((r,i)=>({
    index:i+1, error_pct:parseFloat(r.error_pct?.toFixed(1))
  }));

  const globalER = () => {
    const v = Object.values(data?.platform_avg_er||{});
    return v.length ? (v.reduce((a,b)=>a+b,0)/v.length).toFixed(2) : null;
  };

  return (
    <div style={page}>
      <div style={{ marginBottom:24 }}>
        <h1 style={title}>Analytics</h1>
        <p style={{ color:"var(--text-2)", fontSize:14 }}>Engagement rate insights and prediction accuracy</p>
      </div>

      {/* Summary — Step 11: only show avg_error if real data exists */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:16, marginBottom:20 }}>
        {[
          { label:"Total Analyses",   value: data?.total_predictions ?? 0 },
          { label:"Overall Avg ER",   value: globalER() ? `${globalER()}%` : "—" },
          { label:"Results Logged",   value: data?.actual_records?.length ?? 0 },
          { label:"Avg Prediction Error",
            value: data?.avg_error_pct != null ? `${data.avg_error_pct}%` : "No data yet",
            small: data?.avg_error_pct == null },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding:"16px 20px" }}>
            <div style={{ fontSize:11, color:"var(--text-3)", fontWeight:600,
              textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:6 }}>{s.label}</div>
            <div style={{ fontSize:s.small?14:24, fontWeight:700,
              letterSpacing:"-0.5px", color:s.small?"var(--text-3)":undefined }} className="mono">
              {s.value}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display:"flex", gap:16, marginBottom:20, flexWrap:"wrap" }}>
        {/* Platform ER — Step 12 normalised */}
        <div className="card" style={{ flex:1, padding:22 }}>
          <h3 style={st}>Avg Engagement Rate by Platform</h3>
          <p style={ss}>Normalised (%) — directly comparable</p>
          {platBar.length > 0 ? (
            <div style={{ height:200, marginTop:14 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={platBar}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="platform" tick={{ fontSize:12, fill:"var(--text-2)" }} />
                  <YAxis tick={{ fontSize:11, fill:"var(--text-3)" }} tickFormatter={v=>`${v}%`} />
                  <Tooltip formatter={v=>[`${v}%`,"Avg ER"]} contentStyle={tt} />
                  <Bar dataKey="er" radius={[4,4,0,0]}>
                    {platBar.map((d,i)=><Cell key={i} fill={d.fill}/>)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : <Empty/>}
        </div>

        {/* Weekly */}
        <div className="card" style={{ flex:1.2, padding:22 }}>
          <h3 style={st}>Weekly Activity</h3>
          <p style={ss}>Analyses run per day (last 7 days)</p>
          <div style={{ height:200, marginTop:14 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.weekly_activity||[]}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" tick={{ fontSize:11, fill:"var(--text-3)" }} />
                <YAxis tick={{ fontSize:11, fill:"var(--text-3)" }} />
                <Tooltip contentStyle={tt} />
                <Bar dataKey="count" fill="var(--accent)" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Category */}
      {catBar.length > 0 && (
        <div className="card" style={{ padding:22, marginBottom:20 }}>
          <h3 style={st}>Analyses by Content Category</h3>
          <p style={ss}>How often each category was analysed</p>
          <div style={{ height:180, marginTop:14 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={catBar}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="category" tick={{ fontSize:11, fill:"var(--text-2)" }} />
                <YAxis tick={{ fontSize:11, fill:"var(--text-3)" }} />
                <Tooltip contentStyle={tt} />
                <Bar dataKey="count" radius={[4,4,0,0]}>
                  {catBar.map((d,i)=><Cell key={i} fill={d.fill}/>)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Predicted vs Actual scatter */}
      {scatter.length > 0 && (
        <div className="card" style={{ padding:22, marginBottom:20 }}>
          <h3 style={st}>Predicted vs Actual Engagement Rate (%)</h3>
          <p style={ss}>Points near the diagonal indicate accurate predictions</p>
          <div style={{ height:260, marginTop:14 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ left:10, right:10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="predicted_er" name="Predicted ER"
                  tick={{ fontSize:11, fill:"var(--text-3)" }} tickFormatter={v=>`${v}%`}
                  label={{ value:"Predicted ER (%)", position:"insideBottom", offset:-2, fontSize:11 }} />
                <YAxis dataKey="actual_er" name="Actual ER"
                  tick={{ fontSize:11, fill:"var(--text-3)" }} tickFormatter={v=>`${v}%`} />
                <Tooltip contentStyle={tt} formatter={(v,n)=>[`${v}%`,n]} />
                <Scatter data={scatter} fill="var(--accent)" opacity={0.75} />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Error trend */}
      {errTrend.length > 0 && (
        <div className="card" style={{ padding:22 }}>
          <h3 style={st}>Prediction Error Trend</h3>
          <p style={ss}>Error % over recent submissions — lower is better</p>
          <div style={{ height:220, marginTop:14 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={errTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="index" tick={{ fontSize:11, fill:"var(--text-3)" }} />
                <YAxis tick={{ fontSize:11, fill:"var(--text-3)" }} tickFormatter={v=>`${v}%`} />
                <Tooltip formatter={v=>[`${v}%`,"Error"]} contentStyle={tt} />
                <ReferenceLine y={20} stroke="var(--success)" strokeDasharray="4 4"
                  label={{ value:"20% target", fontSize:10, fill:"var(--success)" }} />
                <Line type="monotone" dataKey="error_pct" stroke="var(--warning)"
                  strokeWidth={2} dot={{ r:4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div style={{ fontSize:12, color:"var(--text-3)", marginTop:8 }}>
            Log actual results in History to populate accuracy charts.
          </div>
        </div>
      )}

      {!data?.actual_records?.length && (
        <div className="card" style={{ textAlign:"center", padding:40, color:"var(--text-3)", marginTop:8 }}>
          Submit actual engagement from the History page to see accuracy analytics here.
        </div>
      )}
    </div>
  );
}

function Empty() { return <div style={{ textAlign:"center", color:"var(--text-3)", padding:36, fontSize:13 }}>No data yet</div>; }

const page  = { maxWidth:1200, margin:"0 auto", padding:"32px 24px" };
const title = { fontSize:22, fontWeight:700, letterSpacing:"-0.4px", marginBottom:4 };
const st    = { fontSize:15, fontWeight:600, letterSpacing:"-0.2px" };
const ss    = { fontSize:13, color:"var(--text-2)", marginTop:4 };
