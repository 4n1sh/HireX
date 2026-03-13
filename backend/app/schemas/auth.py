from pydantic import BaseModel, EmailStr


class SignupRequest(BaseModel):
    full_name: str
    email: str
    password: str
    role: str = "candidate"


class LoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict
