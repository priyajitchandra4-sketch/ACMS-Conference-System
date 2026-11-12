# Import all models so SQLAlchemy metadata and Alembic discover every table.
from .user import User, RoleAssignment
from .conference import Conference, Track, SubjectArea, Deadline, CallForPapers, TrackSubjectArea
from .invitation import Invitation, Notification
from .paper import Paper, PaperAuthor, PaperSubjectArea, PaperVersion
from .assignment import ReviewerExpertise, Bid, ConflictOfInterest, Assignment, MetaAssignment
from .review import Review, DiscussionThread, DiscussionPost
from .workflow import Decision, Rebuttal, CameraReadySubmission, DelegateRegistration, DelegatePayment, AuditLog

__all__ = [
    "User", "RoleAssignment", "Conference", "Track", "SubjectArea", "Deadline",
    "CallForPapers", "TrackSubjectArea", "Invitation", "Notification", "Paper",
    "PaperAuthor", "PaperSubjectArea", "PaperVersion", "ReviewerExpertise", "Bid",
    "ConflictOfInterest", "Assignment", "MetaAssignment", "Review", "DiscussionThread",
    "DiscussionPost", "Decision", "Rebuttal", "CameraReadySubmission", "DelegateRegistration", "DelegatePayment",
    "AuditLog",
]
