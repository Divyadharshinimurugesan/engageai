import React, { useState } from "react";
import api from "../utils/api";
import ResultTabs from "../components/ResultTabs";

const PLATFORMS  = [
  { id: "instagram", label: "Instagram",   icon: "📸" },
  { id: "youtube",   label: "YouTube",     icon: "📺" },
  { id: "twitter",   label: "Twitter / X", icon: "🐦" },
];
const CATEGORIES = ["Fashion","Food","Tech","Education","Entertainment","Fitness","Travel","Business"];
const DAYS   = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

// ─────────────────────────────────────────────────────────────────────────────
// ROOT CAUSE OF BUG #1 — "076" problem:
//   Using `+e.target.value` converts the string to a number immediately.
//   When the user types "0" then "7" then "6":
//     "0"  → +("0")  = 0  (stored as number)
//     "07" → +("07") = 7  (leading zero stripped, feels jumpy)
//     "076"→ +("076")= 76 (OK but confusing mid-type)
//   Fix: store ALL inputs as STRINGS while typing.
//         Convert to numbers ONLY when submitting.
// ─────────────────────────────────────────────────────────────────────────────

// ── Field wrapper ─────────────────────────────────────────────────────────────
function F({ label, hint, error, children }) {
  return (
    <div className="form-group">
      <label className="form-label">{label}</label>
      {children}
      {hint  && !error && <div style={{ fontSize:11, color:"var(--text-3)", marginTop:3 }}>{hint}</div>}
      {error && <div style={{ fontSize:11, color:"var(--danger)", marginTop:3 }}>{error}</div>}
    </div>
  );
}

// ── Number input — FIX #1: store as string, never coerce mid-type ─────────────
function NumInput({ value, onChange, min, max, placeholder, error, label, hint }) {
  return (
    <F label={label} hint={hint} error={error}>
      <input
        className="form-input"
        type="number"
        min={min}
        max={max}
        placeholder={placeholder}
        // value stays as the raw string the user typed — no coercion here
        value={value}
        onChange={e => onChange(e.target.value)}   // pass raw string up
        onBlur={e => {
          // On blur: clamp to min/max if needed, but don't force leading-zero strip
          const n = parseFloat(e.target.value);
          if (!isNaN(n)) {
            let clamped = n;
            if (min !== undefined && n < min) clamped = min;
            if (max !== undefined && n > max) clamped = max;
            // Only update if clamping changed the value
            if (clamped !== n) onChange(String(clamped));
          }
        }}
      />
    </F>
  );
}

function CategorySelect({ value, onChange }) {
  return (
    <F label="Content Category">
      <select className="form-select" value={value || ""} onChange={e => onChange(e.target.value)}>
        <option value="">— Select category —</option>
        {CATEGORIES.map(c => <option key={c}>{c}</option>)}
      </select>
    </F>
  );
}

function TimingFields({ inputs, set }) {
  return (
    <>
      <NumInput
        label="Posting Hour" hint="0 = midnight · 12 = noon · 19 = 7 PM"
        value={inputs.hour} onChange={v => set("hour", v)}
        min={0} max={23} placeholder="e.g. 19"
      />
      <F label="Day of Week">
        <select className="form-select"
          value={inputs.day}
          onChange={e => set("day", e.target.value)}>
          {DAYS.map((d, i) => <option key={d} value={String(i)}>{d}</option>)}
        </select>
      </F>
      <F label="Month">
        <select className="form-select"
          value={inputs.month}
          onChange={e => set("month", e.target.value)}>
          {MONTHS.map((m, i) => <option key={m} value={String(i + 1)}>{m}</option>)}
        </select>
      </F>
    </>
  );
}

function TranscriptField({ value, onChange }) {
  return (
    <F label="Video / Script Transcript (Optional)"
       hint="If provided, transcript is used instead of caption for content analysis">
      <textarea className="form-textarea"
        placeholder="Paste your script or video transcript here…"
        value={value} onChange={e => onChange(e.target.value)}
        style={{ minHeight:80 }} />
    </F>
  );
}

// ── Platform forms ────────────────────────────────────────────────────────────

