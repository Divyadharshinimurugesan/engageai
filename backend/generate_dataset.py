"""
EngageAI — Synthetic Dataset Generator
Produces 15,000 rows across Instagram, YouTube, Twitter.
Target: engagement_rate (%) = interactions / followers * 100
All 8 categories: Fashion, Food, Tech, Education, Entertainment, Fitness, Travel, Business
"""

import numpy as np
import pandas as pd
import random
import math

np.random.seed(42)
random.seed(42)

CATEGORIES = ["Fashion", "Food", "Tech", "Education", "Entertainment", "Fitness", "Travel", "Business"]

# Per-category base engagement rate boost
# Base engagement rate in % (e.g. 5.5 means 5.5% ER)
# Realistic platform averages: Instagram 1-8%, YouTube 2-10%, Twitter 0.5-5%
CATEGORY_BASE_ER = {
    "Fashion": 6.5, "Food": 5.8, "Tech": 5.2,
    "Education": 3.8, "Entertainment": 7.5, "Fitness": 6.0,
    "Travel": 5.5, "Business": 3.2,
}

# Media multipliers (Instagram)
MEDIA_MULT = {"Reel": 1.40, "Carousel": 1.18, "Post": 1.00}

# Category multipliers — widened range so XGBoost learns real differences
CAT_MULT = {
    "Fashion": 1.25, "Food": 1.18, "Tech": 1.10,
    "Education": 0.90, "Entertainment": 1.30, "Fitness": 1.20,
    "Travel": 1.15, "Business": 0.85,
}

SAMPLE_TEXTS = {
    "Fashion": [
        "New outfit drop! Love this look for the season #ootd #fashion",
        "Style tip: layer your pieces for a chic look this winter",
        "My favourite summer dress haul — swipe for all the details!",
    ],
    "Food": [
        "Easy pasta recipe in 15 minutes! Try this at home 🍝",
        "My go-to healthy breakfast bowl — nutritious and delicious",
        "Best street food tour — you won't believe the flavours!",
    ],
    "Tech": [
        "How to build a Python app from scratch — full tutorial",
        "Top 5 AI tools changing the way we work in 2024",
        "Honest review of the new MacBook after 3 months of use",
    ],
    "Education": [
        "Study with me — 4-hour session with Pomodoro technique",
        "Learn this skill in 30 days — step by step guide",
        "How I passed my exam with this simple revision method",
    ],
    "Entertainment": [
        "Reacting to the most viral videos of the week 😂",
        "Day in my life vlog — unexpected things happened!",
        "Trying the most popular food hacks — do they work?",
    ],
    "Fitness": [
        "Full body workout you can do at home — no equipment needed",
        "My 6-week transformation — diet + workout plan revealed",
        "Morning routine that changed my energy levels completely",
    ],
    "Travel": [
        "Hidden gems in Bali you need to visit before they blow up",
        "Budget travel guide — Europe in 2 weeks for under ₹50k",
        "Best solo travel tips for first-time travellers",
    ],
    "Business": [
        "How I grew my business from zero to 1 lakh in 6 months",
        "Marketing strategy that 10x my sales — real breakdown",
        "Startup lessons nobody talks about — honest experience",
    ],
}


def hour_dist():
    w = np.array([
        0.5, 0.3, 0.2, 0.2, 0.3, 0.6,
        1.5, 2.5, 3.0, 2.8, 2.0, 3.0,
        3.5, 3.2, 2.5, 2.0, 2.2, 2.5,
        3.0, 3.5, 3.0, 2.5, 1.5, 0.8,
    ], dtype=float)
    return w / w.sum()


def time_score(hour: int, day: int) -> float:
    hs = {
        0: 0.18, 1: 0.10, 2: 0.08, 3: 0.08, 4: 0.12, 5: 0.28,
        6: 0.65, 7: 0.82, 8: 0.90, 9: 0.78, 10: 0.62,
        11: 0.82, 12: 0.95, 13: 0.88, 14: 0.68, 15: 0.62,
        16: 0.68, 17: 0.74, 18: 0.88, 19: 0.95, 20: 0.84,
        21: 0.70, 22: 0.50, 23: 0.32,
    }
    ds = {0: 0.74, 1: 0.70, 2: 0.74, 3: 0.80, 4: 0.84, 5: 1.00, 6: 0.95}
    return hs.get(hour, 0.5) * ds.get(day, 0.76)


