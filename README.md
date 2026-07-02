# EngageAI v3

**Content Engagement Rate Predictor** — A Full stack web application that estimates social media engagement rate (%) before posting, using a real XGBoost ML model with NLP analysis, seasonal intelligence, and trend detection.

**Live Demo** - https://engageai-frontend-gamma.vercel.app/

---

## What It Does

EngageAI helps content creators:
- Estimate **Engagement Rate (%)** before posting on Instagram, YouTube, or Twitter
- Understand what factors drive or reduce performance
- Compare predicted vs actual performance after posting
- Get actionable posting-time and content improvement suggestions

---

## Project Structure

```
engageai/
├── backend/
│   ├── app.py                  ← FastAPI application (all endpoints)
│   ├── auth.py                 ← JWT authentication + bcrypt
│   ├── database.py             ← SQLAlchemy models (SQLite)
│   ├── predictor.py            ← Prediction engine (all logic)
│   ├── train_model.py          ← XGBoost training script
│   ├── generate_dataset.py     ← Synthetic dataset generator
│   └── requirements.txt
└── frontend/
    ├── package.json
    ├── public/index.html
    └── src/
        ├── App.jsx
        ├── index.css
        ├── index.js
        ├── components/
        │   ├── Navbar.jsx
        │   ├── ProtectedRoute.jsx
        │   └── ResultTabs.jsx       ← 7-tab result display
        ├── hooks/useAuth.js
        ├── pages/
        │   ├── Login.jsx
        │   ├── Dashboard.jsx
        │   ├── Analyzer.jsx         ← Main prediction form
        │   ├── History.jsx          ← Post-mode actual ER logging
        │   ├── Analytics.jsx
        │   └── Settings.jsx
        └── utils/api.js
```

---

## Quick Start

### Prerequisites
- Python 3.10+
- Node.js 18+

### 1. Backend Setup

```bash
cd engageai/backend

# Create and activate virtual environment
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Download TextBlob NLTK data (one-time)
python -c "import nltk; nltk.download('punkt'); nltk.download('averaged_perceptron_tagger')"

# Generate dataset + train models (takes 2-3 minutes)
python train_model.py

# Start API server
uvicorn app:app --reload --port 8000
```

API: http://localhost:8000
Swagger docs: http://localhost:8000/docs

### 2. Frontend Setup

```bash
cd engageai/frontend
npm install
npm start
```

App: http://localhost:3000

---

## Usage Guide

1. **Sign up** at `/login`
2. Go to **Analyzer** — select platform, fill in content details
3. Select a **Content Category** (Fashion, Food, Tech, etc.)
4. Paste your caption; optionally paste a **video transcript** for richer analysis
5. Click **Get Performance Estimate**
6. Explore the 7 result tabs:
   - **Overview** — ER gauge, seasonal & trend context, confidence
      - **Content Insights** — NLP radar, sentiment, top keywords
         - **Factors** — XGBoost feature importance chart
            - **Suggestions** — Actionable improvement recommendations
               - **Simulation** — Best posting hours chart
                  - **Post Mode** — Enter likes/comments/shares to compare predicted vs actual
                     - **Model Info** — MAE, RMSE, R² metrics
                     7. View past predictions in **History** (filter by platform)
                     8. Submit actual results → track accuracy in **Analytics**

                     ---

                     ## API Endpoints

                     | Method | Endpoint | Auth | Description |
                     |--------|----------|------|-------------|
                     | POST | /signup | No | Register new user |
                     | POST | /login | No | Login, returns JWT |
                     | GET | /me | Yes | Current user profile |
                     | PATCH | /me | Yes | Update username/preferences |
                     | POST | /predict | Yes | Run engagement rate prediction |
                     | GET | /history | Yes | User prediction history |
                     | POST | /actual-result | Yes | Submit actual post metrics |
                     | GET | /analytics | Yes | Aggregated analytics data |
                     | GET | /model-metrics | Yes | XGBoost evaluation metrics |
                     | GET | /health | No | Health check |

                     ---

                     ## ML Architecture

                     ### Model
                     - **Algorithm**: XGBRegressor (n_estimators=300, lr=0.05, max_depth=5, subsample=0.8)
                     - **Target**: Engagement Rate (%) = (interactions / followers) x 100
                     - **Training**: 15,000 synthetic records, 3 platform-specific models
                     - **Evaluation**: MAE, RMSE, R2 on 15% held-out test set

                     ### Features (14 total)
                     | Feature | Description |
                     |---------|-------------|
                     | follower_scale | log(followers) / log(platform_max) |
                     | time_score | hour x day peak-window score |
                     | hashtag_efficiency | distance from optimal count |
                     | content_quality | NLP composite (length, emoji, punctuation, subjectivity) |
                     | sentiment_score | TextBlob polarity -1 to +1 |
                     | category_multiplier | per-category weight |
                     | media_multiplier | Reel=1.40, Carousel=1.18, Post=1.00 |
                     | seasonal_boost | month x keyword multiplier |
                     | video_length | YouTube seconds |
                     | thumbnail_quality | Low=0.6, Medium=1.0, High=1.4 |
                     | has_media | Twitter media flag |
                     | month / day / hour | temporal features |

                     ### Explainable Boosts (post-prediction)
                     - **Seasonal**: month-specific festival keyword matching (Indian calendar)
                     - **Trend**: category keyword density boost

                     ---

                     ## Categories & Multipliers

                     | Category | Model Mult. | Trend Boost |
                     |----------|-------------|-------------|
                     | Fashion | 1.10 | +18% |
                     | Food | 1.08 | +10% |
                     | Tech | 1.05 | +18% |
                     | Education | 1.03 | +8% |
                     | Entertainment | 1.10 | +15% |
                     | Fitness | 1.07 | +12% |
                     | Travel | 1.06 | +10% |
                     | Business | 1.04 | +8% |

                     ---

                     ## Notes

                     - SQLite DB (`engageai.db`) is created automatically on first run
                     - Model files are stored in `backend/models/` after training
                     - Change `SECRET_KEY` in `auth.py` before deploying to production
                     - Re-run `python train_model.py` to retrain with a fresh dataset
                     
