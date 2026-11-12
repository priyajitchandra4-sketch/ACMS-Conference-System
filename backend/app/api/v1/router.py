from fastapi import APIRouter

from app.api.v1 import (
    assignments, auth, bidding, committee, conferences, invitations, notifications,
    papers, roles, reviews, tracks, submission_options,
)
from app.api.v1 import decisions, delegates, external, reports

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(conferences.router, prefix="/conferences", tags=["Conferences"])
api_router.include_router(tracks.router, prefix="/conferences", tags=["Tracks"])
api_router.include_router(committee.router, prefix="/conferences", tags=["Conferences"])
api_router.include_router(invitations.router, prefix="/invitations", tags=["Invitations"])
api_router.include_router(notifications.router, prefix="/notifications", tags=["Notifications"])
api_router.include_router(roles.router, prefix="/roles", tags=["Roles"])
api_router.include_router(papers.router, prefix="/papers", tags=["Papers"])
api_router.include_router(submission_options.router, prefix="/conferences", tags=["Conferences"])

# Phase 5–10 API modules use explicit API-relative paths in their routers.
api_router.include_router(bidding.router)
api_router.include_router(assignments.router)
api_router.include_router(reviews.router)
api_router.include_router(decisions.router)
api_router.include_router(external.router)
api_router.include_router(delegates.router)
api_router.include_router(reports.router)
