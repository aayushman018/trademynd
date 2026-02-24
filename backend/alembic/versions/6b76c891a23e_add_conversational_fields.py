"""add_conversational_fields

Revision ID: 6b76c891a23e
Revises: 37568599d141
Create Date: 2026-02-24 21:05:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '6b76c891a23e'
down_revision: Union[str, None] = '37568599d141'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add columns to users
    op.add_column('users', sa.Column('awaiting_response_trade_id', sa.Uuid(), nullable=True))
    op.add_column('users', sa.Column('awaiting_response_type', sa.String(), nullable=True))

    # Add columns to trades
    op.add_column('trades', sa.Column('trade_ref', sa.String(), nullable=True))
    op.add_column('trades', sa.Column('notes', sa.String(), nullable=True))
    op.add_column('trades', sa.Column('emotion_score', sa.Numeric(precision=4, scale=2), nullable=True))
    op.add_column('trades', sa.Column('narrative_data', sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column('trades', 'narrative_data')
    op.drop_column('trades', 'emotion_score')
    op.drop_column('trades', 'notes')
    op.drop_column('trades', 'trade_ref')

    op.drop_column('users', 'awaiting_response_type')
    op.drop_column('users', 'awaiting_response_trade_id')