def seasonal_boost(month: int, category: str, text: str) -> float:
    """
    Step 8 — seasonal boost/penalty based on month + keywords in text.
    Returns a multiplier (>1 = boost, <1 = penalty).
    """
    text_l = text.lower()
    boost = 1.0

    # January — Pongal/Makar Sankranti boost; generic post-new-year dip
    if month == 1:
        if any(k in text_l for k in ["pongal", "harvest", "sankranti", "new year", "resolution"]):
            boost = 1.18
        else:
            boost = 1.10  # general new-year engagement

    # February — Valentine boost; penalty for irrelevant content
    elif month == 2:
        if any(k in text_l for k in ["love", "valentine", "heart", "romance", "date"]):
            boost = 1.15
        elif category in ("Business", "Tech"):
            boost = 0.95  # slightly penalised during heavy lifestyle month

    # March — Holi boost for colorful/festive content
    elif month == 3:
        if any(k in text_l for k in ["holi", "color", "colour", "festival", "spring"]):
            boost = 1.18
        else:
            boost = 1.08

    # April — IPL season; sports/entertainment boost
    elif month == 4:
        if any(k in text_l for k in ["ipl", "cricket", "match", "game", "sports"]):
            boost = 1.22
        elif category == "Entertainment":
            boost = 1.15
        else:
            boost = 1.10

    # May — pre-summer; travel/fashion boost
    elif month == 5:
        if category in ("Travel", "Fashion", "Fitness"):
            boost = 1.12
        else:
            boost = 1.05

    # June — monsoon; food/lifestyle boost
    elif month == 6:
        if any(k in text_l for k in ["monsoon", "rain", "chai", "coffee", "cozy"]):
            boost = 1.10
        elif category in ("Food", "Education"):
            boost = 1.06
        else:
            boost = 1.02

    # July — mid-year; moderate
    elif month == 7:
        boost = 1.05

    # August — Independence Day boost for patriotic content
    elif month == 8:
        if any(k in text_l for k in ["independence", "patriot", "india", "freedom", "tricolor"]):
            boost = 1.20
        else:
            boost = 1.10

    # September — pre-festive ramp-up
    elif month == 9:
        boost = 1.10

    # October — Navratri / Dussehra
    elif month == 10:
        if any(k in text_l for k in ["navratri", "dussehra", "garba", "festival", "dandiya"]):
            boost = 1.25
        else:
            boost = 1.18

    # November — Diwali — highest month
    elif month == 11:
        if any(k in text_l for k in ["diwali", "deepavali", "diya", "lights", "celebration"]):
            boost = 1.35
        else:
            boost = 1.22

    # December — Christmas / year-end
    elif month == 12:
        if any(k in text_l for k in ["christmas", "xmas", "new year", "year end", "holiday"]):
            boost = 1.25
        else:
            boost = 1.18

    return boost


def sentiment_score(text: str) -> float:
    """Simple rule-based sentiment without TextBlob dependency at training time."""
    pos = ["love", "amazing", "great", "best", "happy", "excited", "awesome",
           "wonderful", "beautiful", "fantastic", "enjoy", "perfect", "good"]
    neg = ["hate", "bad", "worst", "boring", "terrible", "awful", "horrible",
           "disappointing", "failure", "not good", "dislike"]
    tl = text.lower()
    score = sum(1 for w in pos if w in tl) - sum(1 for w in neg if w in tl)
    return max(-1.0, min(1.0, score * 0.15))


def content_quality(text: str) -> float:
    """Rule-based content quality score 0–1."""
    tl = text.lower()
    score = 0.4
    # length bonus
    words = len(text.split())
    score += min(0.2, words / 100.0)
    # engagement phrases
    phrases = ["how to", "step by step", "guide", "tips", "honest review",
               "transformation", "best", "ultimate", "revealed", "secret"]
    score += min(0.2, sum(0.04 for p in phrases if p in tl))
    # emoji / punctuation variety
    if any(ord(c) > 127 for c in text): score += 0.08
    if "?" in text: score += 0.06
    if "!" in text: score += 0.06
    return min(1.0, score)


