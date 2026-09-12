"""Add calibration models and fields

Revision ID: d2e94718a20f
Revises: c1f83829d10e
Create Date: 2026-09-12 19:48:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = 'd2e94718a20f'
down_revision: Union[str, Sequence[str], None] = 'c1f83829d10e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = inspector.get_table_names()

    if 'sensor' in tables:
        sensor_cols = [c['name'] for c in inspector.get_columns('sensor')]
        if 'last_calibrated_at' not in sensor_cols:
            op.add_column('sensor', sa.Column('last_calibrated_at', sa.DateTime(timezone=True), nullable=True))
        if 'calibration_status' not in sensor_cols:
            op.add_column('sensor', sa.Column('calibration_status', sa.String(), nullable=False, server_default='DRAFT'))

    if 'sensor_reading' in tables:
        sr_cols = [c['name'] for c in inspector.get_columns('sensor_reading')]
        if 'raw_value' not in sr_cols:
            op.add_column('sensor_reading', sa.Column('raw_value', sa.Float(), nullable=True))
        if 'calibrated_value' not in sr_cols:
            op.add_column('sensor_reading', sa.Column('calibrated_value', sa.Float(), nullable=True))
        if 'calibration_offset' not in sr_cols:
            op.add_column('sensor_reading', sa.Column('calibration_offset', sa.Float(), nullable=True))
        if 'calibration_gain' not in sr_cols:
            op.add_column('sensor_reading', sa.Column('calibration_gain', sa.Float(), nullable=True))

    if 'evidence_package' in tables:
        ep_cols = [c['name'] for c in inspector.get_columns('evidence_package')]
        if 'calibration_evidence_json' not in ep_cols:
            op.add_column('evidence_package', sa.Column('calibration_evidence_json', sa.JSON(), nullable=False, server_default='[]'))

    if 'sensor_calibration' not in tables:
        op.create_table(
            'sensor_calibration',
            sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column('sensor_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('sensor.id'), nullable=False),
            sa.Column('performed_by', sa.String(), nullable=False, server_default='Technician'),
            sa.Column('calibration_method', sa.String(), nullable=False, server_default='ZERO_POINT'),
            sa.Column('reference_standard', sa.String(), nullable=True),
            sa.Column('raw_reference_value', sa.Float(), nullable=False),
            sa.Column('expected_reference_value', sa.Float(), nullable=False),
            sa.Column('offset_applied', sa.Float(), nullable=False, server_default='0.0'),
            sa.Column('gain_applied', sa.Float(), nullable=False, server_default='1.0'),
            sa.Column('pre_calibration_error', sa.Float(), nullable=True),
            sa.Column('post_calibration_error', sa.Float(), nullable=True),
            sa.Column('status', sa.String(), nullable=False, server_default='DRAFT'),
            sa.Column('notes', sa.String(), nullable=True),
            sa.Column('calibrated_at', sa.DateTime(timezone=True), nullable=True),
            sa.Column('valid_until', sa.DateTime(timezone=True), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
            sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        )
        op.create_index('idx_sensor_calibration_sensor', 'sensor_calibration', ['sensor_id'])
        op.create_index('idx_sensor_calibration_status', 'sensor_calibration', ['status'])

def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = inspector.get_table_names()

    if 'sensor_calibration' in tables:
        op.drop_table('sensor_calibration')

    if 'evidence_package' in tables:
        ep_cols = [c['name'] for c in inspector.get_columns('evidence_package')]
        if 'calibration_evidence_json' in ep_cols:
            op.drop_column('evidence_package', 'calibration_evidence_json')

    if 'sensor_reading' in tables:
        sr_cols = [c['name'] for c in inspector.get_columns('sensor_reading')]
        if 'calibration_gain' in sr_cols:
            op.drop_column('sensor_reading', 'calibration_gain')
        if 'calibration_offset' in sr_cols:
            op.drop_column('sensor_reading', 'calibration_offset')
        if 'calibrated_value' in sr_cols:
            op.drop_column('sensor_reading', 'calibrated_value')
        if 'raw_value' in sr_cols:
            op.drop_column('sensor_reading', 'raw_value')

    if 'sensor' in tables:
        sensor_cols = [c['name'] for c in inspector.get_columns('sensor')]
        if 'calibration_status' in sensor_cols:
            op.drop_column('sensor', 'calibration_status')
        if 'last_calibrated_at' in sensor_cols:
            op.drop_column('sensor', 'last_calibrated_at')
