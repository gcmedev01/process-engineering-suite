"""Reusable FastAPI auth dependencies."""
import logging

import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from .config import get_settings
from .dependencies import DAL

logger = logging.getLogger(__name__)
_security = HTTPBearer()


def decode_token(token: str) -> dict:
    """Decode and validate a JWT token. Raises 401 on failure."""
    settings = get_settings()
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


def get_token_payload(
    creds: HTTPAuthorizationCredentials = Depends(_security),
) -> dict:
    return decode_token(creds.credentials)


async def get_current_user(
    payload: dict = Depends(get_token_payload),
    dal: DAL = None,  # injected by FastAPI via Annotated[..., Depends(get_dal)]
) -> dict:
    """Resolve the JWT subject to a real user record."""
    user_id: str = payload.get("sub", "")
    user = await dal.get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    # Normalise ORM instance vs dict (MockService returns dicts, DB returns ORM)
    status = user.status if hasattr(user, "status") else user.get("status")
    if status != "active":
        raise HTTPException(status_code=403, detail="User account is inactive")

    return user


async def require_admin(user: dict = Depends(get_current_user)) -> dict:
    """Raise 403 unless the current user is an admin."""
    role = user.role if hasattr(user, "role") else user.get("role")
    if role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user
