from fastapi import APIRouter, Depends
from .. import models, schemas
from ..auth import get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])

@router.get("/me", response_model=schemas.UserMeResponse)
def get_current_user_profile(
    current_user: models.User = Depends(get_current_user)
):
    """
    Returns current authenticated user profile and permitted switch roles.
    - PLATFORM_ADMIN can switch between FARM_OPERATOR, VERIFIER_AUDITOR, PLATFORM_ADMIN.
    - FARM_OPERATOR can only operate in FARM_OPERATOR.
    - VERIFIER_AUDITOR can only operate in VERIFIER_AUDITOR.
    """
    if current_user.role == models.UserRole.PLATFORM_ADMIN:
        permitted_roles = [
            models.UserRole.FARM_OPERATOR,
            models.UserRole.VERIFIER_AUDITOR,
            models.UserRole.PLATFORM_ADMIN
        ]
    elif current_user.role == models.UserRole.VERIFIER_AUDITOR:
        permitted_roles = [models.UserRole.VERIFIER_AUDITOR]
    else:
        permitted_roles = [models.UserRole.FARM_OPERATOR]

    farm_name = current_user.assigned_farm.name if current_user.assigned_farm else None

    return schemas.UserMeResponse(
        id=current_user.id,
        email=current_user.email,
        name=current_user.name,
        role=current_user.role,
        assigned_farm_id=current_user.assigned_farm_id,
        is_active=current_user.is_active,
        created_at=current_user.created_at,
        permitted_roles=permitted_roles,
        assigned_farm_name=farm_name
    )
