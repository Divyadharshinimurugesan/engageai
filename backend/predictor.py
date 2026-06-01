"""
EngageAI v3 — Prediction Engine
Steps 1–18 implemented:
  - Engagement Rate (%) output
  - 8 categories with multipliers
  - Media-type multipliers
  - Keyword-based trend logic
  - Keyword-based seasonal boost/penalty
  - Transcript prioritisation
  - TextBlob NLP (sentiment, content quality)
  - Language detection
  - Smart suggestions
  - Posting-time simulation
  - Post-mode: predicted vs actual ER
"""

import os
import pickle
import math
import numpy as np
from typing import Dict, Any, List, Optional

# TextBlob — wrapped so import failure doesn't crash startup
try:
    from textblob import TextBlob
    _TEXTBLOB_OK = True
except ImportError:
    _TEXTBLOB_OK = False

MODEL_DIR = "models"

# ── Feature column order must match train_model.py ────────────────────────────
FEATURE_COLS = [
    "follower_scale",
    "time_score",
    "hashtag_efficiency",
    "content_quality",
    "sentiment_score",
    "category_multiplier",
    "media_multiplier",
    "seasonal_boost",
    "video_length",
    "thumbnail_quality",
    "has_media",
    "month",
    "day",
    "hour",
]

# ── Step 2 — 8 categories ────────────────────────────────────────────────────
CATEGORIES = ["Fashion", "Food", "Tech", "Education", "Entertainment", "Fitness", "Travel", "Business"]

# ── Step 6 — Category multipliers — widened to match training data ────────────
CAT_MULT: Dict[str, float] = {
    "Fashion": 1.25, "Food": 1.18, "Tech": 1.10,
    "Education": 0.90, "Entertainment": 1.30, "Fitness": 1.20,
    "Travel": 1.15, "Business": 0.85, "Default": 1.00,
}

# ── Step 6 — Media multipliers ────────────────────────────────────────────────
MEDIA_MULT: Dict[str, float] = {
    "Reel": 1.40, "Carousel": 1.18, "Post": 1.00, "Story": 0.65,
    "Short": 1.22, "Long": 1.00,
    "with_media": 1.28, "without_media": 1.00,
}

# ── Step 7 — Trend keyword → boost ───────────────────────────────────────────
TREND_KEYWORDS: Dict[str, Dict] = {
    "Tech": {
        "keywords": ["ai", "tech", "coding", "python", "software", "startup", "app",
                     "digital", "data", "machine learning", "developer", "chatgpt", "llm"],
        "boost":    0.18,
        "label":    "Tech & AI content is trending — strong discovery potential",
    },
    "Entertainment": {
        "keywords": ["funny", "meme", "viral", "comedy", "prank", "skit",
                     "challenge", "dance", "reaction", "trending"],
        "boost":    0.15,
        "label":    "Entertainment content benefits from high shareability",
    },
    "Fashion": {
        "keywords": ["fashion", "style", "outfit", "ootd", "clothes", "design",
                     "collection", "dress", "lookbook", "aesthetic"],
        "boost":    0.12,
        "label":    "Fashion content performs well with style-conscious audiences",
    },
    "Fitness": {
        "keywords": ["fitness", "workout", "gym", "health", "yoga", "exercise",
                     "muscle", "diet", "run", "training", "wellness"],
        "boost":    0.12,
        "label":    "Fitness content sees consistent high engagement",
    },
    "Food": {
        "keywords": ["recipe", "food", "cook", "eat", "restaurant", "meal",
                     "chef", "delicious", "bake", "tasty", "ingredients"],
        "boost":    0.10,
        "label":    "Food content drives saves and shares across platforms",
    },
    "Travel": {
        "keywords": ["travel", "trip", "vacation", "destination", "explore",
                     "adventure", "hotel", "tour", "hidden gem", "solo travel"],
        "boost":    0.10,
        "label":    "Travel content earns strong discovery-feed reach",
    },
    "Education": {
        "keywords": ["learn", "tutorial", "how to", "guide", "tips", "study",
                     "skill", "explained", "course", "lesson", "step by step"],
        "boost":    0.08,
        "label":    "Educational content earns high save rates and repeat views",
    },
    "Business": {
        "keywords": ["business", "startup", "entrepreneur", "marketing", "sales",
                     "strategy", "growth", "revenue", "productivity", "success"],
        "boost":    0.08,
        "label":    "Business content attracts engaged professional audiences",
    },
}

