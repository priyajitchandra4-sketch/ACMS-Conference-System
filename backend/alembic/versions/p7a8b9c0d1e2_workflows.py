"""Phase 7–10 workflow records and track/subject-area association.

This adds only phase workflow tables; it does not rewrite completed Phase 0–4 schema.
"""
from alembic import op
import sqlalchemy as sa

revision = "p7a8b9c0d1e2"
down_revision = "p6d7e8f9a0b1"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("invitations", sa.Column("paper_id", sa.Integer(), nullable=True))
    op.create_foreign_key("fk_invitations_paper_id_papers", "invitations", "papers", ["paper_id"], ["id"], ondelete="CASCADE")
    op.create_index("ix_invitations_paper_id", "invitations", ["paper_id"])
    op.add_column("invitations", sa.Column("due_at", sa.DateTime(), nullable=True))
    op.create_table(
        "track_subject_areas",
        sa.Column("track_id", sa.Integer(), sa.ForeignKey("tracks.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("subject_area_id", sa.Integer(), sa.ForeignKey("subject_areas.id", ondelete="CASCADE"), primary_key=True),
    )
    op.create_table(
        "paper_decisions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("paper_id", sa.Integer(), sa.ForeignKey("papers.id", ondelete="CASCADE"), nullable=False),
        sa.Column("decision", sa.String(30), nullable=False),
        sa.Column("rationale", sa.Text(), nullable=False),
        sa.Column("decided_by", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("paper_id", name="uq_decision_paper"),
    )
    op.create_index("ix_paper_decisions_paper_id", "paper_decisions", ["paper_id"])
    op.create_table(
        "paper_rebuttals",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("paper_id", sa.Integer(), sa.ForeignKey("papers.id", ondelete="CASCADE"), nullable=False),
        sa.Column("author_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("rebuttal", sa.Text(), nullable=False),
        sa.Column("submitted_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("paper_id", name="uq_rebuttal_paper"),
    )
    op.create_index("ix_paper_rebuttals_paper_id", "paper_rebuttals", ["paper_id"])
    op.create_index("ix_paper_rebuttals_author_id", "paper_rebuttals", ["author_id"])
    op.create_table(
        "camera_ready_submissions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("paper_id", sa.Integer(), sa.ForeignKey("papers.id", ondelete="CASCADE"), nullable=False),
        sa.Column("version_id", sa.Integer(), sa.ForeignKey("paper_versions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("author_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("copyright_confirmed", sa.Boolean(), server_default=sa.false(), nullable=False),
        sa.Column("submitted_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("paper_id", name="uq_camera_ready_paper"),
        sa.UniqueConstraint("version_id"),
    )
    op.create_index("ix_camera_ready_submissions_paper_id", "camera_ready_submissions", ["paper_id"])
    op.create_index("ix_camera_ready_submissions_author_id", "camera_ready_submissions", ["author_id"])
    op.create_table(
        "delegate_registrations",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("conference_id", sa.Integer(), sa.ForeignKey("conferences.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("attendee_name", sa.String(120), nullable=False),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("affiliation", sa.String(200), nullable=True),
        sa.Column("dietary_requirements", sa.String(1000), nullable=True),
        sa.Column("accessibility_needs", sa.String(1000), nullable=True),
        sa.Column("ticket_type", sa.String(40), server_default="standard", nullable=False),
        sa.Column("status", sa.String(20), server_default="pending", nullable=False),
        sa.Column("amount", sa.Integer(), server_default="0", nullable=False),
        sa.Column("currency", sa.String(3), server_default="INR", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("conference_id", "user_id", name="uq_delegate_conference_user"),
    )
    op.create_index("ix_delegate_registrations_conference_id", "delegate_registrations", ["conference_id"])
    op.create_index("ix_delegate_registrations_user_id", "delegate_registrations", ["user_id"])
    op.create_index("ix_delegate_registrations_status", "delegate_registrations", ["status"])
    op.create_table(
        "delegate_payments",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("registration_id", sa.Integer(), sa.ForeignKey("delegate_registrations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("status", sa.String(20), server_default="pending", nullable=False),
        sa.Column("provider", sa.String(40), nullable=True),
        sa.Column("provider_session_id", sa.String(200), nullable=True),
        sa.Column("checkout_url", sa.String(1000), nullable=True),
        sa.Column("paid_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("registration_id", name="uq_delegate_payment_registration"),
        sa.UniqueConstraint("provider_session_id"),
    )
    op.create_index("ix_delegate_payments_registration_id", "delegate_payments", ["registration_id"])
    op.create_index("ix_delegate_payments_status", "delegate_payments", ["status"])
    op.create_table(
        "audit_logs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("actor_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("conference_id", sa.Integer(), sa.ForeignKey("conferences.id", ondelete="SET NULL"), nullable=True),
        sa.Column("action", sa.String(100), nullable=False),
        sa.Column("object_type", sa.String(80), nullable=False),
        sa.Column("object_id", sa.String(80), nullable=True),
        sa.Column("details", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_audit_logs_actor_id", "audit_logs", ["actor_id"])
    op.create_index("ix_audit_logs_conference_id", "audit_logs", ["conference_id"])
    op.create_index("ix_audit_logs_action", "audit_logs", ["action"])
    op.create_index("ix_audit_logs_created_at", "audit_logs", ["created_at"])


def downgrade() -> None:
    op.drop_column("invitations", "due_at")
    op.drop_index("ix_invitations_paper_id", table_name="invitations")
    op.drop_constraint("fk_invitations_paper_id_papers", "invitations", type_="foreignkey")
    op.drop_column("invitations", "paper_id")
    for name in ("ix_audit_logs_created_at", "ix_audit_logs_action", "ix_audit_logs_conference_id", "ix_audit_logs_actor_id"):
        op.drop_index(name, table_name="audit_logs")
    op.drop_table("audit_logs")
    op.drop_index("ix_delegate_payments_status", table_name="delegate_payments")
    op.drop_index("ix_delegate_payments_registration_id", table_name="delegate_payments")
    op.drop_table("delegate_payments")
    for name in ("ix_delegate_registrations_status", "ix_delegate_registrations_user_id", "ix_delegate_registrations_conference_id"):
        op.drop_index(name, table_name="delegate_registrations")
    op.drop_table("delegate_registrations")
    op.drop_index("ix_camera_ready_submissions_author_id", table_name="camera_ready_submissions")
    op.drop_index("ix_camera_ready_submissions_paper_id", table_name="camera_ready_submissions")
    op.drop_table("camera_ready_submissions")
    op.drop_index("ix_paper_rebuttals_author_id", table_name="paper_rebuttals")
    op.drop_index("ix_paper_rebuttals_paper_id", table_name="paper_rebuttals")
    op.drop_table("paper_rebuttals")
    op.drop_index("ix_paper_decisions_paper_id", table_name="paper_decisions")
    op.drop_table("paper_decisions")
    op.drop_table("track_subject_areas")
