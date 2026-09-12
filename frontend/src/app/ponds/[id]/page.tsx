'use client';

import React from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { DEMO_PONDS } from '@/lib/demo/ponds';
import { ArrowLeft, AlertTriangle, Info, Beaker, Thermometer, Droplet, Droplets } from 'lucide-react';

import { use } from 'react';

export default function PondDetail({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const pond = DEMO_PONDS.find(p => p.id === resolvedParams.id);
  
  if (!pond) {
    notFound();
  }

  // Calculate generic limitation factors based on current values for demo purposes
  const lightLimitation = 86;
  const tempLimitation = 92;
  const phLimitation = 88;
  const nitrogenLimitation = pond.nitrogen < 5 ? 41 : 94; // Reflects the nitrogen drop for Pond B

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      <div>
        <Link href="/ponds" className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-900 mb-4">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Ponds
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">{pond.name}</h1>
            <p className="text-gray-500 mt-1">{pond.species}</p>
          </div>
          <span className={`px-3 py-1.5 rounded-full text-sm font-bold flex items-center gap-2 ${
            pond.status === 'Healthy' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
          }`}>
            <span className={`w-2 h-2 rounded-full ${pond.status === 'Healthy' ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
            {pond.status}
          </span>
        </div>
      </div>

      {pond.status === 'Attention' && (
        <div className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded-r-lg flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-bold text-orange-800">Attention Required</h3>
            <p className="text-sm text-orange-700 mt-1">
              Lower nitrogen availability is reducing the estimated growth rate.
            </p>
          </div>
        </div>
      )}

      {/* Current Conditions */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <span className="text-xs text-gray-500 uppercase font-semibold">Biomass</span>
          <div className="text-2xl font-bold text-gray-900 mt-1">{pond.biomass.toFixed(2)} <span className="text-sm font-medium text-gray-500">g/L</span></div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <span className="text-xs text-gray-500 uppercase font-semibold">Temperature</span>
          <div className="text-2xl font-bold text-gray-900 mt-1">{pond.temperature.toFixed(1)} <span className="text-sm font-medium text-gray-500">°C</span></div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <span className="text-xs text-gray-500 uppercase font-semibold">pH Level</span>
          <div className="text-2xl font-bold text-gray-900 mt-1">{pond.ph.toFixed(1)}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <span className="text-xs text-gray-500 uppercase font-semibold">Nitrogen</span>
          <div className={`text-2xl font-bold mt-1 ${pond.nitrogen < 5 ? 'text-red-600' : 'text-gray-900'}`}>{pond.nitrogen.toFixed(1)} <span className="text-sm font-medium text-gray-500">mg/L</span></div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <span className="text-xs text-gray-500 uppercase font-semibold">Dissolved O₂</span>
          <div className="text-2xl font-bold text-gray-900 mt-1">{pond.dissolvedOxygen.toFixed(1)} <span className="text-sm font-medium text-gray-500">mg/L</span></div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Growth Limitation Factors */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <h2 className="text-lg font-bold text-gray-900">Growth Limitation Factors</h2>
            <Info className="w-4 h-4 text-gray-400" />
          </div>

          <div className="space-y-5">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="font-medium text-gray-700">Light</span>
                <span className="font-bold text-gray-900">{lightLimitation}%</span>
              </div>
              <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-green-500" style={{ width: `${lightLimitation}%` }}></div>
              </div>
            </div>
            
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="font-medium text-gray-700">Temperature</span>
                <span className="font-bold text-gray-900">{tempLimitation}%</span>
              </div>
              <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-green-500" style={{ width: `${tempLimitation}%` }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="font-medium text-gray-700">pH</span>
                <span className="font-bold text-gray-900">{phLimitation}%</span>
              </div>
              <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-green-500" style={{ width: `${phLimitation}%` }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="font-medium text-gray-700">Nitrogen</span>
                <span className={`font-bold ${nitrogenLimitation < 50 ? 'text-red-600' : 'text-gray-900'}`}>{nitrogenLimitation}%</span>
              </div>
              <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                <div className={`h-full ${nitrogenLimitation < 50 ? 'bg-red-500' : 'bg-green-500'}`} style={{ width: `${nitrogenLimitation}%` }}></div>
              </div>
            </div>
          </div>

          {nitrogenLimitation < 50 && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-100">
              <span className="block text-sm font-bold text-gray-900 mb-1">Primary limitation: Nitrogen availability</span>
              <span className="text-xs text-gray-600 block">
                The Monod-Droop kinetics engine identifies nitrogen as the primary constraint on growth rate, causing the dynamic carbon fraction (C-frac) to shift as cells accumulate lipids.
              </span>
            </div>
          )}
        </div>

        {/* Biological Performance Chart Placeholder */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 flex flex-col">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Biological Performance</h2>
          <div className="flex-1 bg-gray-50 rounded-lg border border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400 p-6 text-center">
            <Beaker className="w-8 h-8 mb-2 opacity-50" />
            <p className="text-sm">Historical biomass growth chart will appear here</p>
            <p className="text-xs mt-2">Driven by EnvironmentalSnapshot and ModelRun</p>
          </div>
        </div>
      </div>
    </div>
  );
}
