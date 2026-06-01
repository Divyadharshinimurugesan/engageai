"""
EngageAI v3 — FastAPI Backend
All engagement outputs in Engagement Rate (%).
Includes post-mode: likes + comments + shares → actual ER.
"""

import json
import os
import pickle
from datetime import datetime
from typing import Optional

from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from auth import hash_password, verify_password, create_access_token, get_current_user
from database import create_tables, get_db, User, Prediction, ActualResult
from predictor import predict, load_artifact, calculate_actual_er

app = FastAPI(title="EngageAI API v3", version="3.0.0")

allowed_origins_env = os.environ.get("ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000")
allowed_origins = [o.strip() for o in allowed_origins_env.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup():
    create_tables()
    for p in ["instagram", "youtube", "twitter"]:
        if not os.path.exists(f"models/{p}_model.pkl"):
            print(f"[startup] Model missing for {p} — run: python train_model.py")


# ── Pydantic schemas ──────────────────────────────────────────────────────────

class SignupReq(BaseModel):
    email:    str
    username: str
    password: str


class PredictReq(BaseModel):
    platform: str
    inputs:   dict


class ActualReq(BaseModel):
    prediction_id: int
    likes:    int = Field(default=0, ge=0)
    comments: int = Field(default=0, ge=0)
    shares:   int = Field(default=0, ge=0)


class UpdateMeReq(BaseModel):
    username:           Optional[str] = None
    preferred_platform: Optional[str] = None
    preferred_category: Optional[str] = None


# ── Auth ──────────────────────────────────────────────────────────────────────

@app.post("/signup")
def signup(req: SignupReq, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == req.email).first():
        raise HTTPException(400, "Email already registered")
    user = User(email=req.email, username=req.username, hashed_password=hash_password(req.password))
    db.add(user); db.commit(); db.refresh(user)
    token = create_access_token({"sub": user.email})
    return {"access_token": token, "token_type": "bearer", "username": user.username, "email": user.email}


@app.post("/login")
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form.username).first()
    if not user or not verify_password(form.password, user.hashed_password):
        raise HTTPException(401, "Incorrect email or password")
    token = create_access_token({"sub": user.email})
    return {"access_token": token, "token_type": "bearer", "username": user.username, "email": user.email}


@app.get("/me")
def get_me(u: User = Depends(get_current_user)):
    return {"id": u.id, "email": u.email, "username": u.username,
            "preferred_platform": u.preferred_platform or "",
            "preferred_category": u.preferred_category or ""}


@app.patch("/me")
def update_me(req: UpdateMeReq, db: Session = Depends(get_db), u: User = Depends(get_current_user)):
    if req.username           is not None: u.username           = req.username
    if req.preferred_platform is not None: u.preferred_platform = req.preferred_platform
    if req.preferred_category is not None: u.preferred_category = req.preferred_category
    db.commit(); db.refresh(u)
    return {"status": "ok", "username": u.username,
            "preferred_platform": u.preferred_platform,
            "preferred_category": u.preferred_category}


# ── Predict ───────────────────────────────────────────────────────────────────

