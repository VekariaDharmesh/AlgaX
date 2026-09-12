"""Add harvest models and evidence fields

Revision ID: c1f83829d10e
Revises: 7a8f9e0d1c2b
Create Date: 2026-09-12 19:40:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = 'c1f83829d10e'
down_revision: Union[str, Sequence[str], None] = '7a8f9e0d1c2b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = inspector.get_table_names()

    if 'evidence_package' in tables:
        columns = [c['name'] for c in inspector.get_columns('evidence_package')]
        if 'harvest_evidence_json' not in columns:
            op.add_column('evidence_package', sa.Column('harvest_evidence_json', sa.JSON(), nullable=True, server_default='[]'))

    if 'harvest_event' not in tables:
        op.create_table(
            'harvest_event',
            sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column('farm_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('farm.id'), nullable=False),
            sa.Column('pond_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('pond.id'), nullable=False),
            sa.Column('status', sa.String(), nullable=False, server_default='PLANNED'),
            sa.Column('planned_date', sa.DateTime(timezone=True), nullable=False),
            sa.Column('harvest_date', sa.DateTime(timezone=True), nullable=True),
            sa.Column('harvest_method', sa.String(), nullable=False, server_default='FILTRATION'),
            sa.Column('operator', sa.String(), nullable=False, server_default='Operator'),
            sa.Column('notes', sa.String(), nullable=True),
            sa.Column('biomass_before_g_per_l', sa.Float(), nullable=True),
            sa.Column('estimated_harvest_kg', sa.Float(), nullable=False, server_default='0.0'),
            sa.Column('actual_harvest_kg', sa.Float(), nullable=True),
            sa.Column('unit', sa.String(), nullable=False, server_default='kg'),
            sa.Column('model_run_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('model_run.id'), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
            sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        )
        op.create_index('idx_harvest_event_farm', 'harvest_event', ['farm_id'])
        op.create_index('idx_harvest_event_pond', 'harvest_event', ['pond_id'])
        op.create_index('idx_harvest_event_status', 'harvest_event', ['status'])

    if 'harvest_biomass_fate' not in tables:
        op.create_table(
            'harvest_biomass_fate',
            sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column('harvest_event_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('harvest_event.id'), nullable=False),
            sa.Column('end_use_category', sa.String(), nullable=False, server_default='UNSPECIFIED'),
            sa.Column('quantity_allocated_kg', sa.Float(), nullable=False),
            sa.Column('allocation_pct', sa.Float(), nullable=False),
            sa.Column('destination', sa.String(), nullable=False, server_default='Storage'),
            sa.Column('processing_info', sa.String(), nullable=True),
            sa.Column('retention_info', sa.String(), nullable=True),
            sa.Column('notes', sa.String(), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        )
        op.create_index('idx_harvest_fate_event', 'harvest_biomass_fate', ['harvest_event_id'])

def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = inspector.get_table_names()

    if 'harvest_biomass_fate' in tables:
        op.drop_table('harvest_biomass_fate')
    if 'harvest_event' in tables:
        op.drop_table('harvest_event')
    if 'evidence_package' in tables:
        columns = [c['name'] for c in inspector.get_columns('evidence_package')]
        if 'harvest_evidence_json' in columns:
            op.drop_column('evidence_package', 'harvest_evidence_json')
