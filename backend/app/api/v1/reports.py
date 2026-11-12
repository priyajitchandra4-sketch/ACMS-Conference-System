"""Phase 10 reporting endpoints; all are conference-Chair scoped."""
from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session
from app.core.deps import get_current_user, get_db
from app.db.models import User
from app.services import report_service as svc

router = APIRouter(tags=["reports and security"])


@router.get("/chair/reports/overview")
def report_overview(period: str = "all", conference_id: int | None = None,
                    db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return svc.overview(db, user, period, conference_id)


@router.get("/chair/reports/export")
def export_report(format: str = "csv", period: str = "all", conference_id: int | None = None,
                  db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    body, media_type = svc.export_report(db, user, period, format, conference_id)
    filename = f"acms-report-{period}.{format}"
    return Response(content=body, media_type=media_type,
                    headers={"Content-Disposition": f'attachment; filename="{filename}"'})


@router.get("/chair/audit-log")
def audit_log(page: int = 1, page_size: int = 25, action: str | None = None,
              conference_id: int | None = None, db: Session = Depends(get_db),
              user: User = Depends(get_current_user)):
    return svc.audit_log(db, user, page, page_size, action, conference_id)


@router.get("/chair/security/overview")
def security_overview(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return svc.security_overview(db, user)
