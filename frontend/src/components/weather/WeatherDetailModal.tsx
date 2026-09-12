'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, Search, Sun, Moon, CloudSun, CloudRain, CloudLightning, 
  Wind, Droplets, Gauge, AlertTriangle, CheckCircle2, RefreshCw, 
  MapPin, Sparkles, Activity
} from 'lucide-react';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, 
  Tooltip, CartesianGrid 
} from 'recharts';
import { 
  WeatherData, WeatherSearchLocation, searchWeatherLocations 
} from '@/lib/api';

interface WeatherDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  weatherData: WeatherData | null;
  onSelectLocation: (locationName: string, lat?: number, lon?: number) => void;
  onRefresh: () => void;
  loading: boolean;
}

export default function WeatherDetailModal({
  isOpen,
  onClose,
  weatherData,
  onSelectLocation,
  onRefresh,
  loading
}: WeatherDetailModalProps) {
  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<WeatherSearchLocation[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchWeatherLocations(searchQuery);
        setSearchResults(results);
      } catch (err) {
        console.error('Failed to search location:', err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  if (!isOpen || !weatherData || !mounted) return null;

  const getWeatherIcon = (code: number, isDay: boolean) => {
    if (code === 0) {
      return isDay ? <Sun className="w-12 h-12 text-amber-500 animate-spin-slow" /> : <Moon className="w-12 h-12 text-indigo-400" />;
    }
    if (code <= 3) return <CloudSun className="w-12 h-12 text-sky-500" />;
    if (code >= 95) return <CloudLightning className="w-12 h-12 text-purple-600" />;
    return <CloudRain className="w-12 h-12 text-blue-500" />;
  };

  const getThermalBadgeClass = (rating: string) => {
    switch (rating) {
      case 'Optimal':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'Suboptimal':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'Heat Stress':
        return 'bg-rose-100 text-rose-800 border-rose-300';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-300';
    }
  };

  const chartData = weatherData.hourly_forecast.map((item) => {
    const timeStr = item.time.includes('T') ? item.time.split('T')[1].substring(0, 5) : item.time;
    return {
      time: timeStr,
      temp: item.temperature_2m,
      solar: item.shortwave_radiation || 0
    };
  });

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] overflow-y-auto flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 backdrop-blur-md rounded-xl border border-white/10">
              <Sparkles className="w-6 h-6 text-sky-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold">{weatherData.location_name}</h2>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">Real-time Weather & Algal Cultivation Environmental Impact</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onRefresh}
              disabled={loading}
              className="p-2 text-slate-300 hover:text-white bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
              title="Refresh real-time data"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-300 hover:text-white bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          
          {/* Location Search Bar */}
          <div className="relative">
            <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 focus-within:ring-2 focus-within:ring-sky-500 focus-within:border-transparent transition-all">
              <Search className="w-5 h-5 text-slate-400 shrink-0" />
              <input
                type="text"
                placeholder="Search any location worldwide (e.g. Gandhinagar, Imperial Valley, Tokyo...)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent ml-2.5 text-sm text-slate-800 outline-none placeholder:text-slate-400"
              />
              {isSearching && <RefreshCw className="w-4 h-4 text-sky-500 animate-spin" />}
            </div>

            {/* Quick Location Presets */}
            <div className="flex flex-wrap gap-2 mt-2">
              <span className="text-xs text-slate-400 font-medium self-center">Presets:</span>
              {[
                { name: 'Gandhinagar, India', lat: 23.2156, lon: 72.6369 },
                { name: 'Imperial Valley, CA', lat: 32.8312, lon: -115.5724 },
                { name: 'San Francisco, CA', lat: 37.7749, lon: -122.4194 }
              ].map((loc) => (
                <button
                  key={loc.name}
                  onClick={() => {
                    setSearchQuery('');
                    onSelectLocation(loc.name, loc.lat, loc.lon);
                  }}
                  className="text-xs font-semibold bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1"
                >
                  <MapPin className="w-3 h-3 text-sky-600" />
                  {loc.name}
                </button>
              ))}
            </div>

            {/* Search Dropdown Results */}
            {searchResults.length > 0 && (
              <div className="absolute left-0 right-0 top-12 z-20 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden divide-y divide-slate-100">
                {searchResults.map((res, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setSearchQuery('');
                      setSearchResults([]);
                      onSelectLocation(res.name, res.latitude, res.longitude);
                    }}
                    className="w-full text-left px-4 py-3 hover:bg-sky-50 transition-colors flex items-center justify-between text-sm"
                  >
                    <span className="font-semibold text-slate-800">{res.name}</span>
                    <span className="text-xs text-slate-400 font-mono">
                      {res.country ? res.country : `${res.latitude.toFixed(2)}°, ${res.longitude.toFixed(2)}°`}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Current Real-time Condition Card */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Temperature & Weather Main */}
            <div className="bg-gradient-to-br from-sky-50 to-blue-50/60 border border-sky-100 rounded-2xl p-5 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-4">
                {getWeatherIcon(weatherData.weather_code, weatherData.is_day)}
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-extrabold text-slate-900">{weatherData.temperature_c}°C</span>
                    <span className="text-xs font-medium text-slate-500">Feels {weatherData.apparent_temperature_c}°C</span>
                  </div>
                  <p className="text-sm font-semibold text-sky-900 mt-1">{weatherData.weather_description}</p>
                </div>
              </div>
            </div>

            {/* Photosynthetic Irradiance (PAR) */}
            <div className="bg-gradient-to-br from-amber-50 to-orange-50/60 border border-amber-100 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-800 uppercase tracking-wide">Solar Irradiance (PAR)</span>
                <Sun className="w-5 h-5 text-amber-500" />
              </div>
              <div className="mt-2">
                <span className="text-3xl font-extrabold text-slate-900">
                  {weatherData.solar_irradiance_w_m2} <span className="text-sm font-semibold text-slate-500">W/m²</span>
                </span>
                <div className="w-full bg-amber-200/60 h-2 rounded-full mt-2.5 overflow-hidden">
                  <div 
                    className="bg-amber-500 h-full rounded-full transition-all duration-500" 
                    style={{ width: `${weatherData.algae_impact.photosynthesis_score}%` }} 
                  />
                </div>
                <div className="flex justify-between items-center text-[11px] font-semibold text-amber-900 mt-1">
                  <span>Photosynthesis Potential</span>
                  <span>{weatherData.algae_impact.photosynthesis_score}%</span>
                </div>
              </div>
            </div>

            {/* Thermal Stress Status */}
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50/60 border border-emerald-100 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-800 uppercase tracking-wide">Thermal Stress Rating</span>
                <Activity className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="mt-2">
                <span className={`inline-block text-xs font-bold border px-3 py-1 rounded-full ${getThermalBadgeClass(weatherData.algae_impact.thermal_stress_rating)}`}>
                  {weatherData.algae_impact.thermal_stress_rating}
                </span>
                <p className="text-xs font-medium text-slate-600 mt-2">
                  Optimal range: 22°C - 30°C for maximum carbon fixation.
                </p>
              </div>
            </div>

          </div>

          {/* Secondary Weather Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-50 border border-slate-100 p-3.5 rounded-xl flex items-center gap-3">
              <Droplets className="w-5 h-5 text-blue-500 shrink-0" />
              <div>
                <p className="text-[11px] font-semibold text-slate-500 uppercase">Humidity</p>
                <p className="text-lg font-bold text-slate-800">{weatherData.relative_humidity}%</p>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-100 p-3.5 rounded-xl flex items-center gap-3">
              <Wind className="w-5 h-5 text-teal-500 shrink-0" />
              <div>
                <p className="text-[11px] font-semibold text-slate-500 uppercase">Wind Speed</p>
                <p className="text-lg font-bold text-slate-800">{weatherData.wind_speed_kmh} <span className="text-xs font-normal">km/h</span></p>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-100 p-3.5 rounded-xl flex items-center gap-3">
              <Gauge className="w-5 h-5 text-amber-500 shrink-0" />
              <div>
                <p className="text-[11px] font-semibold text-slate-500 uppercase">Evaporation Risk</p>
                <p className="text-lg font-bold text-slate-800">{weatherData.algae_impact.evaporation_risk}</p>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-100 p-3.5 rounded-xl flex items-center gap-3">
              <CloudRain className="w-5 h-5 text-indigo-500 shrink-0" />
              <div>
                <p className="text-[11px] font-semibold text-slate-500 uppercase">Precipitation</p>
                <p className="text-lg font-bold text-slate-800">{weatherData.precipitation_mm} <span className="text-xs font-normal">mm</span></p>
              </div>
            </div>
          </div>

          {/* Algal Growth Impact Summary */}
          <div className="bg-gradient-to-r from-teal-900 to-slate-900 text-white rounded-2xl p-5 shadow-md flex items-start gap-4">
            <div className="p-3 bg-teal-500/20 border border-teal-400/30 rounded-xl shrink-0">
              <CheckCircle2 className="w-6 h-6 text-teal-300" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-teal-200 uppercase tracking-wide">Real-Time Algae Cultivation Impact</h4>
              <p className="text-sm text-slate-200 mt-1 leading-relaxed">
                {weatherData.algae_impact.growth_condition_summary}
              </p>
            </div>
          </div>

          {/* 24-Hour Hourly Forecast Chart */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-sm font-bold text-slate-900">24-Hour Temperature & Irradiance Forecast</h4>
                <p className="text-xs text-slate-500">Predicted light & temperature curve for model calibration</p>
              </div>
            </div>

            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="tempGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="solarGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="time" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} unit="°C" />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: '#f59e0b' }} axisLine={false} tickLine={false} unit="W" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff' }}
                  />
                  <Area yAxisId="left" type="monotone" dataKey="temp" name="Temp (°C)" stroke="#0284c7" strokeWidth={2} fill="url(#tempGradient)" />
                  <Area yAxisId="right" type="monotone" dataKey="solar" name="Irradiance (W/m²)" stroke="#f59e0b" strokeWidth={2} fill="url(#solarGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 rounded-b-2xl">
          <span>Powered by Open-Meteo REST API • Auto-refreshed every 60s</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl transition-colors shadow-sm"
          >
            Close
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
}
