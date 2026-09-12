import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from .. import models, schemas
from ..database import get_db
from ..auth import get_current_user, require_platform_admin

router = APIRouter(prefix="/users", tags=["users"])

@router.get("", response_model=List[schemas.UserResponse])
def list_users(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    List platform users.
    Platform Admin can view all accounts.
    Non-admin users can view only themselves and assigned facility colleagues.
    """
    if current_user.role == models.UserRole.PLATFORM_ADMIN:
        return db.query(models.User).order_by(models.User.created_at.desc()).all()
    
    if current_user.assigned_farm_id:
        return db.query(models.User).filter(
            (models.User.assigned_farm_id == current_user.assigned_farm_id) | (models.User.id == current_user.id)
        ).all()
        
    return [current_user]

@router.post("", response_model=schemas.UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(
    user_in: schemas.UserCreate,
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_platform_admin)
):
    """
    Create a new platform user.
    Restricted to Platform Admin only.
    Enforces that role is strictly one of the 3 active roles.
    """
    existing = db.query(models.User).filter(models.User.email == user_in.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="User with this email already exists")

    if user_in.role not in [models.UserRole.FARM_OPERATOR, models.UserRole.VERIFIER_AUDITOR, models.UserRole.PLATFORM_ADMIN]:
        raise HTTPException(status_code=400, detail=f"Invalid role {user_in.role}. Must be FARM_OPERATOR, VERIFIER_AUDITOR, or PLATFORM_ADMIN")

    if user_in.assigned_farm_id:
        farm = db.query(models.Farm).filter(models.Farm.id == user_in.assigned_farm_id).first()
        if not farm:
            raise HTTPException(status_code=404, detail="Assigned farm not found")

    new_user = models.User(
        email=user_in.email,
        name=user_in.name,
        role=user_in.role,
        assigned_farm_id=user_in.assigned_farm_id,
        is_active=user_in.is_active
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@router.put("/{user_id}", response_model=schemas.UserResponse)
def update_user(
    user_id: uuid.UUID,
    user_update: schemas.UserUpdate,
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_platform_admin)
):
    """
    Update user role, status, or farm assignment.
    Restricted to Platform Admin only.
    """
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user_update.name is not None:
        user.name = user_update.name
    if user_update.role is not None:
        if user_update.role not in [models.UserRole.FARM_OPERATOR, models.UserRole.VERIFIER_AUDITOR, models.UserRole.PLATFORM_ADMIN]:
            raise HTTPException(status_code=400, detail="Invalid role specified")
        user.role = user_update.role
    if user_update.assigned_farm_id is not None:
        farm = db.query(models.Farm).filter(models.Farm.id == user_update.assigned_farm_id).first()
        if not farm:
            raise HTTPException(status_code=404, detail="Assigned farm not found")
        user.assigned_farm_id = user_update.assigned_farm_id
    if user_update.is_active is not None:
        user.is_active = user_update.is_active

    db.commit()
    db.refresh(user)
    return user

@router.delete("/{user_id}", status_code=status.HTTP_200_OK)
def delete_user(
    user_id: uuid.UUID,
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_platform_admin)
):
    """
    Revoke user access / deactivate user account.
    Restricted to Platform Admin only.
    """
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own admin account")

    user.is_active = False
    db.commit()
    return {"message": f"User {user.email} deactivated successfully"}
