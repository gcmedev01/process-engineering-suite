"""Routers package init."""
from .hierarchy import router as hierarchy_router
from .psv import router as psv_router
from .supporting import router as supporting_router
from .admin import router as admin_router
from .auth import router as auth_router
from .revisions import router as revisions_router
from .audit import router as audit_router
from .design_agents import router as design_agents_router
from .calculations import router as calculations_router
from .venting import router as venting_router
from .network import router as network_router
from .engineering_objects import router as engineering_objects_router
from .instrument_links import router as instrument_links_router

try:
    from .vessels import router as vessels_router
except ModuleNotFoundError:
    vessels_router = None


__all__ = [
    "hierarchy_router",
    "psv_router",
    "supporting_router",
    "admin_router",
    "auth_router",
    "revisions_router",
    "audit_router",
    "design_agents_router",
    "vessels_router",
    "calculations_router",
    "venting_router",
    "network_router",
    "engineering_objects_router",
    "instrument_links_router",
]
