'use client';

import type React from 'react';

interface CloudShellProps {
  /** SVG path for each smoked-glass piece, in viewport pixels. */
  pieces: string[];
  width: number;
  height: number;
}

/**
 * Renders the interlocking smoked-glass pieces as one decorative layer. The page
 * computes their outlines (desktop or mobile) and positions content on top; this
 * layer never takes pointer events. Paths morph with CSS when the outline changes.
 */
export default function CloudShell({ pieces, width: w, height: h }: CloudShellProps) {
  if (!w || !h) return null;

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-20">
      <svg className="cloud-shadow absolute inset-0" width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
        {pieces.map((d, i) => (
          <path
            key={i}
            className="cloud-morph"
            style={{ d: `path('${d}')` } as React.CSSProperties}
            fill="rgb(var(--smoke-light))"
            fillOpacity={0.7}
          />
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
