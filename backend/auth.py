from datetime import datetime, timedelta
from typing import Optional
import bcrypt
from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from database import get_db, User

import os

SECRET_KEY  = os.environ.get("SECRET_KEY", "local-dev-only-key-not-for-production")
ALGORITHM   = "HS256"
EXPIRE_MINS = 60 * 24

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/login")


def hash_password(password: str) -> str:
    # Truncate to 72 bytes — bcrypt hard limit
    pw_bytes = password.encode("utf-8")[:72]
    return bcrypt.hashpw(pw_bytes, bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    pw_bytes     = plain.encode("utf-8")[:72]
    hashed_bytes = hashed.encode("utf-8")
    return bcrypt.checkpw(pw_bytes, hashed_bytes)


def create_access_token(data: dict, expires: Optional[timedelta] = None):
    payload = data.copy()
    payload["exp"] = datetime.utcnow() + (expires or timedelta(minutes=EXPIRE_MINS))
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if not email:
            raise exc
    except JWTError:
        raise exc
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise exc
    return user