function InstagramForm({ inputs, set, errs }) {
  return (
    <>
      <div style={grid}>
        <F label="Media Type">
          <select className="form-select" value={inputs.media_type}
            onChange={e => set("media_type", e.target.value)}>
            <option>Post</option><option>Reel</option><option>Carousel</option>
          </select>
        </F>
        <CategorySelect value={inputs.content_category} onChange={v => set("content_category", v)} />
        <NumInput
          label="Followers *" hint="Your current follower count"
          error={errs.followers}
          value={inputs.followers} onChange={v => set("followers", v)}
          min={1} placeholder="e.g. 10000"
        />
        <NumInput
          label="Hashtag Count" hint="0–30 · Optimal: 10–15"
          error={errs.hashtag_count}
          value={inputs.hashtag_count} onChange={v => set("hashtag_count", v)}
          min={0} max={30} placeholder="e.g. 12"
        />
        <TimingFields inputs={inputs} set={set} />
      </div>
      <F label="Caption *" hint="Used for sentiment and keyword analysis" error={errs.caption}>
        <textarea className="form-textarea" placeholder="Write your caption here…"
          value={inputs.caption} onChange={e => set("caption", e.target.value)} />
      </F>
      <TranscriptField value={inputs.transcript} onChange={v => set("transcript", v)} />
    </>
  );
}

function YouTubeForm({ inputs, set, errs }) {
  return (
    <>
      <F label="Video Title *" error={errs.text}>
        <input className="form-input" placeholder="Your video title…"
          value={inputs.text} onChange={e => set("text", e.target.value)} />
      </F>
      <div style={grid}>
        <NumInput
          label="Subscribers *" error={errs.followers}
          value={inputs.followers} onChange={v => set("followers", v)}
          min={1} placeholder="e.g. 50000"
        />
        <CategorySelect value={inputs.content_category} onChange={v => set("content_category", v)} />
        <F label="Video Type">
          <select className="form-select" value={inputs.video_type}
            onChange={e => set("video_type", e.target.value)}>
            <option>Long</option><option>Short</option>
          </select>
        </F>
        <NumInput
          label="Video Length (seconds)" hint="Short ≤ 120s · Long > 120s"
          value={inputs.video_length} onChange={v => set("video_length", v)}
          min={1} placeholder="e.g. 600"
        />
        <NumInput
          label="Tags Count" hint="0–20 · Optimal: 8–12"
          error={errs.hashtag_count}
          value={inputs.hashtag_count} onChange={v => set("hashtag_count", v)}
          min={0} max={20} placeholder="e.g. 10"
        />
        <F label="Thumbnail Quality">
          <select className="form-select" value={inputs.thumbnail_quality}
            onChange={e => set("thumbnail_quality", e.target.value)}>
            <option>Low</option><option>Medium</option><option>High</option>
          </select>
        </F>
        <TimingFields inputs={inputs} set={set} />
      </div>
      <F label="Description" hint="Supports keyword and sentiment detection">
        <textarea className="form-textarea" placeholder="Video description…"
          value={inputs.description} onChange={e => set("description", e.target.value)} />
      </F>
      <TranscriptField value={inputs.transcript} onChange={v => set("transcript", v)} />
    </>
  );
}

function TwitterForm({ inputs, set, errs }) {
  const len = inputs.text.length;
  return (
    <>
      <F label="Tweet Text *" error={errs.text}>
        <textarea className="form-textarea" maxLength={280}
          placeholder="What's happening?"
          value={inputs.text} onChange={e => set("text", e.target.value)} />
        <div style={{ textAlign:"right", fontSize:11, marginTop:2,
          color: len > 240 ? "var(--danger)" : "var(--text-3)" }}>
          {len}/280
        </div>
      </F>
      <div style={grid}>
        <NumInput
          label="Followers *" error={errs.followers}
          value={inputs.followers} onChange={v => set("followers", v)}
          min={1} placeholder="e.g. 5000"
        />
        <CategorySelect value={inputs.content_category} onChange={v => set("content_category", v)} />
        <F label="Has Media?">
          <select className="form-select"
            value={inputs.has_media}
            onChange={e => set("has_media", e.target.value)}>
            <option value="No">No</option>
            <option value="Yes">Yes</option>
          </select>
        </F>
        <NumInput
          label="Hashtag Count" hint="0–5 recommended for Twitter"
          error={errs.hashtag_count}
          value={inputs.hashtag_count} onChange={v => set("hashtag_count", v)}
          min={0} max={30} placeholder="e.g. 2"
        />
        <TimingFields inputs={inputs} set={set} />
      </div>
    </>
  );
}

