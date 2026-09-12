'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function PondsRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/farms?tab=ponds');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-[60vh] text-slate-500 text-sm font-medium">
      <div className="flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
        Redirecting to Unified Cultivation Hub...
      </div>
    </div>
  );
}
