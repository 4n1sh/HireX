"""JWT-based authentication for FastAPI."""

import os
from datetime import datetime, timedelta, timezone
from typing import Optional
from uuid import UUID

from dotenv import load_dotenv
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
import bcrypt
from pydantic import BaseModel
from sqlalchemy.orm import Session

load_dotenv()

from app.db.database import get_db
from app.models.user import User
from app.schemas.auth import LoginRequest, SignupRequest, TokenResponse

SECRET_KEY = os.getenv("JWT_SECRET_KEY", "change-me-to-a-random-secret-key")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

router = APIRouter(prefix="/api/auth", tags=["Auth"])


def _ensure_not_blacklisted(user: User) -> None:
    if user.is_blacklisted:
        raise HTTPException(status_code=403, detail="Account is blacklisted")


def _create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def _user_dict(user: User) -> dict:
    return {
        "id": user.id,
        "full_name": user.full_name,
        "email": user.email,
        "role": user.role,
    }


# ── Dependency: extracts current user from Bearer token ──

def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> dict:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired token",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise credentials_exception

    _ensure_not_blacklisted(user)

    return _user_dict(user)


# ── Endpoints ────────────────────────────────────────────

@router.post("/signup", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def signup(body: SignupRequest, db: Session = Depends(get_db)):
    if body.role not in ("candidate", "hr"):
        raise HTTPException(status_code=400, detail="Role must be 'candidate' or 'hr'")

    existing = db.query(User).filter(User.email == body.email).first()
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")

    user = User(
        full_name=body.full_name,
        email=body.email,
        hashed_password=bcrypt.hashpw(body.password.encode(), bcrypt.gensalt()).decode(),
        role=body.role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = _create_access_token({"sub": str(user.id)})
    return TokenResponse(access_token=token, user={**_user_dict(user), "id": str(user.id)})


@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email).first()
    if not user or not bcrypt.checkpw(body.password.encode(), user.hashed_password.encode()):
        raise HTTPException(status_code=401, detail="Incorrect email or password")

    _ensure_not_blacklisted(user)

    token = _create_access_token({"sub": str(user.id)})
    return TokenResponse(access_token=token, user={**_user_dict(user), "id": str(user.id)})


@router.get("/me")
def get_me(current_user: dict = Depends(get_current_user)):
    return {**current_user, "id": str(current_user["id"])}


class UpdateProfileRequest(BaseModel):
    full_name: Optional[str] = None
    current_password: Optional[str] = None
    new_password: Optional[str] = None


@router.put("/me")
def update_me(
    body: UpdateProfileRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == current_user["id"]).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if body.full_name is not None:
        user.full_name = body.full_name.strip() or user.full_name

    if body.new_password:
        if not body.current_password:
            raise HTTPException(status_code=400, detail="Current password required")
        if not bcrypt.checkpw(body.current_password.encode(), user.hashed_password.encode()):
            raise HTTPException(status_code=400, detail="Current password is incorrect")
        user.hashed_password = bcrypt.hashpw(body.new_password.encode(), bcrypt.gensalt()).decode()

    db.commit()
    db.refresh(user)
    return {**_user_dict(user), "id": str(user.id)}