def hashtag_efficiency(count: int, platform: str) -> float:
    optimal = {"instagram": 12, "youtube": 10, "twitter": 2}
    opt = optimal.get(platform, 10)
    return max(0.1, 1.0 - abs(count - opt) / (opt + 10))


def generate_instagram(n: int) -> pd.DataFrame:
    rows = []
    media_options = ["Post", "Reel", "Carousel"]
    media_weights = [0.40, 0.42, 0.18]

    for _ in range(n):
        cat   = random.choice(CATEGORIES)
        text  = random.choice(SAMPLE_TEXTS[cat])
        media = np.random.choice(media_options, p=media_weights)
        followers = int(np.random.lognormal(8.5, 1.8))
        followers = max(100, min(followers, 10_000_000))
        hc    = np.random.randint(0, 31)
        hour  = np.random.choice(range(24), p=hour_dist())
        day   = np.random.randint(0, 7)
        month = np.random.randint(1, 13)

        fs   = math.log1p(followers) / math.log1p(10_000_000)
        ts   = time_score(hour, day)
        he   = hashtag_efficiency(hc, "instagram")
        sent = sentiment_score(text)
        cq   = content_quality(text)
        mm   = MEDIA_MULT[media]
        cm   = CAT_MULT[cat]
        sb   = seasonal_boost(month, cat, text)

        base_er = CATEGORY_BASE_ER[cat]
        er = base_er * (
            0.30 * fs + 0.20 * ts + 0.12 * he +
            0.18 * cq + 0.10 * max(0, (sent + 1) / 2) + 0.10 * np.random.beta(2, 2)
        ) * mm * cm * sb
        # Scale to realistic ER range: Poor=1-3%, Average=3-6%, Good=6-10%, Excellent=10-20%
        er = er * 2.5
        er = round(max(0.5, min(er, 35.0)) * np.random.uniform(0.80, 1.20), 2)

        rows.append({
            "platform": "instagram", "category": cat, "media_type": media,
            "text": text, "followers": followers, "hashtag_count": hc,
            "hour": hour, "day": day, "month": month,
            "follower_scale": round(fs, 6), "time_score": round(ts, 6),
            "hashtag_efficiency": round(he, 6), "content_quality": round(cq, 6),
            "sentiment_score": round(sent, 6),
            "category_multiplier": cm, "media_multiplier": mm, "seasonal_boost": round(sb, 4),
            "video_length": 0.0, "thumbnail_quality": 1.0, "has_media": 0.0,
            "engagement_rate": er,
        })
    return pd.DataFrame(rows)


def generate_youtube(n: int) -> pd.DataFrame:
    rows = []
    tq_opts = ["Low", "Medium", "High"]
    tq_w    = [0.15, 0.55, 0.30]
    tq_mult = {"Low": 0.60, "Medium": 1.00, "High": 1.40}
    vt_opts = ["Short", "Long"]
    vt_mult = {"Short": 1.22, "Long": 1.00}

    for _ in range(n):
        cat   = random.choice(CATEGORIES)
        text  = random.choice(SAMPLE_TEXTS[cat])
        tq    = np.random.choice(tq_opts, p=tq_w)
        vt    = np.random.choice(vt_opts, p=[0.32, 0.68])
        vlen  = np.random.randint(15, 120) if vt == "Short" else np.random.randint(300, 3600)
        subs  = int(np.random.lognormal(9.0, 2.0))
        subs  = max(50, min(subs, 50_000_000))
        hc    = np.random.randint(0, 21)
        hour  = np.random.choice(range(24), p=hour_dist())
        day   = np.random.randint(0, 7)
        month = np.random.randint(1, 13)

        fs   = math.log1p(subs) / math.log1p(50_000_000)
        ts   = time_score(hour, day)
        he   = hashtag_efficiency(hc, "youtube")
        sent = sentiment_score(text)
        cq   = content_quality(text)
        mm   = tq_mult[tq] * vt_mult[vt]
        cm   = CAT_MULT[cat]
        sb   = seasonal_boost(month, cat, text)

        base_er = CATEGORY_BASE_ER[cat]
        er = base_er * (
            0.30 * fs + 0.20 * ts + 0.10 * he +
            0.18 * cq + 0.10 * max(0, (sent + 1) / 2) + 0.12 * np.random.beta(2, 2)
        ) * mm * cm * sb
        er = er * 2.5
        er = round(max(0.5, min(er, 25.0)) * np.random.uniform(0.80, 1.20), 2)

        rows.append({
            "platform": "youtube", "category": cat, "media_type": vt,
            "text": text, "followers": subs, "hashtag_count": hc,
            "hour": hour, "day": day, "month": month,
            "follower_scale": round(fs, 6), "time_score": round(ts, 6),
            "hashtag_efficiency": round(he, 6), "content_quality": round(cq, 6),
            "sentiment_score": round(sent, 6),
            "category_multiplier": cm, "media_multiplier": mm, "seasonal_boost": round(sb, 4),
            "video_length": float(vlen), "thumbnail_quality": tq_mult[tq], "has_media": 0.0,
            "engagement_rate": er,
        })
    return pd.DataFrame(rows)


