'use client';

import React from 'react';
import Link from 'next/link';
import { DEMO_PONDS } from '@/lib/demo/ponds';
import { ArrowRight, Droplets } from 'lucide-react';

export default function PondsPage() {
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Ponds</h1>
          <p className="text-gray-500 mt-1">Status and performance across all active cultivation areas.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {DEMO_PONDS.map(pond => (
          <Link href={`/ponds/${pond.id}`} key={pond.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow group flex flex-col h-full">
            <div className="h-32 bg-green-50 flex items-center justify-center border-b border-gray-100">
              <Droplets className="w-12 h-12 text-green-200 group-hover:text-green-300 transition-colors" />
            </div>
            
            <div className="p-6 flex-1 flex flex-col">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{pond.name}</h2>
                  <p className="text-sm text-gray-500 italic">{pond.species}</p>
                </div>
                <span className={`text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1.5 ${
                  pond.status === 'Healthy' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${pond.status === 'Healthy' ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
                  {pond.status}
                </span>
              </div>
              
              <div className="mt-6 flex-1">
                <div className="grid grid-cols-2 gap-y-4 text-sm">
                  <div>
                    <span className="text-gray-500 block text-xs mb-1">Biomass</span>
                    <span className="font-semibold text-gray-900">{pond.biomass.toFixed(2)} g/L</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-xs mb-1">Temperature</span>
                    <span className="font-semibold text-gray-900">{pond.temperature.toFixed(1)} °C</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-xs mb-1">pH Level</span>
                    <span className="font-semibold text-gray-900">{pond.ph.toFixed(1)}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-xs mb-1">Nitrogen</span>
                    <span className={`font-semibold ${pond.nitrogen < 5 ? 'text-red-600' : 'text-gray-900'}`}>{pond.nitrogen.toFixed(1)} mg/L</span>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between text-green-600 text-sm font-medium">
                <span>View Details</span>
                <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
