'use client';

import React from 'react';
import { ArrowDown, AlertCircle, Info } from 'lucide-react';
import { DEMO_CARBON_ACCOUNTING } from '@/lib/demo/carbon';

export default function CarbonAccountingPage() {
  const carbon = DEMO_CARBON_ACCOUNTING;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Carbon Accounting</h1>
        <p className="text-gray-500 mt-1">Full Lifecycle Analysis (LCA) and net carbon removal calculations.</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="bg-green-800 p-6 text-white text-center">
          <span className="text-sm font-semibold uppercase tracking-wider text-green-200 mb-1 block">Net Carbon Removed</span>
          <div className="text-5xl font-bold">{carbon.netRemovedKg.toLocaleString()} <span className="text-2xl text-green-100">kg CO₂e</span></div>
          <p className="text-sm text-green-100 mt-2">Modeled durable removal after all operational deductions.</p>
        </div>
        
        <div className="p-8">
          <h2 className="text-lg font-bold text-gray-900 mb-6">Carbon Waterfall</h2>
          
          <div className="relative">
            {/* Step 1: Gross */}
            <div className="flex items-start gap-6">
              <div className="w-48 pt-1 shrink-0">
                <h3 className="font-bold text-gray-900">Gross CO₂ Fixed</h3>
                <p className="text-xs text-gray-500">Biological sequestration</p>
              </div>
              <div className="flex-1 border-b border-gray-100 pb-6 relative">
                <div className="h-10 bg-green-500 rounded-r shadow-sm flex items-center justify-end px-4" style={{ width: '100%' }}>
                  <span className="font-bold text-white">{carbon.grossFixedKg.toLocaleString()} kg</span>
                </div>
              </div>
            </div>

            <div className="absolute left-[13rem] -mt-3 text-gray-300"><ArrowDown className="w-5 h-5" /></div>

            {/* Step 2: Retained */}
            <div className="flex items-start gap-6 mt-6">
              <div className="w-48 pt-1 shrink-0">
                <h3 className="font-bold text-gray-900">End-Use Retained</h3>
                <p className="text-xs text-gray-500">After bioplastic processing (60% permanence horizon)</p>
              </div>
              <div className="flex-1 border-b border-gray-100 pb-6">
                <div className="h-10 bg-green-400 rounded-r shadow-sm flex items-center justify-end px-4" style={{ width: `${(carbon.endUseRetainedKg / carbon.grossFixedKg) * 100}%` }}>
                  <span className="font-bold text-white">{carbon.endUseRetainedKg.toLocaleString()} kg</span>
                </div>
              </div>
            </div>

            <div className="absolute left-[13rem] -mt-3 text-gray-300"><ArrowDown className="w-5 h-5" /></div>

            {/* Step 3: Footprint */}
            <div className="flex items-start gap-6 mt-6">
              <div className="w-48 pt-1 shrink-0">
                <h3 className="font-bold text-gray-900">Operational Footprint</h3>
                <p className="text-xs text-gray-500">Scope 1/2 Deductions</p>
              </div>
              <div className="flex-1 border-b border-gray-100 pb-6">
                {/* Visual offset to show deduction */}
                <div className="flex w-full">
                  <div style={{ width: `${((carbon.endUseRetainedKg - carbon.operationalFootprintKg) / carbon.grossFixedKg) * 100}%` }}></div>
                  <div className="h-10 bg-gray-400 rounded shadow-sm flex items-center justify-center px-4 min-w-[80px]" style={{ width: `${(carbon.operationalFootprintKg / carbon.grossFixedKg) * 100}%` }}>
                    <span className="font-bold text-white">-{carbon.operationalFootprintKg} kg</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="absolute left-[13rem] -mt-3 text-gray-300"><ArrowDown className="w-5 h-5" /></div>

            {/* Step 4: Net */}
            <div className="flex items-start gap-6 mt-6">
              <div className="w-48 pt-1 shrink-0">
                <h3 className="font-bold text-green-800">Net Carbon Removed</h3>
                <p className="text-xs text-green-600">Final modeled amount</p>
              </div>
              <div className="flex-1 pb-2">
                <div className="h-10 bg-green-800 rounded-r shadow-sm flex items-center justify-end px-4" style={{ width: `${(carbon.netRemovedKg / carbon.grossFixedKg) * 100}%` }}>
                  <span className="font-bold text-white">{carbon.netRemovedKg.toLocaleString()} kg</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            Accounting Assumptions <Info className="w-4 h-4 text-gray-400" />
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b border-gray-50">
              <span className="text-sm text-gray-600">Carbon fraction (dynamic)</span>
              <span className="text-sm font-semibold text-gray-900">0.51 kg C / kg dry biomass</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-50">
              <span className="text-sm text-gray-600">Operational electricity</span>
              <span className="text-sm font-semibold text-gray-900">120 kWh</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-50">
              <span className="text-sm text-gray-600">Grid emission factor</span>
              <span className="text-sm font-semibold text-gray-900">0.71 kg CO₂e / kWh</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-gray-600">End-use assumption</span>
              <span className="text-sm font-semibold text-gray-900 bg-gray-100 px-2 py-1 rounded">Bioplastic (Durable)</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            Traceable Calculation <Info className="w-4 h-4 text-gray-400" />
          </h3>
          <div className="bg-gray-50 rounded-lg p-4 font-mono text-xs text-gray-600 space-y-3">
            <div className="flex justify-between"><span>Biomass increase</span><span className="text-gray-900">248 kg dry biomass</span></div>
            <div className="flex justify-between"><span>× Carbon fraction</span><span className="text-gray-900">0.51 kg C/kg biomass</span></div>
            <div className="border-t border-dashed border-gray-300 my-1"></div>
            <div className="flex justify-between"><span>↓ Carbon contained</span><span className="text-gray-900 font-bold">126.48 kg C</span></div>
            <div className="border-t border-dashed border-gray-300 my-1"></div>
            <div className="flex justify-between"><span>↓ CO₂ equivalent (44/12)</span><span className="text-gray-900 font-bold text-sm">463.8 kg CO₂</span></div>
          </div>
          
          <div className="mt-4 flex gap-4 text-xs text-gray-500">
            <div>Model version: <span className="font-mono text-gray-900">v1.2.0</span></div>
            <div>Confidence: <span className="font-bold text-green-600">94%</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
