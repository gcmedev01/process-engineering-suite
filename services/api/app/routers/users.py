"""Users router — profile self-service + admin CRUD."""
from typing import Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel, EmailStr

from ..auth_deps import get_current_user, require_admin
from ..dependencies import DAL
from ..services.user_admin import (
    list_users,
    create_user,
    update_user,
    delete_user,
    change_own_password,
    update_own_profile,
)

router = APIRouter(prefix="/users", tags=["users"])


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class UserResponse(BaseModel):
    id: str
    name: str
    initials: Optional[str] = None
    email: str
    role: str
    status: str


class UserCreate(BaseModel):
    name: str
    username: str
    email: str
    password: str
    role: str = "engineer"
    initials: Optional[str] = None


class UserUpdate(BaseModel):
    name: Optional[str] = None
    initials: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None
    status: Optional[str] = None


class SelfUpdate(BaseModel):
    name: Optional[str] = None
    initials: Optional[str] = None


class PasswordChange(BaseModel):
    currentPassword: str
    newPassword: str


def _normalise(user) -> dict:
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
# Admin routes
# ---------------------------------------------------------------------------

@router.get("", response_model=list[UserResponse])
async def admin_list_users(
    dal: DAL,
    _admin=Depends(require_admin),
):
    return await list_users(dal)


@router.post("", response_model=UserResponse, status_code=201)
async def admin_create_user(
    body: UserCreate,
    dal: DAL,
    _admin=Depends(require_admin),
):
    return await create_user(dal, body.model_dump())


@router.patch("/{user_id}", response_model=UserResponse)
async def admin_update_user(
    user_id: str,
    body: UserUpdate,
    dal: DAL,
    _admin=Depends(require_admin),
):
    return await update_user(dal, user_id, body.model_dump(exclude_none=True))


@router.delete("/{user_id}", response_model=UserResponse)
async def admin_delete_user(
    user_id: str,
    dal: DAL,
    _admin=Depends(require_admin),
):
    return await delete_user(dal, user_id)


# ---------------------------------------------------------------------------
# Self-service routes (any authenticated user)
# ---------------------------------------------------------------------------

@router.patch("/me", response_model=UserResponse)
async def self_update(
    body: SelfUpdate,
    dal: DAL,
    user=Depends(get_current_user),
):
    user_id = user.id if hasattr(user, "id") else user["id"]
    return await update_own_profile(dal, user_id, body.model_dump(exclude_none=True))


@router.post("/me/password", status_code=204)
async def self_change_password(
    body: PasswordChange,
    dal: DAL,
    user=Depends(get_current_user),
):
    user_id = user.id if hasattr(user, "id") else user["id"]
    await change_own_password(dal, user_id, body.currentPassword, body.newPassword)