# ── Step 8 — Seasonal boost/penalty ──────────────────────────────────────────
PONGAL_KW     = ["pongal", "harvest", "sankranti", "makara"]
VALENTINE_KW  = ["love", "valentine", "heart", "romance", "date", "couple"]
HOLI_KW       = ["holi", "color", "colour", "festival", "spring"]
IPL_KW        = ["ipl", "cricket", "match", "sports", "t20"]
MONSOON_KW    = ["monsoon", "rain", "chai", "coffee", "cozy", "petrichor"]
INDEPENDENCE_KW = ["independence", "patriot", "india", "freedom", "tricolor", "15 august"]
NAVRATRI_KW   = ["navratri", "dussehra", "garba", "dandiya", "durga"]
DIWALI_KW     = ["diwali", "deepavali", "diya", "lights", "celebration", "firecracker"]
CHRISTMAS_KW  = ["christmas", "xmas", "santa", "holiday", "new year", "31 december"]


def seasonal_analysis(month: int, category: str, text: str) -> Dict:
    """
    Step 8 — Returns boost multiplier, label, and alignment status.
    Positive alignment if keywords match; penalty if content is off-season.
    """
    tl = text.lower()

    def has(kws): return any(k in tl for k in kws)

    boost = 1.0
    aligned = True
    reason = ""

    if month == 1:
        if has(PONGAL_KW) or has(["new year", "resolution", "january"]):
            boost = 1.18
            reason = "January: New Year + Pongal/Makar Sankranti season. Festive, resolution, and harvest content earns a strong engagement boost this month."
        else:
            boost = 1.08
            reason = "January: New Year energy drives above-average engagement. Add Pongal or New Year resolution keywords to unlock a higher boost."

    elif month == 2:
        if has(VALENTINE_KW):
            boost = 1.15
            reason = "February: Valentine's Day season. Romance, gifting, couple, and lifestyle content receives a significant boost."
        elif category in ("Business", "Tech"):
            boost = 0.96
            aligned = False
            reason = "February: A lifestyle-heavy month. Business and Tech content sees slightly lower reach as audiences prefer personal and romantic themes."
        else:
            boost = 1.05
            reason = "February: Valentine's Day season. Add love, romance, or gifting keywords to your caption to unlock a higher seasonal boost."

    elif month == 3:
        if has(HOLI_KW):
            boost = 1.20
            reason = "March: Holi & spring season. Colorful, festive, and outdoor content earns a strong boost. Festival keywords detected in your content."
        else:
            boost = 1.10
            reason = "March: Holi and spring season. Add Holi, color, or spring-related keywords to your caption to unlock the full ×1.20 seasonal boost."

    elif month == 4:
        if has(IPL_KW):
            boost = 1.25
            reason = "April: IPL season is live! Sports and cricket-related content is surging across platforms. Your content keywords match this trend."
        elif category == "Entertainment":
            boost = 1.15
            reason = "April: IPL season drives entertainment content. Your category benefits from high platform activity this month."
        else:
            boost = 1.10
            reason = "April: Summer begins + exam season + financial year start. Productivity, education, summer prep, and finance content performs well this month."

    elif month == 5:
        if category in ("Travel", "Fashion", "Fitness"):
            boost = 1.12
            reason = "May: Summer peak for Travel, Fashion, and Fitness. Your category is perfectly aligned with this month's audience intent."
        else:
            boost = 1.06
            reason = "May: Summer peak month. Travel, vacation planning, and summer lifestyle content earns the highest boost this month."

    elif month == 6:
        if has(MONSOON_KW):
            boost = 1.12
            reason = "June: Monsoon season + school reopening. Cozy, rainy-day, and back-to-school content resonates deeply with audiences this month."
        elif category in ("Food", "Education"):
            boost = 1.08
            reason = "June: School reopening month. Food and Educational content holds well. Add monsoon or back-to-school keywords for a bigger boost."
        else:
            boost = 1.02
            reason = "June: School reopening season. Educational, stationery, and monsoon lifestyle content performs best this month."

    elif month == 7:
        boost = 1.06
        reason = "July: Monsoon season. Cozy indoor content, food, and education content performs steadily. Productivity and mid-year review content also does well."

    elif month == 8:
        if has(INDEPENDENCE_KW):
            boost = 1.22
            reason = "August: Independence Day season! Patriotic, inspirational, and India-pride content is receiving a major boost. Your keywords are aligned."
        else:
            boost = 1.10
            reason = "August: Independence Day month. Add freedom, India, tricolor, or 15 August keywords to unlock a higher seasonal boost."

    elif month == 9:
        boost = 1.12
        reason = "September: Pre-festive season begins! Audiences are actively browsing for gifting, fashion, and celebration content. High-intent month."

    elif month == 10:
        if has(NAVRATRI_KW):
            boost = 1.28
            reason = "October: Navratri & Dussehra peak! Your content includes festive keywords. Garba, dandiya, and celebration content is at maximum reach."
        else:
            boost = 1.18
            reason = "October: Navratri & Dussehra month — all content sees a strong uplift. Add Navratri, garba, or Dussehra keywords for the maximum ×1.28 boost."

    elif month == 11:
        if has(DIWALI_KW):
            boost = 1.38
            reason = "November: DIWALI month — the highest engagement month of the year! Your content includes Diwali keywords. Maximum seasonal boost applied."
        else:
            boost = 1.25
            reason = "November: Diwali & festive season — highest platform activity of the year. Add diwali, diya, or celebration keywords to unlock the ×1.38 maximum boost."

    elif month == 12:
        if has(CHRISTMAS_KW):
            boost = 1.28
            reason = "December: Christmas & year-end season! Holiday, celebration, and year-end reflection content is driving strong shares and saves."
        else:
            boost = 1.18
            reason = "December: Christmas and year-end month. Add Christmas, holiday, or New Year countdown keywords to unlock the full ×1.28 boost."

    return {
        "boost":   round(boost, 4),
        "reason":  reason,
        "aligned": aligned,
        "label":   "Content aligned with seasonal trends" if aligned
                   else "Content misaligned with seasonal trends — slight penalty applied",
    }


