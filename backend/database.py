from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, Text, ForeignKey, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime

DATABASE_URL = "sqlite:///./engageai.db"
engine       = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base         = declarative_base()


class User(Base):
    __tablename__ = "users"
    id                 = Column(Integer, primary_key=True, index=True)
    email              = Column(String, unique=True, index=True, nullable=False)
    username           = Column(String, nullable=False)
    hashed_password    = Column(String, nullable=False)
    preferred_platform = Column(String, default="")
    preferred_category = Column(String, default="")
    created_at         = Column(DateTime, default=datetime.utcnow)


class Prediction(Base):
    __tablename__ = "predictions"
    id                  = Column(Integer, primary_key=True, index=True)
    user_id             = Column(Integer, ForeignKey("users.id"), nullable=False)
    platform            = Column(String, nullable=False)
    inputs              = Column(Text, nullable=False)          # JSON
    engagement_rate     = Column(Float, nullable=False)         # predicted ER %
    estimated_engagement = Column(Float, default=0.0)           # absolute count
    confidence          = Column(Float, nullable=False)
    seasonal_boost      = Column(Float, default=1.0)
    trend_boost         = Column(Float, default=0.0)
    seasonal_reason     = Column(String, default="")
    trend_label         = Column(String, default="")
    detected_category   = Column(String, default="")
    text_source         = Column(String, default="")
    language_warning    = Column(String, default="")
    created_at          = Column(DateTime, default=datetime.utcnow)


class ActualResult(Base):
    __tablename__ = "actual_results"
    id                   = Column(Integer, primary_key=True, index=True)
    prediction_id        = Column(Integer, ForeignKey("predictions.id"), nullable=False)
    user_id              = Column(Integer, ForeignKey("users.id"), nullable=False)
    actual_er            = Column(Float, nullable=False)    # %
    likes                = Column(Integer, default=0)
    comments             = Column(Integer, default=0)
    shares               = Column(Integer, default=0)
    error_pct            = Column(Float, nullable=False)
    created_at           = Column(DateTime, default=datetime.utcnow)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_tables():
    Base.metadata.create_all(bind=engine)
