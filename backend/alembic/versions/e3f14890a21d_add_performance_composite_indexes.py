"""Add performance composite indexes

Revision ID: e3f14890a21d
Revises: d2e94718a20f
Create Date: 2026-09-12 20:02:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'e3f14890a21d'
down_revision: Union[str, Sequence[str], None] = 'd2e94718a20f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = inspector.get_table_names()

    if 'sensor_calibration' in tables:
        indexes = [idx['name'] for idx in inspector.get_indexes('sensor_calibration')]
        if 'idx_sensor_calibration_active' not in indexes:
            op.create_index('idx_sensor_calibration_active', 'sensor_calibration', ['sensor_id', 'status'])

    if 'harvest_event' in tables:
        indexes = [idx['name'] for idx in inspector.get_indexes('harvest_event')]
        if 'idx_harvest_pond_status' not in indexes:
            op.create_index('idx_harvest_pond_status', 'harvest_event', ['pond_id', 'status'])

    if 'anomaly' in tables:
        indexes = [idx['name'] for idx in inspector.get_indexes('anomaly')]
        if 'idx_anomaly_pond_status_ts' not in indexes:
            op.create_index('idx_anomaly_pond_status_ts', 'anomaly', ['pond_id', 'status', 'timestamp'])

def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = inspector.get_table_names()

    if 'anomaly' in tables:
        indexes = [idx['name'] for idx in inspector.get_indexes('anomaly')]
        if 'idx_anomaly_pond_status_ts' in indexes:
            op.drop_index('idx_anomaly_pond_status_ts', 'anomaly')

    if 'harvest_event' in tables:
        indexes = [idx['name'] for idx in inspector.get_indexes('harvest_event')]
        if 'idx_harvest_pond_status' in indexes:
            op.drop_index('idx_harvest_pond_status', 'harvest_event')

    if 'sensor_calibration' in tables:
        indexes = [idx['name'] for idx in inspector.get_indexes('sensor_calibration')]
        if 'idx_sensor_calibration_active' in indexes:
            op.drop_index('idx_sensor_calibration_active', 'sensor_calibration')