@app.post("/predict")
def make_prediction(
    req: PredictReq,
    db: Session = Depends(get_db),
    u:  User    = Depends(get_current_user),
):
    platform = req.platform.lower()
    if platform not in ["instagram", "youtube", "twitter"]:
        raise HTTPException(400, "Unsupported platform")

    def to_int(v, default=0):
        try: return int(float(str(v))) if v not in ("", None) else default
        except: return default

    def to_float(v, default=0.0):
        try: return float(str(v)) if v not in ("", None) else default
        except: return default

    inp = dict(req.inputs)

    inp["followers"]     = to_int(inp.get("followers",     inp.get("subscribers", 1)), 1)
    inp["hashtag_count"] = to_int(inp.get("hashtag_count", 0), 0)
    inp["hour"]          = to_int(inp.get("hour",  12), 12)
    inp["day"]           = to_int(inp.get("day",   0),  0)
    inp["month"]         = to_int(inp.get("month", 1),  1)
    if "video_length" in inp:
        inp["video_length"] = to_float(inp.get("video_length", 600), 600)

    print(f"\n[DEBUG] Platform: {platform}")
    print(f"[DEBUG] Coerced inputs: followers={inp['followers']}, "
          f"hashtag_count={inp['hashtag_count']}, hour={inp['hour']}, "
          f"day={inp['day']}, month={inp['month']}, "
          f"category={inp.get('content_category','')}, "
          f"media_type={inp.get('media_type','')}, "
          f"has_media={inp.get('has_media','')}")

    if inp["followers"] <= 0:
        raise HTTPException(422, "Followers must be greater than 0")
    if not (0 <= inp["hashtag_count"] <= 30):
        raise HTTPException(422, "Hashtag count must be between 0 and 30")

    try:
        result = predict(platform, inp)
    except FileNotFoundError as e:
        raise HTTPException(503, str(e))
    except Exception as e:
        import traceback
        print(f"[DEBUG] Prediction error: {traceback.format_exc()}")
        raise HTTPException(500, f"Prediction error: {e}")

    print(f"[DEBUG] Engagement Rate: {result['engagement_rate']}%  "
          f"Confidence: {result['confidence']}  "
          f"Seasonal: x{result['seasonal']['boost']}  "
          f"Trend: +{result['trend']['boost']}")

    rec = Prediction(
        user_id=u.id, platform=platform,
        inputs=json.dumps(inp),
        engagement_rate=result["engagement_rate"],
        estimated_engagement=result["estimated_engagement"],
        confidence=result["confidence"],
        seasonal_boost=result["seasonal"]["boost"],
        trend_boost=result["trend"]["boost"],
        seasonal_reason=result["seasonal"]["reason"],
        trend_label=result["trend"]["label"],
        detected_category=result["trend"]["category"],
        text_source=result["text_source"],
        language_warning=result.get("language_warning") or "",
    )
    db.add(rec); db.commit(); db.refresh(rec)
    result["prediction_id"] = rec.id
    return result


# ── Post-mode actual ER ───────────────────────────────────────────────────────

@app.post("/actual-result")
def submit_actual(
    req: ActualReq,
    db: Session = Depends(get_db),
    u:  User    = Depends(get_current_user),
):
    pred = db.query(Prediction).filter(
        Prediction.id == req.prediction_id, Prediction.user_id == u.id
    ).first()
    if not pred:
        raise HTTPException(404, "Prediction not found")

    inp   = json.loads(pred.inputs)
    followers = int(inp.get("followers", inp.get("subscribers", 1)) or 1)
    actual = calculate_actual_er(req.likes, req.comments, req.shares, followers)

    db.query(ActualResult).filter(ActualResult.prediction_id == req.prediction_id).delete()

    predicted_er = pred.engagement_rate
    actual_er    = actual["actual_er"]
    error_pct    = round(abs(predicted_er - actual_er) / max(actual_er, 0.01) * 100, 2)

    ar = ActualResult(
        prediction_id=pred.id, user_id=u.id,
        actual_er=actual_er,
        likes=req.likes, comments=req.comments, shares=req.shares,
        error_pct=error_pct,
    )
    db.add(ar); db.commit()

    return {
        "status":        "ok",
        "predicted_er":  predicted_er,
        "actual_er":     actual_er,
        "error_pct":     error_pct,
        "breakdown":     actual["breakdown"],
    }


# ── History ───────────────────────────────────────────────────────────────────

