'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface HeatmapPoint {
  x: number;
  y: number;
  count: number;
  intensity: number;
}

export default function HeatmapPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const [heatmap, setHeatmap] = useState<HeatmapPoint[]>([]);
  const [maxCount, setMaxCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedUrl, setSelectedUrl] = useState<string>('');
  const [viewport, setViewport] = useState({ width: 375, height: 667 });

  useEffect(() => {
    fetchHeatmap();
  }, [projectId, selectedUrl]);

  const fetchHeatmap = async () => {
    setLoading(true);
    try {
      const url = selectedUrl
        ? `/api/heatmap?project_id=${projectId}&url=${encodeURIComponent(selectedUrl)}`
        : `/api/heatmap?project_id=${projectId}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setHeatmap(data.heatmap || []);
        setMaxCount(data.maxCount || 0);
        
        // Set viewport from first event if available
        if (data.heatmap && data.heatmap.length > 0) {
          // Estimate viewport from heatmap bounds
          const maxX = Math.max(...data.heatmap.map((p: HeatmapPoint) => p.x));
          const maxY = Math.max(...data.heatmap.map((p: HeatmapPoint) => p.y));
          setViewport({ width: Math.max(maxX + 20, 375), height: Math.max(maxY + 20, 667) });
        }
      }
    } catch (error) {
      console.error('Failed to fetch heatmap:', error);
    } finally {
      setLoading(false);
    }
  };

  const getIntensityColor = (intensity: number) => {
    if (intensity === 0) return 'rgba(59, 130, 246, 0.1)';
    if (intensity < 0.25) return 'rgba(59, 130, 246, 0.3)';
    if (intensity < 0.5) return 'rgba(59, 130, 246, 0.5)';
    if (intensity < 0.75) return 'rgba(59, 130, 246, 0.7)';
    return 'rgba(59, 130, 246, 0.9)';
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">Loading heatmap...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <Link
          href={`/dashboard/${projectId}`}
          className="text-indigo-600 hover:text-indigo-800 text-sm"
        >
          ← Back to Dashboard
        </Link>
      </div>

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Heatmap</h1>
        <div className="flex gap-4 items-center">
          <input
            type="text"
            value={selectedUrl}
            onChange={(e) => setSelectedUrl(e.target.value)}
            placeholder="Filter by URL (optional)"
            className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <div className="text-sm text-gray-600">
            {heatmap.length} data points
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="relative border border-gray-200 rounded bg-gray-50" style={{ width: '100%', maxWidth: '100%', overflow: 'auto' }}>
          <div
            style={{
              position: 'relative',
              width: `${viewport.width}px`,
              height: `${viewport.height}px`,
              margin: '0 auto',
              background: 'white',
            }}
          >
            {heatmap.map((point, idx) => (
              <div
                key={idx}
                style={{
                  position: 'absolute',
                  left: `${point.x - 10}px`,
                  top: `${point.y - 10}px`,
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  backgroundColor: getIntensityColor(point.intensity),
                  border: '1px solid rgba(59, 130, 246, 0.5)',
                  pointerEvents: 'none',
                }}
                title={`${point.count} taps`}
              />
            ))}
          </div>
        </div>
        <div className="mt-4 text-sm text-gray-600">
          <p>Heatmap showing tap density. Darker areas indicate more taps.</p>
          <p className="mt-2">Max count: {maxCount} taps</p>
        </div>
      </div>
    </div>
  );
}

