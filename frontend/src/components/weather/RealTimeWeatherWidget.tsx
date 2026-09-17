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
        className={`group bg-white hover:bg-white/95 backdrop-blur-md border border-white/60 p-3 rounded-2xl shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center gap-3 min-w-[320px] relative overflow-hidden ${className}`}
      >
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400" />
        <div className="p-1.5 bg-amber-50/60 rounded-xl shrink-0 group-hover:scale-105 transition-transform flex items-center justify-center">
          {getWeatherIcon(weather?.weather_code, weather?.is_day)}
        </div>
        <div className="flex flex-col min-w-0 pr-3 border-r border-slate-100">
          <div className="flex items-center gap-1">
            <span className="text-xl font-black text-slate-900 leading-none">
              {loading && !weather ? '...' : `${weather?.temperature_c ?? 29.9}°C`}
            </span>
          </div>
          <span className="text-[11px] font-bold text-slate-800 truncate mt-1">
            {weather?.location_name || location}
          </span>
          <span className="text-[10px] font-medium text-slate-500 mt-0.5 truncate">
            {weather?.weather_description || 'Clear Sky'}
          </span>
        </div>
        <div className="flex flex-col gap-1.5 pl-1 justify-center">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1 w-12"><Sparkles className="w-3 h-3"/> Wind</span>
            <span className="text-[11px] font-black text-slate-900">12 km/h</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1 w-12">Humidity</span>
            <span className="text-[11px] font-black text-slate-900">54%</span>
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