// ── Validation — converts strings to numbers here, not during typing ──────────
function validate(platform, inputs) {
  const errs = {};
  const followers = parseFloat(inputs.followers);
  if (isNaN(followers) || followers <= 0) errs.followers = "Followers must be greater than 0";

  const hc = parseFloat(inputs.hashtag_count);
  if (!isNaN(hc) && (hc < 0 || hc > 30)) errs.hashtag_count = "Hashtag count must be 0–30";

  if (platform === "instagram" && !inputs.caption.trim()) errs.caption = "Caption is required";
  if (platform === "youtube"   && !inputs.text.trim())    errs.text    = "Video title is required";
  if (platform === "twitter"   && !inputs.text.trim())    errs.text    = "Tweet text is required";

  return errs;
}

// ── Build numeric payload — convert strings → numbers right before API call ──
function buildPayload(platform, inputs) {
  const toInt   = (v, fallback = 0) => { const n = parseInt(v, 10); return isNaN(n) ? fallback : n; };
  const toFloat = (v, fallback = 0) => { const n = parseFloat(v);   return isNaN(n) ? fallback : n; };

  const base = {
    followers:        toInt(inputs.followers, 1000),
    hashtag_count:    toInt(inputs.hashtag_count, 0),
    hour:             toInt(inputs.hour, 12),
    day:              toInt(inputs.day, 0),
    month:            toInt(inputs.month, 1),
    content_category: inputs.content_category || "",
    transcript:       inputs.transcript || "",
  };

  if (platform === "instagram") {
    return {
      ...base,
      media_type: inputs.media_type || "Post",
      caption:    inputs.caption    || "",
    };
  }
  if (platform === "youtube") {
    return {
      ...base,
      text:              inputs.text             || "",
      description:       inputs.description      || "",
      video_type:        inputs.video_type       || "Long",
      video_length:      toFloat(inputs.video_length, 600),
      thumbnail_quality: inputs.thumbnail_quality || "Medium",
    };
  }
  if (platform === "twitter") {
    return {
      ...base,
      text:      inputs.text     || "",
      has_media: inputs.has_media === "Yes",
    };
  }
  return base;
}

// ── Initial state — ALL values are strings to avoid mid-type coercion ─────────
const INITIAL = {
  // strings for number inputs
  followers:        "",
  hashtag_count:    "",
  hour:             String(new Date().getHours()),
  video_length:     "",
  // strings for selects (kept as strings, converted on submit)
  day:              String(new Date().getDay() === 0 ? 6 : new Date().getDay() - 1), // Mon=0…Sun=6
  month:            String(new Date().getMonth() + 1), // getMonth() is 0-indexed
  media_type:       "Post",
  video_type:       "Long",
  thumbnail_quality:"Medium",
  has_media:        "No",
  // strings for text fields
  caption:          "",
  text:             "",
  description:      "",
  transcript:       "",
  content_category: "",
};

