'use client';
import type React from 'react';

import { useEffect, useState } from 'react';
import { cloudLayout } from '@/lib/cloud-shape';

interface CloudShellProps {
  leftWidth: number;
  rightWidth: number;
}

/**
 * Renders the three interlocking smoked-glass pieces (left sidebar, header,
 * right sidebar) as one decorative layer. Content is positioned on top of it
 * by the page; this layer never takes pointer events.
 */
export default function CloudShell({ leftWidth, rightWidth }: CloudShellProps) {
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);

  useEffect(() => {
    const update = () => setSize({ w: window.innerWidth, h: window.innerHeight });
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  if (!size) return null;
  const { w, h } = size;
  const shape = cloudLayout(w, h, leftWidth, rightWidth);
  const pieces = [shape.left, shape.head, shape.right];

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-20">
      <svg
        className="cloud-shadow absolute inset-0"
        width={w}
        height={h}
        viewBox={`0 0 ${w} ${h}`}
      >
        {pieces.map((d, i) => (
          <path key={i} className="cloud-morph" style={{ d: `path('${d}')` } as React.CSSProperties} fill="rgb(var(--smoke-light))" fillOpacity={0.7} />
        ))}
      </svg>
      {pieces.map((d, i) => (
        <div
          key={i}
          className="glass-smoke cloud-clip absolute inset-0"
          style={{ clipPath: `path('${d}')` }}
        />
      ))}
      <svg className="absolute inset-0" width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
        {pieces.map((d, i) => (
          <path
            key={i}
            className="cloud-morph"
            style={{ d: `path('${d}')` } as React.CSSProperties}
            fill="none"
            stroke="rgb(var(--glass-edge) / 0.8)"
            strokeWidth={1.5}
          />
        ))}
      </svg>
    </div>
  );
}
