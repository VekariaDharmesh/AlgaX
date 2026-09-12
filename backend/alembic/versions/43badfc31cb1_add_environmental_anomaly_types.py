"""Add environmental anomaly types

Revision ID: 43badfc31cb1
Revises: 42badfc31cb0
Create Date: 2026-09-12 10:40:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = '43badfc31cb1'
down_revision = '42badfc31cb0'
branch_labels = None
depends_on = None

def upgrade() -> None:
    # In PostgreSQL, we can add values to ENUM
    # alembic doesn't natively support adding enum values in a cross-db way easily,
    # but we can use raw SQL for Postgres.
    op.execute("ALTER TYPE anomalytype ADD VALUE IF NOT EXISTS 'TEMPERATURE_STRESS'")
    op.execute("ALTER TYPE anomalytype ADD VALUE IF NOT EXISTS 'OXYGEN_STRESS'")
    op.execute("ALTER TYPE anomalytype ADD VALUE IF NOT EXISTS 'PH_INSTABILITY'")
    op.execute("ALTER TYPE anomalytype ADD VALUE IF NOT EXISTS 'NUTRIENT_DEPLETION'")
    op.execute("ALTER TYPE anomalytype ADD VALUE IF NOT EXISTS 'WATER_LEVEL_ANOMALY'")
    op.execute("ALTER TYPE anomalytype ADD VALUE IF NOT EXISTS 'LIGHT_ANOMALY'")
    op.execute("ALTER TYPE anomalytype ADD VALUE IF NOT EXISTS 'ENVIRONMENTAL_COMBINATION'")

def downgrade() -> None:
    # Postgres doesn't support removing values from an ENUM type easily.
    pass