# ── Step 7 — Trend analysis ───────────────────────────────────────────────────
def trend_analysis(text: str, category: str) -> Dict:
    """
    Keyword-based trend boost. User-selected category is the primary signal;
    text keywords may confirm or override.
    """
    tl = text.lower()

    # Check user-selected category first
    if category in TREND_KEYWORDS:
        info  = TREND_KEYWORDS[category]
        kw_ok = any(k in tl for k in info["keywords"])
        boost = info["boost"] if kw_ok else info["boost"] * 0.6
        return {
            "boost":    round(boost, 4),
            "label":    info["label"],
            "category": category,
            "keyword_match": kw_ok,
            "explanation": (
                f"Trend boost applied based on content keywords matching '{category}' category"
                if kw_ok else
                f"Category '{category}' selected — partial trend boost applied (no specific keywords found in text)"
            ),
        }

    # Fallback: detect from text
    best_cat, best_hits = "Default", 0
    for cat, info in TREND_KEYWORDS.items():
        hits = sum(1 for k in info["keywords"] if k in tl)
        if hits > best_hits:
            best_hits, best_cat = hits, cat

    if best_cat == "Default" or best_hits == 0:
        return {
            "boost": 0.0, "label": "No specific trend detected — standard baseline engagement",
            "category": "General", "keyword_match": False,
            "explanation": "No category-specific keywords detected in content text",
        }

    info = TREND_KEYWORDS[best_cat]
    return {
        "boost":    round(info["boost"] * 0.8, 4),
        "label":    info["label"],
        "category": best_cat,
        "keyword_match": True,
        "explanation": f"Trend boost applied — keywords match '{best_cat}' category",
    }