def generate_twitter(n: int) -> pd.DataFrame:
    rows = []
    for _ in range(n):
        cat       = random.choice(CATEGORIES)
        text      = random.choice(SAMPLE_TEXTS[cat])
        followers = int(np.random.lognormal(7.5, 1.6))
        followers = max(10, min(followers, 5_000_000))
        has_media = np.random.choice([0.0, 1.0], p=[0.45, 0.55])
        hc        = np.random.randint(0, 6)
        hour      = np.random.choice(range(24), p=hour_dist())
        day       = np.random.randint(0, 7)
        month     = np.random.randint(1, 13)

        fs   = math.log1p(followers) / math.log1p(5_000_000)
        ts   = time_score(hour, day)
        he   = hashtag_efficiency(hc, "twitter")
        sent = sentiment_score(text)
        cq   = content_quality(text)
        mm   = 1.30 if has_media else 1.00
        cm   = CAT_MULT[cat]
        sb   = seasonal_boost(month, cat, text)

        base_er = CATEGORY_BASE_ER[cat]
        er = base_er * (
            0.32 * fs + 0.22 * ts + 0.08 * he +
            0.15 * cq + 0.12 * max(0, (sent + 1) / 2) + 0.11 * np.random.beta(2, 2)
        ) * mm * cm * sb
        er = er * 2.0
        er = round(max(0.2, min(er, 15.0)) * np.random.uniform(0.75, 1.25), 2)

        rows.append({
            "platform": "twitter", "category": cat, "media_type": "Tweet",
            "text": text, "followers": followers, "hashtag_count": hc,
            "hour": hour, "day": day, "month": month,
            "follower_scale": round(fs, 6), "time_score": round(ts, 6),
            "hashtag_efficiency": round(he, 6), "content_quality": round(cq, 6),
            "sentiment_score": round(sent, 6),
            "category_multiplier": cm, "media_multiplier": mm, "seasonal_boost": round(sb, 4),
            "video_length": 0.0, "thumbnail_quality": 1.0, "has_media": has_media,
            "engagement_rate": er,
        })
    return pd.DataFrame(rows)


def generate_full_dataset(output_path: str = "dataset.csv") -> pd.DataFrame:
    print("Generating dataset...")
    ig = generate_instagram(6200)
    yt = generate_youtube(5000)
    tw = generate_twitter(3800)
    df = pd.concat([ig, yt, tw], ignore_index=True)
    df = df.sample(frac=1, random_state=42).reset_index(drop=True)
    df.to_csv(output_path, index=False)
    print(f"  Saved {len(df)} rows → {output_path}")
    print(f"  ER range: {df['engagement_rate'].min():.2f}% – {df['engagement_rate'].max():.2f}%")
    print(f"  ER mean:  {df['engagement_rate'].mean():.2f}%")
    return df


if __name__ == "__main__":
    generate_full_dataset()