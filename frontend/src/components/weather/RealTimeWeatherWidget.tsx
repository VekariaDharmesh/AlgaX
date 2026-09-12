'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Sun, Moon, CloudSun, CloudRain, CloudLightning, RefreshCw, Maximize2, Sparkles } from 'lucide-react';
import { fetchCurrentWeather, WeatherData } from '@/lib/api';
import WeatherDetailModal from './WeatherDetailModal';

interface RealTimeWeatherWidgetProps {
  initialLocation?: string;
  className?: string;
}

export default function RealTimeWeatherWidget({
  initialLocation = 'Gandhinagar, India',
  className = ''
}: RealTimeWeatherWidgetProps) {
  const [location, setLocation] = useState(initialLocation);
  const [latLon, setLatLon] = useState<{ lat?: number; lon?: number }>({});
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const loadWeather = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchCurrentWeather(location, latLon.lat, latLon.lon);
      setWeather(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching real-time weather:', err);
      setError('Weather unavailable');
    } finally {
      setLoading(false);
    }
  }, [location, latLon]);

  useEffect(() => {
    loadWeather();
    const interval = setInterval(loadWeather, 60000); // refresh every 60 seconds
    return () => clearInterval(interval);
  }, [loadWeather]);

  const handleSelectLocation = (locName: string, lat?: number, lon?: number) => {
    setLocation(locName);
    setLatLon({ lat, lon });
  };

  const getWeatherIcon = (code?: number, isDay?: boolean) => {
    if (code === undefined) return <Sun className="w-8 h-8 text-amber-500 animate-pulse" />;
    if (code === 0) {
      return isDay !== false ? <Sun className="w-8 h-8 text-amber-500 drop-shadow-sm" /> : <Moon className="w-8 h-8 text-indigo-400 drop-shadow-sm" />;
    }
    if (code <= 3) return <CloudSun className="w-8 h-8 text-sky-500 drop-shadow-sm" />;
    if (code >= 95) return <CloudLightning className="w-8 h-8 text-purple-600 drop-shadow-sm" />;
    return <CloudRain className="w-8 h-8 text-blue-500 drop-shadow-sm" />;
  };

  return (
    <>
      <div 
        onClick={() => setModalOpen(true)}
        className={`group bg-white/80 hover:bg-white backdrop-blur-md border border-white/80 hover:border-sky-200 p-3.5 rounded-2xl shadow-sm hover:shadow-md transition-all cursor-pointer flex items-center gap-3.5 min-w-[230px] relative overflow-hidden ${className}`}
      >
        {/* Subtle accent bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 via-sky-400 to-emerald-400 opacity-80" />

        {/* Weather Icon */}
        <div className="p-2 bg-gradient-to-br from-sky-50 to-slate-100 rounded-xl border border-slate-100 shrink-0 group-hover:scale-105 transition-transform">
          {getWeatherIcon(weather?.weather_code, weather?.is_day)}
        </div>

        {/* Info Content */}
        <div className="flex flex-col flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-xl font-black text-slate-900 leading-none">
                {loading && !weather ? '...' : `${weather?.temperature_c ?? 28}°C`}
              </span>
            </div>
            <Maximize2 className="w-3.5 h-3.5 text-slate-400 group-hover:text-sky-600 transition-colors shrink-0" />
          </div>

          <span className="text-xs font-bold text-slate-800 truncate mt-1">
            {weather?.location_name || location}
          </span>
          
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 mt-0.5">
            <span className="truncate">{weather?.weather_description || 'Clear Sky'}</span>
            {weather?.solar_irradiance_w_m2 !== undefined && (
              <span className="text-amber-700 font-extrabold text-[10px] ml-1 shrink-0">
                {weather.solar_irradiance_w_m2} W/m²
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Detailed Weather Modal */}
      <WeatherDetailModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        weatherData={weather}
        onSelectLocation={handleSelectLocation}
        onRefresh={loadWeather}
        loading={loading}
      />
    </>
  );
}
