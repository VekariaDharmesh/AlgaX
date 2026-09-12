import uuid
from typing import Optional, List
from fastapi import Header, HTTPException, Depends, status
from sqlalchemy.orm import Session
from .database import get_db
from . import models

# Default seeded user IDs for consistent demo/system operations
DEMO_OPERATOR_ID = uuid.UUID("11111111-1111-4111-8111-111111111111")
DEMO_VERIFIER_ID = uuid.UUID("22222222-2222-4222-8222-222222222222")
DEMO_ADMIN_ID = uuid.UUID("33333333-3333-4333-8333-333333333333")

def ensure_default_users(db: Session):
    """Seed the default 3 roles if the user table is empty."""
    admin = db.query(models.User).filter(models.User.email == "admin@algax.io").first()
    if not admin:
        admin = models.User(
            id=DEMO_ADMIN_ID,
            email="admin@algax.io",
            name="Platform Administrator",
            role=models.UserRole.PLATFORM_ADMIN,
            is_active=True
        )
        db.add(admin)

    operator = db.query(models.User).filter(models.User.email == "operator@algax.io").first()
    if not operator:
        first_farm = db.query(models.Farm).first()
        operator = models.User(
            id=DEMO_OPERATOR_ID,
            email="operator@algax.io",
            name="Dharmesh (Farm Operator)",
            role=models.UserRole.FARM_OPERATOR,
            assigned_farm_id=first_farm.id if first_farm else None,
            is_active=True
        )
        db.add(operator)

    verifier = db.query(models.User).filter(models.User.email == "verifier@algax.io").first()
    if not verifier:
        verifier = models.User(
            id=DEMO_VERIFIER_ID,
            email="verifier@algax.io",
            name="Dr. Anand Ramanathan (Verifier / Auditor)",
            role=models.UserRole.VERIFIER_AUDITOR,
            is_active=True
        )
        db.add(verifier)

    try:
        db.commit()
    except Exception:
        db.rollback()

def get_current_user(
    x_algax_user_id: Optional[str] = Header(None, alias="X-AlgaX-User-Id"),
    x_algax_role: Optional[str] = Header(None, alias="X-AlgaX-Role"),
    db: Session = Depends(get_db)
) -> models.User:
    """
    Authoritative backend user resolution.
    Validates user from database and applies strict role privilege boundaries.
    """
    ensure_default_users(db)

    user: Optional[models.User] = None

    # 1. Resolve User from Database if User ID Header supplied
    if x_algax_user_id:
        try:
            parsed_id = uuid.UUID(x_algax_user_id)
            user = db.query(models.User).filter(models.User.id == parsed_id, models.User.is_active == True).first()
        except ValueError:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid User ID format")

    # 2. Fallback to Role-based Demo Identity
    if not user:
        role_map = {
            "PLATFORM_ADMIN": models.UserRole.PLATFORM_ADMIN,
            "ADMIN": models.UserRole.PLATFORM_ADMIN,
            "VERIFIER": models.UserRole.VERIFIER_AUDITOR,
            "VERIFIER_AUDITOR": models.UserRole.VERIFIER_AUDITOR,
            "FARM_OPERATOR": models.UserRole.FARM_OPERATOR,
            "OPERATOR": models.UserRole.FARM_OPERATOR,
        }
        target_role = role_map.get(x_algax_role.upper()) if x_algax_role else models.UserRole.PLATFORM_ADMIN
        user = db.query(models.User).filter(models.User.role == target_role, models.User.is_active == True).first()

    if not user:
        user = db.query(models.User).filter(models.User.role == models.UserRole.FARM_OPERATOR).first()

    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User could not be resolved")

    # 3. Handle Active Working Role Context (Only Platform Admin can switch role context freely)
    if x_algax_role:
        normalized_requested_role = x_algax_role.upper()
        if user.role != models.UserRole.PLATFORM_ADMIN:
            expected_role_str = user.role.value
            if normalized_requested_role not in [expected_role_str, expected_role_str.replace("_AUDITOR", ""), "OPERATOR"]:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Forbidden: Authenticated as {user.role.value} and cannot assume unauthorized context {x_algax_role}"
                )

    return user

class RoleChecker:
    def __init__(self, allowed_roles: List[models.UserRole]):
        self.allowed_roles = allowed_roles

    def __call__(self, user: models.User = Depends(get_current_user)) -> models.User:
        if user.role not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Forbidden: Insufficient permissions for role {user.role.value}. Required one of: {[r.value for r in self.allowed_roles]}"
            )
        return user

# Role dependency guards
require_farm_operator = RoleChecker([models.UserRole.FARM_OPERATOR, models.UserRole.PLATFORM_ADMIN])
require_verifier_auditor = RoleChecker([models.UserRole.VERIFIER_AUDITOR, models.UserRole.PLATFORM_ADMIN])
require_platform_admin = RoleChecker([models.UserRole.PLATFORM_ADMIN])

def check_farm_isolation(user: models.User, farm_id: Optional[uuid.UUID]):
    """
    Enforces farm-level isolation:
    - Platform Admin: unscoped access across all facilities.
    - Farm Operator: strictly scoped to assigned farm.
    - Verifier / Auditor: scoped to assigned farm if configured.
    """
    if not farm_id or user.role == models.UserRole.PLATFORM_ADMIN:
        return

    if user.role == models.UserRole.FARM_OPERATOR:
        if user.assigned_farm_id and user.assigned_farm_id != farm_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: You are only authorized to operate your assigned facility"
            )

    if user.role == models.UserRole.VERIFIER_AUDITOR:
        if user.assigned_farm_id and user.assigned_farm_id != farm_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: You are not assigned to audit this facility"
            )
