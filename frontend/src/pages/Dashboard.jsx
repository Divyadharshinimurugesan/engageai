import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import api from "../utils/api";

const PC = { instagram: "#e1306c", youtube: "#ff0000", twitter: "#1da1f2" };

// ─────────────────────────────────────────────────────────────────────────────
// SEASONAL BANNER DATA
// Mirrors the same month-based logic as backend/predictor.py seasonal_analysis()
// so the banner is always consistent with what the model actually applies.
// ─────────────────────────────────────────────────────────────────────────────
const SEASONAL_BANNERS = {
  1: {
    icon: "🎉",
    title: "New Year & Pongal Season — Trending Now!",
    desc: "January brings New Year energy and Pongal/Makar Sankranti celebrations. Goal-setting, harvest, and festive content sees a strong engagement boost.",
    boost: "×1.18",
    tags: ["New Year resolution tips", "Pongal celebration ideas", "Harvest festival recipes", "Makar Sankranti kite photos", "January fitness goals"],
    color: "#f59e0b",
    bg: "#fffbeb",
    border: "#fde68a",
  },
  2: {
    icon: "💝",
    title: "Valentine's Season — Romance Content Peaks!",
    desc: "February drives lifestyle, gifting, and romance content. Valentine's Day posts with love and couple themes receive a significant engagement boost.",
    boost: "×1.15",
    tags: ["Valentine gift ideas", "Couple photo ideas", "Love letter templates", "Heart-shaped recipes", "Date night plans"],
    color: "#ec4899",
    bg: "#fdf2f8",
    border: "#fbcfe8",
  },
  3: {
    icon: "🌈",
    title: "Holi & Spring Season — Trending Now!",
    desc: "March celebrates Holi and the arrival of spring. Colorful, festive, and outdoor content performs strongly in this month.",
    boost: "×1.20",
    tags: ["Holi color ideas", "Spring outfit lookbook", "Gulal photography tips", "Holi special recipes", "Festival celebration reels"],
    color: "#8b5cf6",
    bg: "#f5f3ff",
    border: "#ddd6fe",
  },
  4: {
    icon: "☀️",
    title: "Summer, IPL & Financial Year Start — Trending Now!",
    desc: "April brings summer heat, IPL cricket excitement, exam season, and the new financial year. Education, productivity, finance, and sports content all perform strongly this month.",
    boost: "×1.10",
    tags: ["Summer skincare routine", "IPL match highlights", "Exam preparation tips", "New financial year planning", "Summer travel destinations"],
    color: "#f97316",
    bg: "#fff7ed",
    border: "#fed7aa",
  },
  5: {
    icon: "☀️",
    title: "Pre-Summer Season — Travel & Fashion Peak!",
    desc: "May is peak season for travel planning, summer fashion, and fitness content. Audiences are actively seeking lifestyle inspiration before summer.",
    boost: "×1.12",
    tags: ["Summer travel packing tips", "Summer outfit haul", "Summer fitness routine", "Healthy summer recipes", "Hill station travel guide"],
    color: "#f97316",
    bg: "#fff7ed",
    border: "#fed7aa",
  },
  6: {
    icon: "🌧️",
    title: "Monsoon Season — Cozy Content Trending!",
    desc: "June marks the arrival of monsoon. Cozy indoor content, chai recipes, rainy day aesthetics, and comfort food perform well in South Asian markets.",
    boost: "×1.08",
    tags: ["Monsoon chai recipe", "Rainy day aesthetic photos", "Indoor workout ideas", "Comfort food recipes", "Monsoon skincare routine"],
    color: "#3b82f6",
    bg: "#eff6ff",
    border: "#bfdbfe",
  },
  7: {
    icon: "📚",
    title: "Mid-Year — Steady Engagement Month",
    desc: "July is a stable mid-year month. Educational content, productivity tips, and lifestyle posts maintain consistent engagement.",
    boost: "×1.06",
    tags: ["Mid-year goal check-in", "Productivity tips", "Self-improvement content", "Book recommendations", "Skill-building tutorials"],
    color: "#6366f1",
    bg: "#eef2ff",
    border: "#c7d2fe",
  },
  8: {
    icon: "🇮🇳",
    title: "Independence Day — Patriotic Content Peaks!",
    desc: "August 15th drives a major spike in patriotic and inspirational content. Back-to-school content also sees strong engagement this month.",
    boost: "×1.22",
    tags: ["Independence Day tribute", "Patriotic outfit ideas", "India pride reels", "Back to school tips", "Freedom fighter stories"],
    color: "#f97316",
    bg: "#fff7ed",
    border: "#fed7aa",
  },
  9: {
    icon: "🪔",
    title: "Pre-Festive Season — High-Intent Browsing!",
    desc: "September kicks off the festive season. Audiences are actively searching for Navratri, gifting, and celebration content.",
    boost: "×1.12",
    tags: ["Navratri outfit ideas", "Festive home decor", "Gift guide for Dussehra", "Garba dance tutorials", "Festive makeup looks"],
    color: "#f59e0b",
    bg: "#fffbeb",
    border: "#fde68a",
  },
  10: {
    icon: "🏮",
    title: "Navratri & Dussehra — Peak Festive Engagement!",
    desc: "October is one of the highest engagement months. Navratri garba, Dussehra celebrations, and festive content receive major boosts across all platforms.",
    boost: "×1.28",
    tags: ["Navratri garba looks", "Dussehra celebration ideas", "Dandiya night photos", "Festive lehenga outfits", "Durga Puja decoration"],
    color: "#dc2626",
    bg: "#fef2f2",
    border: "#fecaca",
  },
  11: {
    icon: "✨",
    title: "Diwali Month — Highest Engagement of the Year!",
    desc: "November is the #1 engagement month across Indian platforms. Diwali content, festive gifts, home decoration, and celebration posts all see maximum reach.",
    boost: "×1.38",
    tags: ["Diwali home decoration", "Diwali gift ideas", "Rangoli designs", "Diwali outfit ideas", "Diya decoration tutorials"],
    color: "#f59e0b",
    bg: "#fffbeb",
    border: "#fde68a",
  },
  12: {
    icon: "🎄",
    title: "Christmas & Year-End — Celebration Content Peaks!",
    desc: "December drives strong engagement for holiday content, year-end reflections, Christmas celebrations, and New Year countdown posts.",
    boost: "×1.28",
    tags: ["Christmas decoration ideas", "Year-end reflection posts", "New Year countdown plans", "Christmas gift guide", "Holiday party outfits"],
    color: "#10b981",
    bg: "#f0fdf4",
    border: "#bbf7d0",
  },
};

