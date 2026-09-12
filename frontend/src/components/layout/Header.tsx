import React from 'react';
import { Bell, ChevronDown } from 'lucide-react';

export function Header() {
  // Use a hardcoded date for the demo per requirements
  const currentDate = 'Sep 12, 2026';
  const currentTime = '10:24 AM';

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0">
      <div className="flex items-center gap-4">
        {/* Placeholder for page title, driven by layout/page but for now empty since page handles it */}
        <h1 className="text-xl font-semibold text-gray-800">Overview</h1>
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2 border border-gray-200 rounded-md px-3 py-1.5 cursor-pointer hover:bg-gray-50 hover:border-gray-300 hover:shadow-sm transition-all duration-150">
          <DropletsIcon className="w-4 h-4 text-green-600" />
          <span className="text-sm font-medium text-gray-700">GreenRiver Farm</span>
          <ChevronDown className="w-4 h-4 text-gray-500" />
        </div>

        <div className="flex items-center gap-2 bg-green-50 px-2.5 py-1 rounded-full border border-green-200 hover:shadow-xs transition-all">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
          <span className="text-xs font-semibold text-green-700 tracking-wide">LIVE</span>
        </div>

        <div className="text-sm text-gray-500">
          {currentDate} &nbsp; {currentTime}
        </div>

        <button className="relative p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 hover:shadow-sm rounded-lg transition-all duration-150">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
        </button>
      </div>
    </header>
  );
}

function DropletsIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z" />
    </svg>
  );
}