# ── Step 5 — NLP content analysis ────────────────────────────────────────────
HIGH_PHRASES = [
    "how to", "step by step", "guide", "tips", "honest review",
    "transformation", "ultimate", "revealed", "secret", "behind the scenes",
    "day in my life", "before and after", "beginners", "everything you need",
]
WEAK_PHRASES = ["not sure", "whatever", "idk", "nothing special", "just posting"]

NON_ENGLISH_HINTS = [
    "हिन्दी", "தமிழ்", "বাংলা", "اردو", "ਪੰਜਾਬੀ",  # common scripts
    "bonjour", "hola", "hallo", "ciao", "olá",          # common non-English words
]


def detect_language_warning(text: str) -> Optional[str]:
    """Step 17 — warn if non-English text detected."""
    if not text:
        return None
    # Check for non-ASCII scripts that suggest non-English
    non_ascii = sum(1 for c in text if ord(c) > 127)
    if non_ascii > len(text) * 0.15:
        return "Non-English content detected — prediction accuracy may be reduced"
    tl = text.lower()
    if any(hint in tl for hint in NON_ENGLISH_HINTS):
        return "Non-English content detected — prediction accuracy may be reduced"
    return None


def nlp_analysis(text: str) -> Dict:
    """
    Step 5 — Lightweight NLP: sentiment, content quality, keyword extraction.
    Uses TextBlob if available, otherwise rule-based fallback.
    """
    if not text or not text.strip():
        return {
            "sentiment":       0.0,
            "content_quality": 0.35,
            "keyword_boost":   0.0,
            "subjectivity":    0.5,
            "top_keywords":    [],
            "engine":          "none",
        }

    tl = text.lower()

    # Sentiment
    if _TEXTBLOB_OK:
        try:
            blob          = TextBlob(text)
            sentiment     = float(blob.sentiment.polarity)
            subjectivity  = float(blob.sentiment.subjectivity)
            engine        = "TextBlob"
        except Exception:
            sentiment, subjectivity, engine = _rule_sentiment(tl), 0.5, "rule-based"
    else:
        sentiment, subjectivity, engine = _rule_sentiment(tl), 0.5, "rule-based"

    # Engagement phrase scoring
    high_hits = sum(1 for p in HIGH_PHRASES if p in tl)
    weak_hits = sum(1 for p in WEAK_PHRASES  if p in tl)
    kw_boost  = min(0.30, high_hits * 0.05) - min(0.15, weak_hits * 0.05)

    # Content quality
    words        = len(text.split())
    has_q        = 1.0 if "?" in text else 0.0
    has_ex       = 1.0 if "!" in text else 0.0
    has_emoji    = 1.0 if any(ord(c) > 127 for c in text) else 0.0
    len_score    = min(1.0, words / 80.0)

    cq = min(1.0, max(0.10,
        0.35 * len_score + 0.18 * subjectivity +
        0.14 * has_q + 0.14 * has_ex + 0.12 * has_emoji + kw_boost
    ))

    # Top keywords (simple frequency)
    stopwords = {"the","a","an","is","in","it","of","to","and","for","on","with","this","that","i","my","your"}
    words_list = [w.strip(".,!?#@\"'") for w in text.lower().split() if len(w) > 3 and w not in stopwords]
    from collections import Counter
    top_kws = [w for w, _ in Counter(words_list).most_common(5)]

    return {
        "sentiment":       round(sentiment, 4),
        "content_quality": round(cq, 4),
        "keyword_boost":   round(kw_boost, 4),
        "subjectivity":    round(subjectivity, 4),
        "top_keywords":    top_kws,
        "engine":          engine,
    }


