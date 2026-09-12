from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
import uuid
from typing import List, Optional

from .. import models, schemas
from ..database import get_db
from ..evidence.service import generate_evidence_package, seal_evidence_package

router = APIRouter()

def _check_farm_isolation(pkg: models.EvidencePackage, farm_id: Optional[uuid.UUID]):
    if farm_id and pkg.farm_id != farm_id:
        raise HTTPException(status_code=403, detail="Access denied: Evidence package belongs to another farm")

@router.post("/ponds/{pond_id}/evidence-packages", response_model=schemas.EvidencePackageResponse, status_code=201)
def create_evidence_package(
    pond_id: uuid.UUID,
    package_in: schemas.EvidencePackageCreate,
    db: Session = Depends(get_db)
):
    pond = db.query(models.Pond).filter(models.Pond.id == pond_id).first()
    if not pond:
        raise HTTPException(status_code=404, detail="Pond not found")
        
    pkg = generate_evidence_package(
        db,
        farm_id=pond.farm_id,
        pond_id=pond.id,
        start_date=package_in.reporting_period_start,
        end_date=package_in.reporting_period_end
    )
    return pkg

@router.get("/ponds/{pond_id}/evidence-packages", response_model=List[schemas.EvidencePackageResponse])
def list_evidence_packages(
    pond_id: uuid.UUID,
    farm_id: Optional[uuid.UUID] = Query(None),
    db: Session = Depends(get_db)
):
    pond = db.query(models.Pond).filter(models.Pond.id == pond_id).first()
    if not pond:
        raise HTTPException(status_code=404, detail="Pond not found")
    if farm_id and pond.farm_id != farm_id:
        raise HTTPException(status_code=403, detail="Access denied: Pond belongs to another farm")

    packages = db.query(models.EvidencePackage).filter(models.EvidencePackage.pond_id == pond_id).order_by(models.EvidencePackage.created_at.desc()).all()
    return packages

@router.get("/evidence-packages/{pkg_id}", response_model=schemas.EvidencePackageResponse)
def get_evidence_package(
    pkg_id: uuid.UUID,
    farm_id: Optional[uuid.UUID] = Query(None),
    db: Session = Depends(get_db)
):
    pkg = db.query(models.EvidencePackage).filter(models.EvidencePackage.id == pkg_id).first()
    if not pkg:
        raise HTTPException(status_code=404, detail="Evidence Package not found")
    _check_farm_isolation(pkg, farm_id)
    return pkg

@router.post("/evidence-packages/{pkg_id}/seal", response_model=schemas.EvidencePackageResponse)
def seal_package(
    pkg_id: uuid.UUID,
    farm_id: Optional[uuid.UUID] = Query(None),
    actor: Optional[str] = Query("auditor@algax.com"),
    db: Session = Depends(get_db)
):
    pkg = db.query(models.EvidencePackage).filter(models.EvidencePackage.id == pkg_id).first()
    if not pkg:
        raise HTTPException(status_code=404, detail="Evidence Package not found")
    _check_farm_isolation(pkg, farm_id)

    try:
        sealed_pkg = seal_evidence_package(db, pkg_id, actor=actor or "auditor@algax.com")
        return sealed_pkg
    except ValueError as err:
        raise HTTPException(status_code=400, detail=str(err))

from fastapi.responses import HTMLResponse, Response
from ..evidence.verifier import verify_package_hash, build_canonical_payload
from ..evidence.report_pdf import generate_html_report

@router.get("/evidence-packages/{pkg_id}/canonical-json", response_model=schemas.CanonicalJsonBundleResponse)
def get_canonical_json(
    pkg_id: uuid.UUID,
    farm_id: Optional[uuid.UUID] = Query(None),
    db: Session = Depends(get_db)
):
    pkg = db.query(models.EvidencePackage).filter(models.EvidencePackage.id == pkg_id).first()
    if not pkg:
        raise HTTPException(status_code=404, detail="Evidence Package not found")
    _check_farm_isolation(pkg, farm_id)
        
    payload = build_canonical_payload(pkg)
    return {
        "package_id": pkg.id,
        "canonical_hash": pkg.canonical_hash or "",
        "payload": payload
    }

