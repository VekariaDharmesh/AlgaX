"""merge multiple heads

Revision ID: bb5a54dea966
Revises: 23ecc2f95fb0, baf22839caf6
Create Date: 2026-09-12 14:00:08.413076

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'bb5a54dea966'
down_revision: Union[str, Sequence[str], None] = ('23ecc2f95fb0', 'baf22839caf6')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
