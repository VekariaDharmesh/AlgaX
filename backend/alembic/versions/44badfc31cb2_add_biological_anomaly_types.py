"""Add biological anomaly types

Revision ID: 44badfc31cb2
Revises: 43badfc31cb1
Create Date: 2026-09-12 11:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = '44badfc31cb2'
down_revision = '43badfc31cb1'
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.execute("ALTER TYPE anomalytype ADD VALUE IF NOT EXISTS 'GROWTH_SUPPRESSION'")
    op.execute("ALTER TYPE anomalytype ADD VALUE IF NOT EXISTS 'GROWTH_ACCELERATION'")
    op.execute("ALTER TYPE anomalytype ADD VALUE IF NOT EXISTS 'BIOMASS_DEVIATION'")
    op.execute("ALTER TYPE anomalytype ADD VALUE IF NOT EXISTS 'EXPECTED_GROWTH_MISMATCH'")
    op.execute("ALTER TYPE anomalytype ADD VALUE IF NOT EXISTS 'BIOMASS_PLATEAU'")
    op.execute("ALTER TYPE anomalytype ADD VALUE IF NOT EXISTS 'BIOMASS_DECLINE'")
    op.execute("ALTER TYPE anomalytype ADD VALUE IF NOT EXISTS 'BIOLOGICAL_RESPONSE_MISMATCH'")

def downgrade() -> None:
    pass