def _rule_sentiment(text_lower: str) -> float:
    pos = ["love","amazing","great","best","happy","excited","awesome","wonderful","beautiful","fantastic"]
    neg = ["hate","bad","worst","boring","terrible","awful","horrible","disappointing"]
    score = sum(1 for w in pos if w in text_lower) - sum(1 for w in neg if w in text_lower)
    return max(-1.0, min(1.0, score * 0.15))


# ── Step 4 — Effective text (transcript priority) ─────────────────────────────
def get_effective_text(inputs: Dict[str, Any]) -> tuple:
    """Returns (text, source_label)."""
    transcript = (inputs.get("transcript") or "").strip()
    if transcript:
        return transcript, "Transcript"
    caption     = (inputs.get("caption")     or "").strip()
    if caption:
        return caption, "Caption"
    description = (inputs.get("description") or "").strip()
    title       = (inputs.get("title")       or "").strip()
    text        = (inputs.get("text")        or "").strip()
    combined    = " ".join(filter(None, [title, description, text]))
    return combined, "Description/Title"


# ── Timing ───────────────────────────────────────────────────────────────────
def time_score(hour: int, day: int) -> float:
    hs = {
        0: 0.18, 1: 0.10, 2: 0.08, 3: 0.08, 4: 0.12, 5: 0.28,
        6: 0.65, 7: 0.82, 8: 0.90, 9: 0.78, 10: 0.62,
        11: 0.82, 12: 0.95, 13: 0.88, 14: 0.68, 15: 0.62,
        16: 0.68, 17: 0.74, 18: 0.88, 19: 0.95, 20: 0.84,
        21: 0.70, 22: 0.50, 23: 0.32,
    }
    ds = {0: 0.74, 1: 0.70, 2: 0.74, 3: 0.80, 4: 0.84, 5: 1.00, 6: 0.95}
    return round(hs.get(int(hour), 0.5) * ds.get(int(day), 0.76), 4)


def hashtag_efficiency(count: int, platform: str) -> float:
    optimal = {"instagram": 12, "youtube": 10, "twitter": 2}
    opt = optimal.get(platform, 10)
    return round(max(0.10, 1.0 - abs(count - opt) / (opt + 10)), 4)


# ── Confidence ────────────────────────────────────────────────────────────────
def compute_confidence(features: Dict[str, float], artifact: Dict) -> float:
    stats = artifact["train_stats"]
    dists = []
    for col in FEATURE_COLS:
        std = stats["std"].get(col, 1)
        if std > 0:
            z = abs(features.get(col, 0) - stats["mean"].get(col, 0)) / (std + 1e-9)
            dists.append(min(z, 3.0))
    avg_z = float(np.mean(dists)) if dists else 1.0
    return round(max(0.42, min(0.96, 1.0 - avg_z * 0.14)), 3)


