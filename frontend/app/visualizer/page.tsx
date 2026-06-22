'use client';

import { Suspense } from 'react';
import { VisualizerLayout } from '@/components/visualizer/VisualizerLayout';

export default function VisualizerPage() {
  return (
    <Suspense fallback={
      <div className="h-screen flex items-center justify-center" style={{ background: '#f5f5f3' }}>
        <div className="text-[#555555] text-sm">Loading Javision...</div>
      </div>
    }>
      <VisualizerLayout />
    </Suspense>
  );
}
