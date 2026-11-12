from sqlalchemy import String, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base

class User(Base):
    __tablename__ = 'users'

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    full_name: Mapped[str] = mapped_column(String(120))
    affiliation: Mapped[str | None] = mapped_column(String(200))
    is_active: Mapped[bool] = mapped_column(default=True)

class RoleAssignment(Base):
    __tablename__ = 'role_assignments'
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    role: Mapped[str] = mapped_column(String(30))
    conference_id: Mapped[int | None] = mapped_column(
        ForeignKey("conferences.id", ondelete="CASCADE"), nullable=True, index=True
    )
    track_id: Mapped[int | None] = mapped_column(
        ForeignKey("tracks.id", ondelete="CASCADE"), nullable=True, index=True
    )