// ── Main Analyzer ─────────────────────────────────────────────────────────────
export default function Analyzer() {
  const [platform, setPlatform] = useState("instagram");
  const [inputs,   setInputs]   = useState({ ...INITIAL });
  const [result,   setResult]   = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [errs,     setErrs]     = useState({});

  // FIX #2: single setter — always stores raw string, no coercion
  const set = (k, v) => setInputs(prev => ({ ...prev, [k]: v }));

  const switchPlatform = (p) => {
    setPlatform(p);
    setInputs({ ...INITIAL });
    setResult(null);
    setError("");
    setErrs({});
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const fieldErrs = validate(platform, inputs);
    if (Object.keys(fieldErrs).length) {
      setErrs(fieldErrs);
      return;
    }
    setErrs({});
    setError("");
    setLoading(true);

    // FIX #7: Debug log — inputs as typed by user
    const payload = buildPayload(platform, inputs);
    console.group("🔍 EngageAI Debug — Prediction Request");
    console.log("Platform:", platform);
    console.log("Raw inputs (as typed):", { ...inputs });
    console.log("Converted payload (sent to API):", payload);
    console.groupEnd();

    try {
      const res = await api.post("/predict", { platform, inputs: payload });

      // FIX #7: Debug log — backend response
      console.group("✅ EngageAI Debug — Prediction Response");
      console.log("Engagement Rate:", res.data.engagement_rate + "%");
      console.log("Features used:", res.data.features_used);
      console.log("Seasonal boost:", res.data.seasonal);
      console.log("Trend boost:", res.data.trend);
      console.log("NLP analysis:", res.data.nlp);
      console.log("Full response:", res.data);
      console.groupEnd();

      setResult(res.data);
      setTimeout(() => document.getElementById("result-anchor")?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch (err) {
      const msg = err.response?.data?.detail || "Prediction failed. Ensure models are trained (run train_model.py).";
      console.error("❌ EngageAI Debug — Prediction Error:", msg);
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={page}>
      <div style={{ marginBottom:24 }}>
        <h1 style={title}>Content Analyzer</h1>
        <p style={sub}>Estimate engagement rate before posting — based on your content details</p>
      </div>

      <div className="card" style={{ padding:28, marginBottom:24 }}>
        {/* Platform selector */}
        <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
          {PLATFORMS.map(p => (
            <button key={p.id} type="button"
              style={{ ...platBtn, ...(platform === p.id ? platBtnOn : {}) }}
              onClick={() => switchPlatform(p.id)}>
              <span style={{ fontSize:18 }}>{p.icon}</span>
              <span>{p.label}</span>
            </button>
          ))}
        </div>

        <div style={{ height:1, background:"var(--border)", margin:"20px 0" }} />

        <form onSubmit={handleSubmit}>
          {platform === "instagram" && <InstagramForm inputs={inputs} set={set} errs={errs} />}
          {platform === "youtube"   && <YouTubeForm   inputs={inputs} set={set} errs={errs} />}
          {platform === "twitter"   && <TwitterForm   inputs={inputs} set={set} errs={errs} />}

          {/* FIX #6: persistent, clearly labelled error */}
          {error && (
            <div style={{ background:"var(--danger-light)", color:"var(--danger)",
              border:"1px solid #fecaca", borderRadius:8,
              padding:"10px 14px", fontSize:13, marginTop:16,
              display:"flex", gap:8, alignItems:"flex-start" }}>
              <span style={{ flexShrink:0 }}>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <div style={{ marginTop:20, display:"flex", gap:12, alignItems:"center", flexWrap:"wrap" }}>
            <button type="submit" className="btn btn-primary"
              style={{ height:42, padding:"0 32px" }} disabled={loading}>
              {loading
                ? <><span className="spinner" style={{ borderTopColor:"#fff", width:16, height:16 }} /> Analyzing…</>
                : "Get Performance Estimate"}
            </button>
            {result && (
              <button type="button" className="btn btn-secondary"
                onClick={() => { setResult(null); setInputs({ ...INITIAL }); setError(""); }}>
                Reset
              </button>
            )}
            {result && (
              <span style={{ fontSize:12, color:"var(--text-3)" }}>
                Saved as prediction #{result.prediction_id}
              </span>
            )}
          </div>
        </form>
      </div>

      {result && (
        <div id="result-anchor" className="fade-in">
          <ResultTabs result={result} platform={platform} />
        </div>
      )}
    </div>
  );
}

const page    = { maxWidth:1100, margin:"0 auto", padding:"32px 24px" };
const title   = { fontSize:22, fontWeight:700, letterSpacing:"-0.4px", marginBottom:4 };
const sub     = { color:"var(--text-2)", fontSize:14 };
const grid    = { display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(185px, 1fr))", gap:16, marginBottom:16 };
const platBtn = {
  display:"flex", alignItems:"center", gap:8,
  padding:"10px 20px", borderRadius:10,
  border:"2px solid var(--border)", background:"var(--surface)",
  cursor:"pointer", fontFamily:"inherit", fontSize:14, fontWeight:500,
  color:"var(--text-2)", transition:"all 0.12s",
};
const platBtnOn = { border:"2px solid var(--accent)", background:"var(--accent-light)", color:"var(--accent)" };