# ── Feature vector builder ────────────────────────────────────────────────────
def build_features(platform: str, inputs: Dict[str, Any], nlp: Dict, sb: float) -> Dict[str, float]:
    followers = max(1, int(inputs.get("followers", inputs.get("subscribers", 1000)) or 1))
    hc        = int(inputs.get("hashtag_count", 0) or 0)
    hour      = int(inputs.get("hour",  12))
    day       = int(inputs.get("day",   0))
    month     = int(inputs.get("month", 6))
    category  = inputs.get("content_category", "Default")

    cap_map = {"instagram": 10_000_000, "youtube": 50_000_000, "twitter": 5_000_000}
    fs   = math.log1p(followers) / math.log1p(cap_map.get(platform, 10_000_000))
    ts   = time_score(hour, day)
    he   = hashtag_efficiency(hc, platform)
    cm   = CAT_MULT.get(category, 1.00)

    if platform == "instagram":
        media  = inputs.get("media_type", "Post")
        mm     = MEDIA_MULT.get(media, 1.00)
        vlen   = 0.0
        tq     = 1.0
        hm     = 0.0

    elif platform == "youtube":
        tq_str = inputs.get("thumbnail_quality", "Medium")
        tq     = {"Low": 0.60, "Medium": 1.00, "High": 1.40}.get(tq_str, 1.00)
        vt     = inputs.get("video_type", "Long")
        mm     = MEDIA_MULT.get(vt, 1.00) * tq
        vlen   = float(inputs.get("video_length", 600) or 600)
        hm     = 0.0

    elif platform == "twitter":
        hm  = 1.0 if inputs.get("has_media", False) else 0.0
        mm  = MEDIA_MULT["with_media"] if hm else MEDIA_MULT["without_media"]
        vlen = 0.0
        tq   = 1.0

    else:
        mm, vlen, tq, hm = 1.0, 0.0, 1.0, 0.0

    return {
        "follower_scale":     round(fs, 6),
        "time_score":         ts,
        "hashtag_efficiency": he,
        "content_quality":    nlp["content_quality"],
        "sentiment_score":    nlp["sentiment"],
        "category_multiplier": cm,
        "media_multiplier":   round(mm, 4),
        "seasonal_boost":     sb,
        "video_length":       vlen,
        "thumbnail_quality":  tq,
        "has_media":          hm,
        "month":              float(month),
        "day":                float(day),
        "hour":               float(hour),
    }


# ── Model loader ──────────────────────────────────────────────────────────────
_cache: Dict[str, Dict] = {}


def load_artifact(platform: str) -> Dict:
    if platform not in _cache:
        path = os.path.join(MODEL_DIR, f"{platform}_model.pkl")
        if not os.path.exists(path):
            raise FileNotFoundError(f"Model not found: {path}. Run: python train_model.py")
        with open(path, "rb") as f:
            _cache[platform] = pickle.load(f)
    return _cache[platform]


