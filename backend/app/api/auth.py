"""Simple auth: reads user info from X- headers set by the frontend (Supabase handles real auth)."""

from uuid import UUID

from fastapi import Header, HTTPException


def get_current_user(
    x_user_id: str = Header(...),
    x_user_role: str = Header("candidate"),
    x_user_email: str = Header(""),
) -> dict:
    try:
        uid = UUID(x_user_id)
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid user id")

    return {"id": uid, "role": x_user_role, "email": x_user_email}
