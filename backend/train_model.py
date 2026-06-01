"""
EngageAI — XGBoost Model Trainer
Trains one model per platform on synthetic dataset.
Target: engagement_rate (%)
"""

import os
import pickle
import numpy as np
import pandas as pd
from xgboost import XGBRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from generate_dataset import generate_full_dataset

# Feature columns fed into XGBoost
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

TARGET     = "engagement_rate"
PLATFORMS  = ["instagram", "youtube", "twitter"]
MODEL_DIR  = "models"


def train_models(dataset_path: str = "dataset.csv"):
    if not os.path.exists(dataset_path):
        generate_full_dataset(dataset_path)

    df = pd.read_csv(dataset_path)
    os.makedirs(MODEL_DIR, exist_ok=True)
    all_metrics = {}

    for platform in PLATFORMS:
        pf = df[df["platform"] == platform].copy()
        print(f"\n[{platform.upper()}]  {len(pf)} rows")

        # Ensure all feature cols exist
        for col in FEATURE_COLS:
            if col not in pf.columns:
                pf[col] = 0.0

        X = pf[FEATURE_COLS].fillna(0.0)
        y = pf[TARGET].values

        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.15, random_state=42
        )

        model = XGBRegressor(
            n_estimators=500,
            learning_rate=0.03,
            max_depth=6,
            subsample=0.8,
            colsample_bytree=0.8,
            reg_lambda=0.5,      # reduced regularisation — allows more variance
            reg_alpha=0.1,       # light L1 to keep important features
            min_child_weight=3,
            random_state=42,
            tree_method="hist",
            verbosity=0,
        )
        model.fit(
            X_train, y_train,
            eval_set=[(X_test, y_test)],
            verbose=False,
        )

        preds = np.maximum(model.predict(X_test), 0.0)
        mae   = float(mean_absolute_error(y_test, preds))
        rmse  = float(np.sqrt(mean_squared_error(y_test, preds)))
        r2    = float(r2_score(y_test, preds))
        print(f"  MAE={mae:.3f}%  RMSE={rmse:.3f}%  R²={r2:.4f}")

        importance = dict(zip(FEATURE_COLS, model.feature_importances_.tolist()))

        artifact = {
            "model":              model,
            "feature_cols":       FEATURE_COLS,
            "train_stats": {
                "mean": X_train.mean().to_dict(),
                "std":  X_train.std().to_dict(),
                "min":  X_train.min().to_dict(),
                "max":  X_train.max().to_dict(),
            },
            "metrics": {"mae": mae, "rmse": rmse, "r2": r2},
            "feature_importance": importance,
            "n_train": int(len(X_train)),
            "n_test":  int(len(X_test)),
        }

        with open(f"{MODEL_DIR}/{platform}_model.pkl", "wb") as f:
            pickle.dump(artifact, f)

        all_metrics[platform] = {"mae": mae, "rmse": rmse, "r2": r2}

    with open(f"{MODEL_DIR}/metrics.pkl", "wb") as f:
        pickle.dump(all_metrics, f)

    print(f"\n✓ Models saved to ./{MODEL_DIR}/")
    return all_metrics


if __name__ == "__main__":
    train_models()