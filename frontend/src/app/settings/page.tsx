'use client';

import React from 'react';

export default function SettingsPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Settings</h1>
        <p className="text-gray-500 mt-1">Platform configuration and user management.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <SettingsSection title="Farm">
          <SettingsField label="Farm name" value="GreenRiver Farm" />
          <SettingsField label="Location" value="Imperial Valley, CA" />
          <SettingsField label="Pond configuration" value="3 Active Raceways" />
        </SettingsSection>

        <SettingsSection title="Sensors">
          <SettingsField label="Sensor IDs" value="DO-001, PH-002, TEMP-003, NIT-002" />
          <SettingsField label="Parameters" value="DO, pH, Temp, Turbidity, Nitrogen" />
          <SettingsField label="Sampling interval" value="5 minutes" />
          <SettingsField label="Status" value="Online" status="good" />
        </SettingsSection>

        <SettingsSection title="Model">
          <SettingsField label="Model version" value="v1.2.0" />
          <SettingsField label="Growth parameters" value="Monod-Droop standard" />
          <SettingsField label="Carbon assumptions" value="Dynamic C-fraction" />
        </SettingsSection>

        <SettingsSection title="Accounting">
          <SettingsField label="Electricity emission factor" value="0.71 kg CO₂e/kWh" />
          <SettingsField label="End-use assumption" value="Bioplastic (0.60 factor)" />
          <SettingsField label="Carbon fraction" value="0.51 kg C / kg dry biomass" />
        </SettingsSection>
        
        <SettingsSection title="Users">
          <SettingsField label="Operator" value="Dharmesh (Active)" />
          <SettingsField label="Researcher" value="Anna L. (Active)" />
          <SettingsField label="Reviewer" value="GlobalTrust Audits" />
          <SettingsField label="Investor" value="GreenFund Cap" />
        </SettingsSection>
      </div>
    </div>
  );
}

function SettingsSection({ title, children }: { title: string, children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="text-lg font-bold text-gray-900 mb-4">{title}</h2>
      <div className="space-y-4">
        {children}
      </div>
    </div>
  );
}

function SettingsField({ label, value, status }: { label: string, value: string, status?: 'good' | 'bad' }) {
  return (
    <div className="flex flex-col border-b border-gray-50 pb-2 last:border-0 last:pb-0">
      <span className="text-xs text-gray-500 font-semibold mb-1 uppercase tracking-wider">{label}</span>
      <span className={`text-sm font-medium ${status === 'good' ? 'text-green-600' : 'text-gray-900'}`}>{value}</span>
    </div>
  );
}
