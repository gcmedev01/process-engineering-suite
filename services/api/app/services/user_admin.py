"""User admin write operations — create/update/delete/password.

Branches on MockService vs DatabaseService inline (same pattern as admin.py).
Never extends db_service.py.
"""
import logging
from typing import Optional
from uuid import uuid4

import bcrypt
from fastapi import HTTPException
from sqlalchemy import select, update

logger = logging.getLogger(__name__)


def _hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def _verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def _user_to_dict(user) -> dict:
    """Normalise ORM instance or dict to a plain dict."""
    if isinstance(user, dict):
        return user
    return {
        "id": user.id,
        "name": user.name,
        "initials": user.initials,
        "email": user.email,
        "role": user.role,
        "status": user.status,
    }


# ---------------------------------------------------------------------------
# list
# ---------------------------------------------------------------------------

async def list_users(dal) -> list[dict]:
    users = await dal.get_users()
    return [_user_to_dict(u) for u in users]


# ---------------------------------------------------------------------------
# create
# ---------------------------------------------------------------------------

async def create_user(dal, data: dict) -> dict:
    """Insert a new User + Credential. Returns the created user dict."""
    from ..services import MockService, DatabaseService

    email: str = data["email"].strip().lower()
    username: str = data["username"].strip()
    name: str = data["name"].strip()
    password: str = data["password"]
    role: str = data.get("role", "engineer")
    initials: Optional[str] = data.get("initials")

    if isinstance(dal, MockService):
        # Uniqueness check
        if any(u.get("email") == email for u in dal._data.get("users", [])):
            raise HTTPException(status_code=409, detail="Email already registered")
        if any(c.get("username") == username for c in dal._data.get("credentials", [])):
            raise HTTPException(status_code=409, detail="Username already taken")

        user_id = str(uuid4())
        user = {
            "id": user_id,
            "name": name,
            "initials": initials,
            "email": email,
            "role": role,
            "status": "active",
        }
        cred = {
            "id": str(uuid4()),
            "userId": user_id,
            "username": username,
            "passwordHash": _hash_password(password),
            "failedAttempts": 0,
        }
        dal._data.setdefault("users", []).append(user)
        dal._data.setdefault("credentials", []).append(cred)
        return user

    if isinstance(dal, DatabaseService):
        from ..models.user import User
        from ..models.credential import Credential

        # Uniqueness check
        existing_email = (await dal.session.execute(
            select(User).where(User.email == email)
        )).scalar_one_or_none()
        if existing_email:
            raise HTTPException(status_code=409, detail="Email already registered")

        existing_username = (await dal.session.execute(
            select(Credential).where(Credential.username == username)
        )).scalar_one_or_none()
        if existing_username:
            raise HTTPException(status_code=409, detail="Username already taken")

        user_id = str(uuid4())
        user = User(id=user_id, name=name, initials=initials, email=email, role=role, status="active")
        cred = Credential(
            id=str(uuid4()),
            user_id=user_id,
            username=username,
            password_hash=_hash_password(password),
        )
        dal.session.add(user)
        dal.session.add(cred)
        await dal.session.commit()
        await dal.session.refresh(user)
        return _user_to_dict(user)

    raise HTTPException(status_code=500, detail="Unsupported service type")


# ---------------------------------------------------------------------------
# update
# ---------------------------------------------------------------------------

async def update_user(dal, user_id: str, data: dict) -> dict:
    """Patch user fields (name/initials/email/role/status)."""
    from ..services import MockService, DatabaseService

    allowed = {"name", "initials", "email", "role", "status"}
    patch = {k: v for k, v in data.items() if k in allowed and v is not None}

    if isinstance(dal, MockService):
        for user in dal._data.get("users", []):
            if user["id"] == user_id:
                user.update(patch)
                return user
        raise HTTPException(status_code=404, detail="User not found")

    if isinstance(dal, DatabaseService):
        from ..models.user import User

        snake_patch = {k: v for k, v in patch.items()}
        result = await dal.session.execute(
            update(User).where(User.id == user_id).values(**snake_patch).returning(User)
        )
        user = result.scalar_one_or_none()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        await dal.session.commit()
        return _user_to_dict(user)

    raise HTTPException(status_code=500, detail="Unsupported service type")


# ---------------------------------------------------------------------------
# soft delete
# ---------------------------------------------------------------------------

async def delete_user(dal, user_id: str) -> dict:
    """Soft-delete: set status='inactive'."""
    return await update_user(dal, user_id, {"status": "inactive"})


# ---------------------------------------------------------------------------
# set password (admin)
# ---------------------------------------------------------------------------

async def set_password(dal, user_id: str, new_password: str) -> None:
    """Replace the credential hash for a user (admin action, no current-pw check)."""
    from ..services import MockService, DatabaseService

    hashed = _hash_password(new_password)

    if isinstance(dal, MockService):
        for cred in dal._data.get("credentials", []):
            if cred.get("userId") == user_id:
                cred["passwordHash"] = hashed
                return
        raise HTTPException(status_code=404, detail="Credential not found")

    if isinstance(dal, DatabaseService):
        from ..models.credential import Credential

        await dal.session.execute(
            update(Credential).where(Credential.user_id == user_id).values(password_hash=hashed)
        )
        await dal.session.commit()
        return

    raise HTTPException(status_code=500, detail="Unsupported service type")


# ---------------------------------------------------------------------------
# change own password
# ---------------------------------------------------------------------------

async def change_own_password(dal, user_id: str, current_password: str, new_password: str) -> None:
    """Verify the current password then update it."""
    from ..services import MockService, DatabaseService

    if isinstance(dal, MockService):
        cred = next(
            (c for c in dal._data.get("credentials", []) if c.get("userId") == user_id),
            None,
        )
    elif isinstance(dal, DatabaseService):
        from ..models.credential import Credential
        result = await dal.session.execute(
            select(Credential).where(Credential.user_id == user_id)
        )
        cred_obj = result.scalar_one_or_none()
        if not cred_obj:
            raise HTTPException(status_code=404, detail="Credential not found")
        stored_hash = cred_obj.password_hash
        if not _verify_password(current_password, stored_hash):
            raise HTTPException(status_code=400, detail="Current password is incorrect")
        await set_password(dal, user_id, new_password)
        return
    else:
        raise HTTPException(status_code=500, detail="Unsupported service type")

    if not cred:
        raise HTTPException(status_code=404, detail="Credential not found")

    stored_hash = cred.get("passwordHash", "")
    if not _verify_password(current_password, stored_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect")

    await set_password(dal, user_id, new_password)


# ---------------------------------------------------------------------------
# update own profile
# ---------------------------------------------------------------------------

async def update_own_profile(dal, user_id: str, data: dict) -> dict:
    """Update name/initials/email for the currently authenticated user."""
    allowed = {"name", "initials", "email"}
    patch = {k: v for k, v in data.items() if k in allowed}
    return await update_user(dal, user_id, patch)
