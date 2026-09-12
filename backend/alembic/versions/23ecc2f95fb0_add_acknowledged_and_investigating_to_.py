"""Add ACKNOWLEDGED and INVESTIGATING to AnomalyStatus

Revision ID: 23ecc2f95fb0
Revises: 092cf2c2b9fd
Create Date: 2026-09-12 13:04:58.554466

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '23ecc2f95fb0'
down_revision: Union[str, Sequence[str], None] = '092cf2c2b9fd'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Disable transaction to allow ALTER TYPE
    with op.get_context().autocommit_block():
        op.execute("ALTER TYPE anomalystatus ADD VALUE IF NOT EXISTS 'ACKNOWLEDGED'")
        op.execute("ALTER TYPE anomalystatus ADD VALUE IF NOT EXISTS 'INVESTIGATING'")

def downgrade() -> None:
    # Cannot drop enum values in postgresql easily
    pass
