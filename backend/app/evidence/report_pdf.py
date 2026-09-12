import datetime
from sqlalchemy.orm import Session
from .. import models

def generate_html_report(db: Session, pkg: models.EvidencePackage) -> str:
    farm = db.query(models.Farm).filter(models.Farm.id == pkg.farm_id).first()
    pond = db.query(models.Pond).filter(models.Pond.id == pkg.pond_id).first()
    
    farm_name = farm.name if farm else "AlgaX Farm"
    pond_name = pond.name if pond else "Pond"
    start_str = pkg.reporting_period_start.strftime('%Y-%m-%d %H:%M UTC')
    end_str = pkg.reporting_period_end.strftime('%Y-%m-%d %H:%M UTC')
    gen_str = datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%d %H:%M UTC')
    
    # Calculate carbon totals from evidence
    gross_co2_total = 0.0
    net_co2_total = 0.0
    for c in (pkg.carbon_evidence_json or []):
        gross_co2_total += float(c.get("gross_co2_kg", 0.0))
        net_co2_total += float(c.get("net_carbon_removed_kg", 0.0))

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>AlgaX Verification-Ready Report — {pond_name}</title>
    <style>
        @page {{ size: A4; margin: 20mm; }}
        body {{
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #0f172a;
            line-height: 1.5;
            margin: 0;
            padding: 24px;
            background-color: #ffffff;
        }}
        .header {{
            border-bottom: 2px solid #0284c7;
            padding-bottom: 16px;
            margin-bottom: 24px;
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
        }}
        .brand {{
            font-size: 24px;
            font-weight: 800;
            color: #0284c7;
            letter-spacing: -0.5px;
        }}
        .title {{
            font-size: 18px;
            font-weight: 700;
            color: #0f172a;
            margin-top: 4px;
        }}
        .badge {{
            display: inline-block;
            padding: 4px 10px;
            border-radius: 9999px;
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }}
        .badge-ready {{ background-color: #dcfce7; color: #166534; border: 1px solid #bbf7d0; }}
        .badge-draft {{ background-color: #e0f2fe; color: #075985; border: 1px solid #bae6fd; }}
        .badge-warning {{ background-color: #fef3c7; color: #92400e; border: 1px solid #fde68a; }}
        
        .sim-banner {{
            background-color: #fffbe6;
            border: 1px solid #ffe58f;
            border-radius: 8px;
            padding: 12px 16px;
            font-size: 13px;
            color: #873800;
            margin-bottom: 24px;
        }}
        .meta-grid {{
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 12px;
            background-color: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 10px;
            padding: 16px;
            margin-bottom: 24px;
            font-size: 13px;
        }}
        .meta-item font-semibold {{ color: #475569; }}
        
        .section {{
            margin-bottom: 24px;
        }}
        .section-title {{
            font-size: 15px;
            font-weight: 700;
            color: #1e293b;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 6px;
            margin-bottom: 12px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }}
        table {{
            width: 100%;
            border-collapse: collapse;
            font-size: 13px;
            margin-top: 8px;
        }}
        th, td {{
            padding: 10px 12px;
            text-align: left;
            border-bottom: 1px solid #e2e8f0;
        }}
        th {{
            background-color: #f1f5f9;
            color: #475569;
            font-weight: 700;
        }}
        .tag-observed {{ color: #0284c7; font-weight: 700; font-size: 11px; }}
        .tag-modelled {{ color: #16a34a; font-weight: 700; font-size: 11px; }}
        .tag-derived {{ color: #d97706; font-weight: 700; font-size: 11px; }}
        .tag-cv {{ color: #9333ea; font-weight: 700; font-size: 11px; }}
        
        .hash-box {{
            background-color: #0f172a;
            color: #38bdf8;
            font-family: monospace;
            padding: 14px;
            border-radius: 8px;
            word-break: break-all;
            font-size: 12px;
            margin-top: 8px;
        }}
        .footer {{
            border-top: 1px solid #e2e8f0;
            padding-top: 12px;
            font-size: 11px;
            color: #94a3b8;
            text-align: center;
            margin-top: 32px;
        }}
    </style>
</head>
<body>
    <div class="header">
        <div>
            <div class="brand">AlgaX</div>
            <div class="title">Verification-Ready Evidence Report</div>
        </div>
        <div>
            <span class="badge {'badge-ready' if pkg.status == models.PackageStatus.READY_FOR_REVIEW else 'badge-draft'}">
                {pkg.status.value if hasattr(pkg.status, 'value') else str(pkg.status)}
            </span>
        </div>
    </div>

    {'<div class="sim-banner"><strong>Data Source Notice:</strong> Telemetry contains simulated data generated for software validation and demonstration purposes. Provenance tags explicitly preserve data origins.</div>' if pkg.contains_simulated_data else ''}

    <div class="meta-grid">
        <div><strong>Report ID:</strong> {pkg.id}</div>
        <div><strong>Generated At:</strong> {gen_str}</div>
        <div><strong>Farm Location:</strong> {farm_name}</div>
        <div><strong>Pond Identifier:</strong> {pond_name}</div>
        <div><strong>Reporting Start:</strong> {start_str}</div>
        <div><strong>Reporting End:</strong> {end_str}</div>
        <div><strong>Package Version:</strong> v{pkg.package_version}</div>
        <div><strong>Completeness:</strong> {pkg.completeness.value if hasattr(pkg.completeness, 'value') else str(pkg.completeness)}</div>
    </div>

    <div class="section">
        <div class="section-title">1. Data Coverage & Provenance Classification</div>
        <table>
            <thead>
                <tr>
                    <th>Evidence Category</th>
                    <th>Records Count</th>
                    <th>Classification Tag</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>Sensor Telemetry Readings</td>
                    <td>{len(pkg.sensor_evidence_json or [])}</td>
                    <td><span class="tag-observed">OBSERVED</span></td>
                    <td>Recorded</td>
                </tr>
                <tr>
                    <td>Biological Growth Model Runs</td>
                    <td>{len(pkg.model_evidence_json or [])}</td>
                    <td><span class="tag-modelled">MODELLED</span></td>
                    <td>Validated</td>
                </tr>
                <tr>
                    <td>Carbon Sequestration Calculations</td>
                    <td>{len(pkg.carbon_evidence_json or [])}</td>
                    <td><span class="tag-derived">DERIVED</span></td>
                    <td>Computed</td>
                </tr>
                <tr>
                    <td>Satellite & Optical Imagery</td>
                    <td>{len(pkg.imagery_evidence_json or [])}</td>
                    <td><span class="tag-cv">CROSS_VALIDATED</span></td>
                    <td>{'Processed' if pkg.imagery_evidence_json else 'Unavailable'}</td>
                </tr>
                <tr>
                    <td>Cross-Validation Runs</td>
                    <td>{len(pkg.cross_validation_evidence_json or [])}</td>
                    <td><span class="tag-cv">CROSS_VALIDATED</span></td>
                    <td>{'Evaluated' if pkg.cross_validation_evidence_json else 'None'}</td>
                </tr>
            </tbody>
        </table>
    </div>

    <div class="section">
        <div class="section-title">2. Carbon Accounting Summary</div>
        <table>
            <thead>
                <tr>
                    <th>Metric</th>
                    <th>Quantity (kg CO₂e)</th>
                    <th>Classification</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>Gross CO₂ Fixed</td>
                    <td>{gross_co2_total:,.2f} kg</td>
                    <td><span class="tag-derived">DERIVED</span></td>
                </tr>
                <tr>
                    <td>End-Use Retained CO₂</td>
                    <td>{(gross_co2_total * 0.6):,.2f} kg</td>
                    <td><span class="tag-derived">DERIVED</span></td>
                </tr>
                <tr>
                    <td>Operational Footprint Deducted</td>
                    <td>{(gross_co2_total * 0.05):,.2f} kg</td>
                    <td><span class="tag-derived">DERIVED</span></td>
                </tr>
                <tr>
                    <td><strong>Net Carbon Removed</strong></td>
                    <td><strong>{net_co2_total:,.2f} kg</strong></td>
                    <td><span class="tag-derived">DERIVED</span></td>
                </tr>
            </tbody>
        </table>
    </div>

    <div class="section">
        <div class="section-title">3. Environmental Anomalies</div>
        <p style="font-size: 13px; color: #475569;">
            Detected anomalies during period: <strong>{len(pkg.anomaly_evidence_json or [])}</strong>
        </p>
    </div>

    <div class="section">
        <div class="section-title">4. SHA-256 Cryptographic Integrity Digest</div>
        <p style="font-size: 13px; color: #475569;">
            Canonical JSON evidence payload SHA-256 digest:
        </p>
        <div class="hash-box">{pkg.canonical_hash}</div>
        <p style="font-size: 11px; color: #64748b; margin-top: 6px;">
            Note: This cryptographic digest confirms data integrity only. It does not constitute third-party carbon removal certification.
        </p>
    </div>

    <div class="footer">
        AlgaX Carbon Intelligence & Verification Platform • Verification-Ready Report • Farm Scoped Authorization
    </div>
</body>
</html>"""
    return html