// ── Seasonal Banner Component ─────────────────────────────────────────────────
function SeasonalBanner() {
  const month = new Date().getMonth() + 1; // 1–12
  const info  = SEASONAL_BANNERS[month];
  if (!info) return null;

  return (
    <div style={{
      background:   info.bg,
      border:       `1.5px solid ${info.border}`,
      borderRadius: 12,
      padding:      "16px 20px",
      marginBottom: 20,
      display:      "flex",
      gap:          16,
      alignItems:   "flex-start",
    }}>
      {/* Icon */}
      <div style={{
        width: 40, height: 40, borderRadius: 10, flexShrink: 0,
        background: info.border,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 20,
      }}>
        {info.icon}
      </div>

      {/* Content */}
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4, flexWrap: "wrap" }}>
          <span style={{ fontWeight: 700, fontSize: 14, color: info.color }}>
            {info.title}
          </span>
          <span style={{
            background: info.border, color: info.color,
            fontSize: 11, fontWeight: 700, padding: "2px 8px",
            borderRadius: 20,
          }}>
            Seasonal Boost {info.boost}
          </span>
        </div>
        <p style={{ fontSize: 13, color: "#374151", lineHeight: 1.55, marginBottom: 10 }}>
          {info.desc}
        </p>
        {/* Suggestion tags */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {info.tags.map(tag => (
            <span key={tag} style={{
              background:   "white",
              border:       `1px solid ${info.border}`,
              borderRadius: 20,
              padding:      "3px 10px",
              fontSize:     12,
              color:        "#374151",
              cursor:       "default",
            }}>
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Helper components ─────────────────────────────────────────────────────────
function Stat({ label, value, sub, color }) {
  return (
    <div className="card" style={{ padding: "18px 22px" }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)",
        textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ fontSize: 26, fontWeight: 800, color: color || "var(--text)",
        letterSpacing: "-0.5px" }} className="mono">
        {value}
      </div>
      {sub && <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function ERChip({ er }) {
  if (er == null) return null;
  const color = er >= 5 ? "green" : er >= 2 ? "yellow" : "red";
  return <span className={`badge badge-${color}`}>{er.toFixed(2)}%</span>;
}

function getGreeting() {
  const h = new Date().getHours();
  return h < 12 ? "morning" : h < 17 ? "afternoon" : "evening";
}

function Empty({ text, action, actionLabel }) {
  return (
    <div style={{ textAlign: "center", padding: "28px 0", color: "var(--text-3)" }}>
      <div style={{ fontSize: 13 }}>{text}</div>
      {action && (
        <button className="btn btn-primary" style={{ marginTop: 10, fontSize: 13 }} onClick={action}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { user }  = useAuth();
  const navigate  = useNavigate();
  const [data,    setData]    = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.get("/analytics"), api.get("/history?limit=5")])
      .then(([a, h]) => { setData(a.data); setHistory(h.data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const topPlat = () => {
    const c = data?.platform_counts || {};
    if (!Object.keys(c).length) return "—";
    const p = Object.entries(c).sort((a, b) => b[1] - a[1])[0][0];
    return p.charAt(0).toUpperCase() + p.slice(1);
  };

  const overallER = () => {
    const ers = Object.values(data?.platform_avg_er || {});
    if (!ers.length) return null;
    return (ers.reduce((a, b) => a + b, 0) / ers.length).toFixed(2);
  };

  return (
    <div style={page}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <h1 style={title}>Good {getGreeting()}, {user?.username} 👋</h1>
          <p style={sub}>Your content performance overview</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate("/analyzer")}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          New Analysis
        </button>
      </div>

      {/* ── SEASONAL BANNER ── shown above stats, always based on current month */}
      <SeasonalBanner />

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 80 }}>
          <span className="spinner" style={{ width: 32, height: 32 }} />
        </div>
      ) : (
        <>
          {/* Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 20 }}>
            <Stat label="Total Analyses"    value={data?.total_predictions ?? 0} sub="All time" />
            <Stat label="Avg Engagement Rate"
              value={overallER() ? `${overallER()}%` : "—"}
              sub="Across all platforms"
              color={overallER() >= 3 ? "var(--success)" : "var(--warning)"} />
            <Stat label="Top Platform"      value={topPlat()} sub="By usage" color="var(--accent)" />
            <Stat label="Feedback Logged"   value={data?.actual_records?.length ?? 0} sub="Actual results" />
          </div>

          <div style={{ display: "flex", gap: 16, marginBottom: 20, flexWrap: "wrap" }}>
            {/* Platform ER bars */}
            <div className="card" style={{ flex: 1, padding: 22 }}>
              <h2 style={sTitle}>Avg. Engagement Rate by Platform</h2>
              <p style={{ fontSize: 12, color: "var(--text-3)", marginTop: 2, marginBottom: 16 }}>
                Normalised (%) — directly comparable
              </p>
              {Object.keys(data?.platform_avg_er || {}).length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {Object.entries(data.platform_avg_er).map(([plat, er]) => (
                    <div key={plat}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                        <span style={{ fontWeight: 500, textTransform: "capitalize" }}>{plat}</span>
                        <span style={{ fontWeight: 700, fontSize: 13 }} className="mono">{er}%</span>
                      </div>
                      <div style={{ height: 6, background: "var(--surface-2)", borderRadius: 3, overflow: "hidden" }}>
                        <div style={{
                          height: "100%",
                          width: `${Math.min(er * 10, 100)}%`,
                          background: PC[plat] || "var(--accent)",
                          borderRadius: 3, transition: "width 0.6s",
                        }} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <Empty text="No analyses yet" action={() => navigate("/analyzer")} actionLabel="Run first analysis" />
              )}
            </div>

            {/* Recent history */}
            <div className="card" style={{ flex: 1.4, padding: 22 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h2 style={sTitle}>Recent Analyses</h2>
                <button className="btn btn-ghost" style={{ fontSize: 13 }}
                  onClick={() => navigate("/history")}>View all →</button>
              </div>
              {history.length > 0 ? (
                <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                  {history.map(item => (
                    <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 10,
                      padding: "9px 12px", background: "var(--surface-2)", borderRadius: 7 }}>
                      <span style={{ width: 7, height: 7, borderRadius: "50%", flexShrink: 0,
                        background: PC[item.platform] || "#ccc" }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 500, fontSize: 13, textTransform: "capitalize" }}>
                          {item.platform}
                          {item.detected_category && item.detected_category !== "General" && (
                            <span style={{ marginLeft: 6, fontSize: 11, color: "var(--text-3)" }}>
                              · {item.detected_category}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--text-3)" }}>
                          {new Date(item.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      <ERChip er={item.engagement_rate} />
                      <span
                        className={`badge badge-${item.confidence >= 0.8 ? "green" : item.confidence >= 0.6 ? "yellow" : "red"}`}
                        style={{ marginLeft: 6 }}>
                        {Math.round(item.confidence * 100)}%
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <Empty text="No recent analyses" action={() => navigate("/analyzer")} actionLabel="Get started" />
              )}
            </div>
          </div>

          {/* Category breakdown */}
          {Object.keys(data?.category_counts || {}).length > 0 && (
            <div className="card" style={{ padding: 22, marginBottom: 20 }}>
              <h2 style={sTitle}>Categories Analysed</h2>
              <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                {Object.entries(data.category_counts).map(([cat, cnt]) => (
                  <div key={cat} style={{ background: "var(--surface-2)", border: "1px solid var(--border)",
                    borderRadius: 20, padding: "5px 14px", fontSize: 13 }}>
                    <b>{cat}</b>
                    <span style={{ color: "var(--text-3)", marginLeft: 6 }}>{cnt}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick actions */}
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            {[
              { title: "Analyze Content",     desc: "Estimate engagement rate before posting",   path: "/analyzer",  icon: "📊" },
              { title: "History",             desc: "Browse and filter past predictions",         path: "/history",   icon: "🕐" },
              { title: "Log Actual Results",  desc: "Compare predicted vs actual performance",   path: "/history",   icon: "✅" },
              { title: "Analytics",           desc: "Engagement trends and accuracy charts",      path: "/analytics", icon: "📈" },
            ].map(item => (
              <button key={item.title} className="card" style={quickCard}
                onClick={() => navigate(item.path)}>
                <div style={{ fontSize: 22, marginBottom: 8 }}>{item.icon}</div>
                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{item.title}</div>
                <div style={{ fontSize: 12, color: "var(--text-2)" }}>{item.desc}</div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

const page     = { maxWidth: 1200, margin: "0 auto", padding: "32px 24px" };
const title    = { fontSize: 22, fontWeight: 700, letterSpacing: "-0.4px", marginBottom: 4 };
const sub      = { color: "var(--text-2)", fontSize: 14 };
const sTitle   = { fontSize: 15, fontWeight: 600, letterSpacing: "-0.2px" };
const quickCard = {
  flex: 1, minWidth: 155, padding: "18px 16px", textAlign: "left", cursor: "pointer",
  border: "1px solid var(--border)", borderRadius: 12,
  background: "var(--surface)", fontFamily: "inherit",
};