@app.get("/history")
def get_history(limit: int = 80, db: Session = Depends(get_db), u: User = Depends(get_current_user)):
    preds = (
        db.query(Prediction)
        .filter(Prediction.user_id == u.id)
        .order_by(Prediction.created_at.desc())
        .limit(limit).all()
    )
    out = []
    for p in preds:
        ar = db.query(ActualResult).filter(ActualResult.prediction_id == p.id).first()
        out.append({
            "id":                   p.id,
            "platform":             p.platform,
            "inputs":               json.loads(p.inputs),
            "engagement_rate":      p.engagement_rate,
            "estimated_engagement": p.estimated_engagement,
            "confidence":           p.confidence,
            "seasonal_boost":       p.seasonal_boost,
            "trend_boost":          p.trend_boost,
            "seasonal_reason":      p.seasonal_reason,
            "trend_label":          p.trend_label,
            "detected_category":    p.detected_category,
            "text_source":          p.text_source,
            "language_warning":     p.language_warning,
            "created_at":           p.created_at.isoformat(),
            "actual_er":            ar.actual_er    if ar else None,
            "error_pct":            ar.error_pct    if ar else None,
            "actual_likes":         ar.likes        if ar else None,
            "actual_comments":      ar.comments     if ar else None,
            "actual_shares":        ar.shares       if ar else None,
        })
    return out


# ── Delete History ────────────────────────────────────────────────────────────

@app.delete("/history/{id}")
def delete_history(id: int, db: Session = Depends(get_db), u: User = Depends(get_current_user)):
    record = db.query(Prediction).filter(Prediction.id == id, Prediction.user_id == u.id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    db.query(ActualResult).filter(ActualResult.prediction_id == id).delete()
    db.delete(record)
    db.commit()
    return {"message": "Deleted successfully"}


# ── Analytics ─────────────────────────────────────────────────────────────────

@app.get("/analytics")
def analytics(db: Session = Depends(get_db), u: User = Depends(get_current_user)):
    preds   = db.query(Prediction).filter(Prediction.user_id == u.id).all()
    actuals = db.query(ActualResult).filter(ActualResult.user_id == u.id).all()

    total         = len(preds)
    plat_counts   = {}
    plat_er_vals  = {}
    cat_counts    = {}

    for p in preds:
        plat_counts[p.platform] = plat_counts.get(p.platform, 0) + 1
        plat_er_vals.setdefault(p.platform, []).append(p.engagement_rate)
        cat = p.detected_category or "General"
        cat_counts[cat] = cat_counts.get(cat, 0) + 1

    plat_avg_er = {k: round(sum(v) / len(v), 2) for k, v in plat_er_vals.items()}

    actual_records = []
    for ar in actuals:
        pred = db.query(Prediction).filter(Prediction.id == ar.prediction_id).first()
        if pred:
            actual_records.append({
                "predicted_er": pred.engagement_rate,
                "actual_er":    ar.actual_er,
                "error_pct":    ar.error_pct,
                "platform":     pred.platform,
                "category":     pred.detected_category,
                "created_at":   ar.created_at.isoformat(),
            })

    avg_error = (
        round(sum(r["error_pct"] for r in actual_records) / len(actual_records), 2)
        if actual_records else None
    )

    from datetime import timedelta
    now    = datetime.utcnow()
    weekly = [
        {"date": (now - timedelta(days=i)).strftime("%b %d"),
         "count": sum(1 for p in preds if p.created_at.date() == (now - timedelta(days=i)).date())}
        for i in range(6, -1, -1)
    ]

    return {
        "total_predictions": total,
        "platform_counts":   plat_counts,
        "platform_avg_er":   plat_avg_er,
        "category_counts":   cat_counts,
        "actual_records":    actual_records[-20:],
        "avg_error_pct":     avg_error,
        "weekly_activity":   weekly,
    }


# ── Model metrics ─────────────────────────────────────────────────────────────

@app.get("/model-metrics")
def model_metrics(u: User = Depends(get_current_user)):
    path = "models/metrics.pkl"
    if not os.path.exists(path):
        raise HTTPException(503, "Models not trained. Run: python train_model.py")
    with open(path, "rb") as f:
        metrics = pickle.load(f)
    result = {}
    for platform, m in metrics.items():
        try:
            art = load_artifact(platform)
            result[platform] = {**m, "feature_importance": art.get("feature_importance", {}),
                                "n_train": art.get("n_train", 0), "n_test": art.get("n_test", 0)}
        except Exception:
            result[platform] = m
    return result


# ── Health ────────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "version": "3.0.0"}