@router.get("/evidence-packages/{pkg_id}/verify-hash", response_model=schemas.HashVerificationResponse)
@router.get("/evidence-packages/{pkg_id}/verify", response_model=schemas.HashVerificationResponse)
def verify_evidence_package_hash(
    pkg_id: uuid.UUID,
    farm_id: Optional[uuid.UUID] = Query(None),
    db: Session = Depends(get_db)
):
    pkg = db.query(models.EvidencePackage).filter(models.EvidencePackage.id == pkg_id).first()
    if not pkg:
        raise HTTPException(status_code=404, detail="Evidence Package not found")
    _check_farm_isolation(pkg, farm_id)
        
    result = verify_package_hash(pkg)
    return result

@router.get("/evidence-packages/{pkg_id}/report")
@router.get("/evidence-packages/{pkg_id}/pdf")
def get_evidence_package_report(
    pkg_id: uuid.UUID,
    farm_id: Optional[uuid.UUID] = Query(None),
    db: Session = Depends(get_db)
):
    pkg = db.query(models.EvidencePackage).filter(models.EvidencePackage.id == pkg_id).first()
    if not pkg:
        raise HTTPException(status_code=404, detail="Evidence Package not found")
    _check_farm_isolation(pkg, farm_id)
        
    html_content = generate_html_report(db, pkg)
    return HTMLResponse(content=html_content)


@router.get("/evidence-packages/{pkg_id}/review/actions", response_model=List[schemas.ReviewActionResponse])
def get_review_actions(
    pkg_id: uuid.UUID,
    farm_id: Optional[uuid.UUID] = Query(None),
    db: Session = Depends(get_db)
):
    pkg = db.query(models.EvidencePackage).filter(models.EvidencePackage.id == pkg_id).first()
    if not pkg:
        raise HTTPException(status_code=404, detail="Evidence Package not found")
    _check_farm_isolation(pkg, farm_id)
        
    actions = db.query(models.ReviewAction).filter(models.ReviewAction.package_id == pkg_id).order_by(models.ReviewAction.created_at.asc()).all()
    return actions

@router.post("/evidence-packages/{pkg_id}/review/actions", response_model=schemas.ReviewActionResponse, status_code=201)
def create_review_action(
    pkg_id: uuid.UUID,
    action_in: schemas.ReviewActionCreate,
    farm_id: Optional[uuid.UUID] = Query(None),
    db: Session = Depends(get_db)
):
    pkg = db.query(models.EvidencePackage).filter(models.EvidencePackage.id == pkg_id).first()
    if not pkg:
        raise HTTPException(status_code=404, detail="Evidence Package not found")
    _check_farm_isolation(pkg, farm_id)
        
    new_action = models.ReviewAction(
        package_id=pkg.id,
        actor="reviewer@algax.com",
        action=models.ReviewActionType(action_in.action),
        note=action_in.note
    )
    db.add(new_action)
    
    if new_action.action == models.ReviewActionType.START_REVIEW:
        pkg.review_state = models.ReviewState.IN_REVIEW
    elif new_action.action == models.ReviewActionType.FLAG_FOR_ATTENTION:
        pkg.review_state = models.ReviewState.NEEDS_ATTENTION
    elif new_action.action == models.ReviewActionType.REQUEST_MORE_EVIDENCE:
        pkg.review_state = models.ReviewState.NEEDS_ATTENTION
    elif new_action.action == models.ReviewActionType.MARK_REVIEWED:
        if pkg.review_state != models.ReviewState.NEEDS_ATTENTION:
            pkg.review_state = models.ReviewState.READY_FOR_EXTERNAL_REVIEW
    elif new_action.action == models.ReviewActionType.CLOSE_REVIEW:
        pkg.review_state = models.ReviewState.CLOSED
        
    db.commit()
    db.refresh(new_action)
    return new_action