# ── Main predict ──────────────────────────────────────────────────────────────
def predict(platform: str, inputs: Dict[str, Any]) -> Dict[str, Any]:
    artifact = load_artifact(platform)

    # Step 4 — effective text
    text, text_source = get_effective_text(inputs)

    # Step 5 — NLP
    nlp = nlp_analysis(text)

    # Step 17 — language warning
    lang_warn = detect_language_warning(text)

    # Step 8 — seasonal
    month    = int(inputs.get("month", 6))
    category = (inputs.get("content_category") or "Default").strip()
    seasonal = seasonal_analysis(month, category, text)

    # Step 7 — trend
    trend = trend_analysis(text, category)

    # Build feature vector
    features = build_features(platform, inputs, nlp, seasonal["boost"])

    # FIX #4 & #7 — Debug: log every feature before XGBoost
    print("[DEBUG][predictor] Feature vector:")
    for col in FEATURE_COLS:
        print(f"  {col:<22} = {features.get(col, 'MISSING')}")

    # XGBoost prediction (Step 10)
    X        = np.array([[features[c] for c in FEATURE_COLS]], dtype=float)
    raw_er   = float(artifact["model"].predict(X)[0])
    raw_er   = max(0.0, raw_er)
    print(f"[DEBUG][predictor] XGBoost raw ER: {raw_er:.4f}%")

    # Apply trend boost (additive on ER)
    boosted_er = raw_er * (1.0 + trend["boost"])
    boosted_er = round(min(boosted_er, 100.0), 2)
    raw_er     = round(min(raw_er, 100.0), 2)

    followers  = max(1, int(inputs.get("followers", inputs.get("subscribers", 1)) or 1))
    est_engagement = round(boosted_er / 100.0 * followers)

    confidence = compute_confidence(features, artifact)

    # Suggestions (Step 13)
    suggestions = build_suggestions(platform, features, inputs, nlp, category)

    # Simulation (Step 14 transparency)
    simulation = simulate_hours(platform, inputs, artifact, nlp, seasonal["boost"], trend["boost"])

    return {
        # ── Primary outputs ──────────────────────────────────────────────────
        "engagement_rate":     boosted_er,      # % (Step 1)
        "raw_engagement_rate": raw_er,           # before trend boost
        "estimated_engagement": est_engagement,  # absolute count
        "followers":           followers,
        "confidence":          confidence,

        # ── Analysis source (Step 4) ─────────────────────────────────────────
        "text_source": text_source,
        "transcript_used": text_source == "Transcript",

        # ── Seasonal (Step 8) ────────────────────────────────────────────────
        "seasonal": {
            "boost":   seasonal["boost"],
            "reason":  seasonal["reason"],
            "aligned": seasonal["aligned"],
            "label":   seasonal["label"],
        },

        # ── Trend (Step 7) ───────────────────────────────────────────────────
        "trend": {
            "boost":         trend["boost"],
            "label":         trend["label"],
            "category":      trend["category"],
            "keyword_match": trend["keyword_match"],
            "explanation":   trend["explanation"],
        },

        # ── NLP (Step 5) ─────────────────────────────────────────────────────
        "nlp": {
            "sentiment":       nlp["sentiment"],
            "content_quality": nlp["content_quality"],
            "keyword_boost":   nlp["keyword_boost"],
            "top_keywords":    nlp["top_keywords"],
            "engine":          nlp["engine"],
            "source":          text_source,
            "preview":         text[:100] + ("…" if len(text) > 100 else ""),
        },

        # ── Language warning (Step 17) ───────────────────────────────────────
        "language_warning": lang_warn,

        # ── Feature importance (Step 14 transparency) ────────────────────────
        "feature_importance": artifact.get("feature_importance", {}),
        "features_used":      {k: round(v, 4) for k, v in features.items()},

        # ── Suggestions (Step 13) ────────────────────────────────────────────
        "suggestions": suggestions,

        # ── Simulation (Step 13 posting time) ───────────────────────────────
        "simulation": simulation,

        # ── Model metrics ─────────────────────────────────────────────────────
        "model_metrics": artifact["metrics"],
    }


def simulate_hours(
    platform: str, inputs: Dict[str, Any], artifact: Dict,
    nlp: Dict, s_boost: float, t_boost: float,
) -> List[Dict]:
    results = []
    for h in range(24):
        feats = build_features(platform, {**inputs, "hour": h}, nlp, s_boost)
        X     = np.array([[feats[c] for c in FEATURE_COLS]], dtype=float)
        raw   = max(0.0, float(artifact["model"].predict(X)[0]))
        er    = round(min(raw * (1.0 + t_boost), 100.0), 2)
        results.append({"hour": h, "engagement_rate": er})
    return results


