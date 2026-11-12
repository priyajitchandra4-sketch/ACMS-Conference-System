from datetime import datetime
from pydantic import BaseModel, Field

# --- Conference Schemas ---
class ConferenceBase(BaseModel):
    title: str = Field(..., max_length=255)
    acronym: str = Field(..., max_length=50)
    description: str | None = None
    start_date: datetime
    end_date: datetime
    location: str | None = Field(None, max_length=255)
    is_active: bool = True

class ConferenceCreate(ConferenceBase):
    pass

class ConferenceUpdate(BaseModel):
    title: str | None = Field(None, max_length=255)
    acronym: str | None = Field(None, max_length=50)
    description: str | None = None
    start_date: datetime | None = None
    end_date: datetime | None = None
    location: str | None = Field(None, max_length=255)
    is_active: bool | None = None

class ConferenceOut(ConferenceBase):
    id: int

    class Config:
        from_attributes = True


# --- Track Schemas ---
class TrackBase(BaseModel):
    name: str = Field(..., max_length=150)
    description: str | None = None

class TrackCreate(TrackBase):
    pass

class TrackOut(TrackBase):
    id: int
    conference_id: int

    class Config:
        from_attributes = True


# --- Deadline Schemas ---
class DeadlineBase(BaseModel):
    deadline_type: str = Field(..., max_length=50)  # e.g., 'submission', 'review', 'camera_ready'
    due_at: datetime
    grace_period_minutes: int = 0
    track_id: int | None = None

class DeadlineCreate(DeadlineBase):
    pass

class DeadlineOut(DeadlineBase):
    id: int
    conference_id: int

    class Config:
        from_attributes = True


# --- Call For Papers Schemas ---
class CallForPapersCreate(BaseModel):
    content: str  # Markdown content

class CallForPapersOut(BaseModel):
    id: int
    conference_id: int
    content: str

    class Config:
        from_attributes = True