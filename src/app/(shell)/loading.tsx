'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';

export default function ShellLoading() {
  return (
    <div className="w-full h-[calc(100vh-80px)] flex flex-col items-center justify-center bg-gray-50/50 space-y-4">
      <div className="flex items-center gap-3 text-emerald-600">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="text-xl font-bold font-['Plus_Jakarta_Sans']">Memuat Data...</span>
      </div>
      <p className="text-sm text-gray-500 font-medium">Mohon tunggu sebentar, sistem sedang menarik data operasional terbaru.</p>
    </div>
  );
}
