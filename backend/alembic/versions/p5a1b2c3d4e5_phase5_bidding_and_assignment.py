"""phase 5: bidding and assignment

Revision ID: p5a1b2c3d4e5
Revises: <PUT YOUR PHASE 4 REVISION ID HERE>
Create Date: 2026-11-12

HOW TO USE: either
  (a) run `alembic revision --autogenerate -m "phase 5 bidding"` yourself and
      compare the result with this file, or
  (b) copy this file into alembic/versions/ and set `down_revision` below to
      your latest Phase 4 revision id (find it with `alembic history | head`).
Then run: alembic upgrade head
"""
from alembic import op
import sqlalchemy as sa

revision = "p5a1b2c3d4e5"
down_revision = "a5c9c3cdbb74"  # <-- REPLACE with your Phase 4 revision id, e.g. "a1b2c3d4e5f6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "reviewer_expertise",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("reviewer_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("subject_area_id", sa.Integer(), sa.ForeignKey("subject_areas.id"), nullable=False),
        sa.Column("level", sa.Integer(), nullable=False, server_default="2"),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("reviewer_id", "subject_area_id", name="uq_expertise_reviewer_area"),
    )
    op.create_index("ix_reviewer_expertise_reviewer_id", "reviewer_expertise", ["reviewer_id"])
    op.create_index("ix_reviewer_expertise_subject_area_id", "reviewer_expertise", ["subject_area_id"])

    op.create_table(
        "bids",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("paper_id", sa.Integer(), sa.ForeignKey("papers.id"), nullable=False),
        sa.Column("reviewer_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("value", sa.String(10), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("paper_id", "reviewer_id", name="uq_bid_paper_reviewer"),
    )
    op.create_index("ix_bids_paper_id", "bids", ["paper_id"])
    op.create_index("ix_bids_reviewer_id", "bids", ["reviewer_id"])

    op.create_table(
        "conflicts_of_interest",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("paper_id", sa.Integer(), sa.ForeignKey("papers.id"), nullable=False),
        sa.Column("reviewer_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("reason", sa.String(500), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("paper_id", "reviewer_id", name="uq_coi_paper_reviewer"),
    )
    op.create_index("ix_conflicts_of_interest_paper_id", "conflicts_of_interest", ["paper_id"])
    op.create_index("ix_conflicts_of_interest_reviewer_id", "conflicts_of_interest", ["reviewer_id"])

    op.create_table(
        "assignments",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("paper_id", sa.Integer(), sa.ForeignKey("papers.id"), nullable=False),
        sa.Column("reviewer_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("kind", sa.String(20), nullable=False, server_default="internal"),
        sa.Column("status", sa.String(20), nullable=False, server_default="pending"),
        sa.Column("due_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("anon_label", sa.String(30), nullable=False),
        sa.Column("assigned_by", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("paper_id", "reviewer_id", name="uq_assignment_paper_reviewer"),
    )
    op.create_index("ix_assignments_paper_id", "assignments", ["paper_id"])
    op.create_index("ix_assignments_reviewer_id", "assignments", ["reviewer_id"])
    op.create_index("ix_assignments_kind", "assignments", ["kind"])
    op.create_index("ix_assignments_status", "assignments", ["status"])

    op.create_table(
        "meta_assignments",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("paper_id", sa.Integer(), sa.ForeignKey("papers.id"), nullable=False),
        sa.Column("meta_reviewer_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("assigned_by", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("paper_id", "meta_reviewer_id", name="uq_meta_paper_reviewer"),
    )
    op.create_index("ix_meta_assignments_paper_id", "meta_assignments", ["paper_id"])
    op.create_index("ix_meta_assignments_meta_reviewer_id", "meta_assignments", ["meta_reviewer_id"])


def downgrade() -> None:
    op.drop_table("meta_assignments")
    op.drop_table("assignments")
    op.drop_table("conflicts_of_interest")
    op.drop_table("bids")
    op.drop_table("reviewer_expertise")
