"""phase 6: reviews, discussion and progress

Revision ID: p6d7e8f9a0b1
Revises: p5a1b2c3d4e5
Create Date: 2026-11-12

After confirming your Phase 5 migration is the prior revision, run:
    alembic upgrade head
"""
from alembic import op
import sqlalchemy as sa

revision = "p6d7e8f9a0b1"
down_revision = "p5a1b2c3d4e5"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "reviews",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("assignment_id", sa.Integer(), sa.ForeignKey("assignments.id", ondelete="CASCADE"), nullable=False),
        sa.Column("summary", sa.Text(), nullable=True),
        sa.Column("strengths", sa.Text(), nullable=True),
        sa.Column("weaknesses", sa.Text(), nullable=True),
        sa.Column("questions", sa.Text(), nullable=True),
        sa.Column("rating", sa.Integer(), nullable=True),
        sa.Column("confidence", sa.Integer(), nullable=True),
        sa.Column("recommendation", sa.String(length=30), nullable=True),
        sa.Column("confidential_comments", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="draft"),
        sa.Column("submitted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("assignment_id", name="uq_review_assignment"),
    )
    op.create_index("ix_reviews_assignment_id", "reviews", ["assignment_id"])
    op.create_index("ix_reviews_status", "reviews", ["status"])

    op.create_table(
        "discussion_threads",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("paper_id", sa.Integer(), sa.ForeignKey("papers.id", ondelete="CASCADE"), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="open"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("paper_id", name="uq_discussion_thread_paper"),
    )
    op.create_index("ix_discussion_threads_paper_id", "discussion_threads", ["paper_id"])
    op.create_index("ix_discussion_threads_status", "discussion_threads", ["status"])

    op.create_table(
        "discussion_posts",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("thread_id", sa.Integer(), sa.ForeignKey("discussion_threads.id", ondelete="CASCADE"), nullable=False),
        sa.Column("author_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("edited_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_discussion_posts_thread_id", "discussion_posts", ["thread_id"])
    op.create_index("ix_discussion_posts_author_id", "discussion_posts", ["author_id"])


def downgrade() -> None:
    op.drop_index("ix_discussion_posts_author_id", table_name="discussion_posts")
    op.drop_index("ix_discussion_posts_thread_id", table_name="discussion_posts")
    op.drop_table("discussion_posts")
    op.drop_index("ix_discussion_threads_status", table_name="discussion_threads")
    op.drop_index("ix_discussion_threads_paper_id", table_name="discussion_threads")
    op.drop_table("discussion_threads")
    op.drop_index("ix_reviews_status", table_name="reviews")
    op.drop_index("ix_reviews_assignment_id", table_name="reviews")
    op.drop_table("reviews")
