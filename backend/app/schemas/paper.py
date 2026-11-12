from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, EmailStr, ConfigDict

class PaperAuthorBase(BaseModel):
    name: str
    email: EmailStr
    affiliation: Optional[str] = None
    user_id: Optional[int] = None

class PaperAuthorCreate(PaperAuthorBase):
    pass

class PaperAuthorOut(PaperAuthorBase):
    id: int
    display_order: int
    
    model_config = ConfigDict(from_attributes=True)

class PaperVersionOut(BaseModel):
    id: int
    version_number: int
    kind: str
    original_filename: str
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class PaperSubjectAreaOut(BaseModel):
    id: int
    subject_area_id: int
    
    model_config = ConfigDict(from_attributes=True)

class PaperCreate(BaseModel):
    conference_id: int
    track_id: int
    title: str
    abstract: Optional[str] = None
    authors: List[PaperAuthorCreate] = []
    subject_area_ids: List[int] = []

class PaperUpdate(BaseModel):
    title: Optional[str] = None
    abstract: Optional[str] = None
    track_id: Optional[int] = None
    authors: Optional[List[PaperAuthorCreate]] = None
    subject_area_ids: Optional[List[int]] = None

class PaperOut(BaseModel):
    id: int
    conference_id: int
    track_id: int
    paper_number: Optional[str] = None
    title: str
    abstract: Optional[str] = None
    status: str
    submitter_id: int
    created_at: datetime
    updated_at: datetime
    authors: List[PaperAuthorOut] = []
    versions: List[PaperVersionOut] = []
    subject_areas: List[PaperSubjectAreaOut] = []

    model_config = ConfigDict(from_attributes=True)