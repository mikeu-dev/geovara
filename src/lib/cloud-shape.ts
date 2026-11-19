/**
 * Geometry for the "interlocking cloud" shell: three smoked-glass pieces
 * (left sidebar, header, right sidebar) that float over the map and lock
 * together with tabs, notches and stepped edges, separated by a constant gap.
 */

export const CLOUD = {
  /** Outer margin from the viewport edge. */
  margin: 12,
  /** Gap between pieces ("puzzle gap"). */
  gap: 10,
  /** Header height. */
  headerH: 76,
  /** Height of the header's stepped right end. */
  stepH: 40,
  /** Tab width — also the width of a collapsed sidebar. */
  tabW: 100,
  /** Foot height at the bottom of each sidebar. */
  footH: 86,
  /** Corner radius of the large pieces. */
  radius: 30,
  /** Expanded sidebar widths. */
  leftW: 380,
  rightW: 350,
} as const;

type Pt = readonly [number, number];

/** Polygon → SVG path with every corner rounded (convex and concave). */
export function roundedPath(pts: readonly Pt[], r: number): string {
  const n = pts.length;
  let d = '';
  for (let i = 0; i < n; i++) {
    const a = pts[(i - 1 + n) % n];
    const p = pts[i];
    const b = pts[(i + 1) % n];
    const d1 = Math.hypot(p[0] - a[0], p[1] - a[1]);
    const d2 = Math.hypot(b[0] - p[0], b[1] - p[1]);
    const rr = Math.max(0, Math.min(r, d1 / 2, d2 / 2));
    const u1 = d1 ? [(p[0] - a[0]) / d1, (p[1] - a[1]) / d1] : [0, 0];
    const u2 = d2 ? [(b[0] - p[0]) / d2, (b[1] - p[1]) / d2] : [0, 0];
    const p1 = [p[0] - u1[0] * rr, p[1] - u1[1] * rr];
    const p2 = [p[0] + u2[0] * rr, p[1] + u2[1] * rr];
    const sweep = u1[0] * u2[1] - u1[1] * u2[0] > 0 ? 1 : 0;
    d +=
      (i ? ' L ' : 'M ') +
      `${p1[0].toFixed(1)} ${p1[1].toFixed(1)} A ${rr.toFixed(1)} ${rr.toFixed(1)} 0 0 ${sweep} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d + ' Z';
}

export interface CloudLayout {
  left: string;
  head: string;
  right: string;
  /** Width of the left sidebar's foot (the step that reaches the bottom). */
  leftFootW: number;
  /** Width of the right sidebar's foot. */
  rightFootW: number;
}

/** Foot width of a sidebar: the part that steps down to the bottom edge. */
export function footWidth(w: number): number {
  return w > CLOUD.tabW ? w - 180 : w;
}

export function cloudLayout(W: number, H: number, lw: number, rw: number): CloudLayout {
  const { margin: m, gap: g, headerH: hh, stepH: th, tabW: tw, footH: fh, radius } = CLOUD;
  const lfw = footWidth(lw);
  const rfw = footWidth(rw);

  const left: Pt[] = [
    [m, m],
    [m + tw, m],
    [m + tw, m + hh + g],
    [m + lw, m + hh + g],
    [m + lw, H - m],
    [m + lw - lfw, H - m],
    [m + lw - lfw, H - m - fh],
    [m, H - m - fh],
  ];
  const head: Pt[] = [
    [m + tw + g, m],
    [W - m, m],
    [W - m, m + th],
    [W - m - tw - g, m + th],
    [W - m - tw - g, m + hh],
    [m + tw + g, m + hh],
  ];
  const right: Pt[] = [
    [W - m - tw, m + th + g],
    [W - m, m + th + g],
    [W - m, H - m - fh],
    [W - m - rw + rfw, H - m - fh],
    [W - m - rw + rfw, H - m],
    [W - m - rw, H - m],
    [W - m - rw, m + hh + g],
    [W - m - tw, m + hh + g],
  ];

  return {
    left: roundedPath(left, radius),
    head: roundedPath(head, radius),
    right: roundedPath(right, radius),
    leftFootW: lfw,
    rightFootW: rfw,
  };
}