# ── Step 13 — Smart suggestions ──────────────────────────────────────────────
def build_suggestions(
    platform: str, features: Dict[str, float],
    inputs: Dict[str, Any], nlp: Dict, category: str,
) -> List[Dict]:
    s = []

    # 1. Posting time
    if features["time_score"] < 0.65:
        s.append({
            "factor": "Posting Time", "impact": "high",
            "message": "Your selected hour is outside peak engagement windows. "
                       "Best times: 12–1 PM and 7–9 PM on weekdays; 10 AM–12 PM on weekends.",
        })

    # 2. Sentiment
    if nlp["sentiment"] < -0.05:
        s.append({
            "factor": "Caption Tone", "impact": "medium",
            "message": "Your text has a negative tone. Positive or inspiring captions "
                       "earn more likes, shares, and saves.",
        })

    # 3. Content quality
    if nlp["content_quality"] < 0.45:
        s.append({
            "factor": "Content Strength", "impact": "medium",
            "message": "Your caption is brief or lacks engaging language. "
                       "Adding a question, call-to-action, or descriptive text improves interaction.",
        })

    # 4. High-engagement phrases
    if nlp["keyword_boost"] <= 0:
        s.append({
            "factor": "Engagement Phrases", "impact": "low",
            "message": "Phrases like 'how to', 'step by step', or 'honest review' "
                       "signal value to readers and improve discovery performance.",
        })

    # 5. Platform-specific (Step 13)
    if platform == "instagram":
        hc    = int(inputs.get("hashtag_count", 0) or 0)
        media = inputs.get("media_type", "Post")
        if hc < 8:
            s.append({"factor": "Hashtags", "impact": "medium",
                "message": f"You used {hc} hashtag(s). 10–15 targeted hashtags maximise Instagram reach."})
        elif hc > 22:
            s.append({"factor": "Hashtags", "impact": "low",
                "message": f"{hc} hashtags can appear spammy. Trim to 10–15 focused tags."})
        if media == "Post":
            s.append({"factor": "Media Format", "impact": "high",
                "message": "Reels get ~40% higher organic reach than static posts. "
                           "Consider converting this content to a Reel."})
        elif media == "Carousel":
            s.append({"factor": "Media Format", "impact": "low",
                "message": "Good choice — Carousels have the highest save rate of any Instagram format."})

    elif platform == "youtube":
        tq = inputs.get("thumbnail_quality", "Medium")
        tc = int(inputs.get("hashtag_count", 0) or 0)
        if tq == "Low":
            s.append({"factor": "Thumbnail", "impact": "high",
                "message": "Thumbnail quality is the #1 driver of YouTube CTR. "
                           "A high-contrast custom thumbnail can improve clicks by 30–40%."})
        if tc < 5:
            s.append({"factor": "Tags", "impact": "medium",
                "message": f"Only {tc} tag(s) added. Use 8–12 specific tags for better search discoverability."})

    elif platform == "twitter":
        if not inputs.get("has_media", False):
            s.append({"factor": "Media", "impact": "medium",
                "message": "Tweets with images receive ~35% more retweets. Add a visual to boost reach."})
        tweet_len = len((inputs.get("text") or ""))
        if tweet_len < 60:
            s.append({"factor": "Tweet Length", "impact": "low",
                "message": "Tweets between 100–200 characters tend to get higher engagement."})

    # 6. Audience size
    if features["follower_scale"] < 0.12:
        s.append({"factor": "Audience Size", "impact": "high",
            "message": "A smaller audience limits absolute reach. Consistent posting and "
                       "community engagement compound follower growth over time."})

    # 7. Category-specific tips
    tips = {
        "Tech":          "Tech content performs best as tutorials, comparisons, or tool demos. Use specific technical keywords.",
        "Entertainment": "Hook viewers in the first 2 seconds — front-load your most compelling moment.",
        "Fashion":       "Natural lighting and aesthetic consistency drive Fashion engagement. Outfit Reels outperform selfies.",
        "Fitness":       "Before/after progressions and workout breakdowns drive high save rates in Fitness content.",
        "Food":          "Step-by-step cooking visuals earn 3× more saves than plating-only shots.",
        "Education":     "Front-load the key insight. Numbered captions boost completion and share rates.",
        "Travel":        "Local hidden gems and budget tips outperform luxury showcase content for most audiences.",
        "Business":      "Data-backed claims and practical frameworks outperform motivational content in Business.",
    }
    if category in tips and len(s) < 6:
        s.append({"factor": f"{category} Tip", "impact": "medium", "message": tips[category]})

    return s


# ── Step 18 — Post-mode: calculate actual ER ─────────────────────────────────
def calculate_actual_er(likes: int, comments: int, shares: int, followers: int) -> Dict:
    """
    Post-mode actual ER calculation.
    Actual ER = (likes + comments + shares) / followers × 100
    """
    total      = likes + comments + shares
    followers  = max(1, followers)
    actual_er  = round(min((total / followers) * 100, 100.0), 3)
    return {
        "actual_er":          actual_er,
        "total_interactions": total,
        "breakdown": {
            "likes":    likes,
            "comments": comments,
            "shares":   shares,
        },
    }