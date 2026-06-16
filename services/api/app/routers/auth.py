"""Authentication API router."""
import logging
from datetime import datetime, timedelta
from typing import Optional

import bcrypt
from fastapi import APIRouter, Depends
from pydantic import BaseModel

from ..config import get_settings
from ..dependencies import DAL
from ..auth_deps import get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])
logger = logging.getLogger(__name__)


# --- Schemas ---

class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    accessToken: str
    tokenType: str = "bearer"
    expiresIn: int
    user: dict


class UserResponse(BaseModel):
    id: str
    name: str
    initials: Optional[str] = None
    email: str
    role: str
    status: str


# --- Helper Functions ---

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against a bcrypt hash."""
    try:
        return bcrypt.checkpw(
            plain_password.encode('utf-8'),
            hashed_password.encode('utf-8')
        )
    except Exception:
        return False


def create_access_token(user_id: str, role: str) -> tuple[str, int]:
    """Create a JWT access token."""
    import jwt
    settings = get_settings()
    expires_delta = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    expire = datetime.utcnow() + expires_delta

    payload = {
        "sub": user_id,
        "role": role,
        "exp": expire,
        "iat": datetime.utcnow(),
    }

    token = jwt.encode(payload, settings.SECRET_KEY, algorithm="HS256")
    return token, settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60


# --- Endpoints ---

@router.post("/login", response_model=LoginResponse)
async def login(data: LoginRequest, dal: DAL):
    """Authenticate user and return access token."""
    credential = await dal.get_credential_by_username(data.username)
    
    if not credential:
        raise HTTPException(status_code=401, detail="Invalid username or password")
    
    # Check if account is locked
    if hasattr(credential, "locked_until"):
        is_locked = (credential.locked_until is not None and 
                     datetime.utcnow() < credential.locked_until.replace(tzinfo=None))
    else:
        locked_until_str = credential.get("lockedUntil")
        is_locked = False
        if locked_until_str:
            try:
                lock_time = datetime.fromisoformat(locked_until_str.replace('Z', '+00:00'))
                is_locked = datetime.utcnow() < lock_time.replace(tzinfo=None)
            except ValueError:
                pass
    
    if is_locked:
        raise HTTPException(status_code=423, detail="Account is locked")
    
    # Verify password
    # For mock data, we do a simple check; for real data, use bcrypt
    if hasattr(credential, "password_hash"):
        password_hash = credential.password_hash
        credential_id = credential.id
        user_id = credential.user_id
    else:
        password_hash = credential.get("passwordHash", "")
        credential_id = credential.get("id")
        user_id = credential.get("userId")

    is_valid = False
    
    if password_hash.startswith("$2"):
        # bcrypt hash
        is_valid = verify_password(data.password, password_hash)
    else:
        # Plain text comparison for mock data migration
        # Also support mock credentials that store plain passwords
        is_valid = (credential.get("password") == data.password if not hasattr(credential, "password") 
                   else credential.password == data.password)
    
    if not is_valid:
        await dal.update_credential_login(credential_id, success=False)
        raise HTTPException(status_code=401, detail="Invalid username or password")
    
    # Get user
    user = await dal.get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    # Handle user as ORM or dict
    user_status = user.status if hasattr(user, "status") else user.get("status")
    if user_status != "active":
        raise HTTPException(status_code=403, detail="User account is inactive")
    
    # Update login success
    await dal.update_credential_login(credential_id, success=True)
    
    # Create token
    user_role = user.role if hasattr(user, "role") else user.get("role")
    token, expires_in = create_access_token(user_id, user_role)
    
    user_name = user.name if hasattr(user, "name") else user.get("name")
    user_initials = user.initials if hasattr(user, "initials") else user.get("initials")
    user_email = user.email if hasattr(user, "email") else user.get("email")

    return LoginResponse(
        accessToken=token,
        expiresIn=expires_in,
        user={
            "id": user_id,
            "name": user_name,
            "initials": user_initials,
            "email": user_email,
            "role": user_role,
        }
    )


@router.get("/me", response_model=UserResponse)
async def me(user=Depends(get_current_user)):
    """Get current authenticated user."""
    name = user.name if hasattr(user, "name") else user.get("name", "")
    initials = user.initials if hasattr(user, "initials") else user.get("initials")
    email = user.email if hasattr(user, "email") else user.get("email", "")
    role = user.role if hasattr(user, "role") else user.get("role", "engineer")
    status = user.status if hasattr(user, "status") else user.get("status", "active")
    uid = user.id if hasattr(user, "id") else user.get("id", "")
    return {"id": uid, "name": name, "initials": initials, "email": email, "role": role, "status": status}


@router.post("/logout")
async def logout():
    """Logout current user (client-side token invalidation)."""
    # JWT tokens are stateless, so we just return success
    # The client should delete the token
    return {"message": "Logged out successfully"}
