from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.db.models.user import User, RoleAssignment
from app.core.security import decode_access_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    payload = decode_access_token(token)
    if payload is None:
        raise credentials_exception
    
    user_email: str = payload.get("sub")
    if user_email is None:
        raise credentials_exception

    # Query by email string instead of casting to int
    user = db.query(User).filter(User.email == user_email).first()
    if user is None:
        raise credentials_exception
        
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Inactive user")
        
    return user

def require_role(*allowed_roles: str):
    """
    Dependency factory that checks if the current user holds at least one of the specified roles.
    Raises 403 Forbidden if the user lacks the required role.
    """
    def role_dependency(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
        assignment = db.query(RoleAssignment).filter(
            RoleAssignment.user_id == current_user.id,
            RoleAssignment.role.in_(allowed_roles)
        ).first()
        
        if not assignment:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required role: one of {list(allowed_roles)}"
            )
        return current_user
        
    return role_dependency