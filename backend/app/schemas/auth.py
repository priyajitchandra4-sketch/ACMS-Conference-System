from typing import List, Optional
from pydantic import BaseModel, EmailStr

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    affiliation: Optional[str] = None
    roles: List[str] = ["author"]  # Default to author if omitted
    
    

class UserResponse(BaseModel):
    id: int
    email: EmailStr
    full_name: str
    affiliation: str | None
    is_active: bool

    model_config = {"from_attributes": True}

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: str | None = None