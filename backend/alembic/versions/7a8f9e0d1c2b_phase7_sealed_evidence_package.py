"""Phase 7: Add sealed_at and sealed_by fields to EvidencePackage and update PackageStatus enum

Revision ID: 7a8f9e0d1c2b
Revises: 593b45ca8657
Create Date: 2026-09-12 18:40:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '7a8f9e0d1c2b'
down_revision: Union[str, Sequence[str], None] = '593b45ca8657'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    op.add_column('evidence_package', sa.Column('sealed_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('evidence_package', sa.Column('sealed_by', sa.String(), nullable=True))
    bind = op.get_bind()
    if bind.dialect.name == 'postgresql':
        bind.execution_options(isolation_level='AUTOCOMMIT').execute(sa.text("ALTER TYPE packagestatus ADD VALUE IF NOT EXISTS 'SEALED'"))

def downgrade() -> None:
    op.drop_column('evidence_package', 'sealed_by')
    op.drop_column('evidence_package', 'sealed_at')
