/**
 * Geometry for the "interlocking cloud" shell: smoked-glass pieces that float over
 * the map and lock together with tabs, notches and stepped edges, separated by a
 * constant gap. Every state change (collapse, Ask, sheet size) is expressed as a
 * different outline of the same pieces, so the shell morphs instead of stacking
 * new panels on top.
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
  /** Width the foot gives up to its neighbouring slot when a sidebar is expanded. */
  notchW: 180,
  /** Corner radius of the large pieces. */
  radius: 30,
  /** Expanded sidebar widths. */
  leftW: 380,
  rightW: 350,
  /** Height of the expanded Ask panel inside the right piece. */
  askH: 360,
} as const;

/** The three motion durations (ms); CSS mirrors them as --dur-micro/morph/camera. */
export const MOTION = { micro: 160, morph: 620, camera: 1000 } as const;

export const CLOUD_MOBILE = {
  margin: 8,
  gap: 8,
  radius: 22,
  headerH: 58,
  stepH: 30,
  /** Width of the 2D/3D tab under the header's step. */
  tabW: 70,
  /** Depth of that tab below the header. */
  tabDrop: 34,
  /** The sheet's grab tab. */
  sheetTabW: 128,
  sheetTabH: 34,
  /** Height of the sheet's foot and of the Ask slot beside it. */
  footH: 66,
  askW: 128,
  sheetH: 290,
  sheetExpandedH: 560,
  askOpenH: 470,
  breakpoint: 768,
} as const;

type Pt = readonly [number, number];

/** Polygon → SVG path with every corner rounded (convex and concave). */
export function roundedPath(input: readonly Pt[], r: number): string {
  // Drop repeated and collinear points: a zero-length edge or a straight-through
  // vertex would otherwise get its own rounded "corner" and show as a bump.
  const dedup = input.filter((p, i) => {
    const prev = input[(i - 1 + input.length) % input.length];
    return p[0] !== prev[0] || p[1] !== prev[1];
  });
  const pts = dedup.filter((p, i) => {
    const a = dedup[(i - 1 + dedup.length) % dedup.length];
    const b = dedup[(i + 1) % dedup.length];
    return (p[0] - a[0]) * (b[1] - p[1]) - (p[1] - a[1]) * (b[0] - p[0]) !== 0;
  });
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

/** Width of an expanded sidebar's foot (the step that reaches the bottom edge). */
export function footWidth(w: number): number {
  return Math.max(0, w - CLOUD.notchW);
}

export interface DesktopState {
  leftOpen: boolean;
  rightOpen: boolean;
  askOpen: boolean;
}

export interface DesktopLayout {
  pieces: string[];
  lw: number;
  rw: number;
  /** Left sidebar foot (holds the validation status); 0 when collapsed. */
  leftFootW: number;
  /** Right sidebar foot (quick operations); 0 when collapsed or Ask is open. */
  rightFootW: number;
  /** Scale / coordinate slot in the left piece's notch. */
  slot: { left: number; width: number; height: number };
  /** Ask slot or panel, always docked to the right piece's foot. */
  ask: { right: number; width: number; height: number };
  /** Distance from the viewport bottom to where each sidebar's body ends. */
  leftBodyBottom: number;
  rightBodyBottom: number;
}

export function desktopLayout(W: number, H: number, s: DesktopState): DesktopLayout {
  const { margin: m, gap: g, headerH: hh, stepH: th, tabW: tw, footH: fh, radius } = CLOUD;
  const lw = s.leftOpen ? CLOUD.leftW : tw;
  const rw = s.rightOpen ? CLOUD.rightW : tw;
  const top = m + hh + g;

  // Left piece. Expanded: a foot reaches the bottom and the scale slot sits in the
  // notch beside it. Collapsed: the rail stops above the slot, which takes its width.
  const lfw = s.leftOpen ? footWidth(lw) : 0;
  const left: Pt[] = [
    [m, m],
    [m + tw, m],
    [m + tw, top],
    [m + lw, top],
    ...(lfw
      ? ([
          [m + lw, H - m],
          [m + lw - lfw, H - m],
          [m + lw - lfw, H - m - fh],
        ] as Pt[])
      : ([[m + lw, H - m - fh]] as Pt[])),
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

  // Right piece. The Ask slot always lives in its foot: beside the foot when
  // expanded, under the rail when collapsed. An open Ask grows up inside the
  // piece's width and the piece's bottom edge rises to make room.
  const askOpenH = Math.min(CLOUD.askH, H - top - 160);
  const rfw = s.rightOpen && !s.askOpen ? footWidth(rw) : 0;
  const rightBottom = s.askOpen ? H - m - askOpenH - g : H - m - fh;
  const right: Pt[] = [
    [W - m - tw, m + th + g],
    [W - m, m + th + g],
    [W - m, rightBottom],
    ...(rfw
      ? ([
          [W - m - rw + rfw, H - m - fh],
          [W - m - rw + rfw, H - m],
          [W - m - rw, H - m],
        ] as Pt[])
      : ([[W - m - rw, rightBottom]] as Pt[])),
    [W - m - rw, top],
    [W - m - tw, top],
  ];

  return {
    pieces: [roundedPath(left, radius), roundedPath(head, radius), roundedPath(right, radius)],
    lw,
    rw,
    leftFootW: lfw,
    rightFootW: rfw,
    slot: { left: m, width: s.leftOpen ? lw - lfw - g : tw, height: fh - g },
    ask: s.askOpen
      ? { right: m, width: rw, height: askOpenH }
      : { right: m, width: s.rightOpen ? CLOUD.notchW - g : tw, height: fh - g },
    leftBodyBottom: m + fh,
    rightBodyBottom: s.askOpen ? m + askOpenH + g : m + fh,
  };
}

export interface MobileLayout {
  pieces: string[];
  /** Top edge of the sheet body (its grab tab sits above it). */
  sheetTop: number;
  ask: { right: number; width: number; height: number };
}

export function mobileLayout(W: number, H: number, s: { sheetExpanded: boolean; askOpen: boolean }): MobileLayout {
  const M = CLOUD_MOBILE;
  const m = M.margin;
  const g = M.gap;
  const sh = Math.min(s.sheetExpanded ? M.sheetExpandedH : M.sheetH, H - m - M.headerH - M.tabDrop - 120);
  const top = H - m - sh;

  const head: Pt[] = [
    [m, m],
    [W - m, m],
    [W - m, m + M.stepH],
    [W - m - M.tabW - g, m + M.stepH],
    [W - m - M.tabW - g, m + M.headerH],
    [m, m + M.headerH],
  ];
  const tab: Pt[] = [
    [W - m - M.tabW, m + M.stepH + g],
    [W - m, m + M.stepH + g],
    [W - m, m + M.headerH + M.tabDrop],
    [W - m - M.tabW, m + M.headerH + M.tabDrop],
  ];
  const sheet: Pt[] = [
    [m, top - M.sheetTabH],
    [m + M.sheetTabW, top - M.sheetTabH],
    [m + M.sheetTabW, top],
    [W - m, top],
    [W - m, H - m - M.footH],
    [W - m - M.askW - g, H - m - M.footH],
    [W - m - M.askW - g, H - m],
    [m, H - m],
  ];

  return {
    pieces: [roundedPath(head, M.radius), roundedPath(tab, M.radius), roundedPath(sheet, M.radius)],
    sheetTop: top,
    ask: s.askOpen
      ? { right: m, width: W - 2 * m, height: Math.min(M.askOpenH, H - 2 * m - M.headerH - g) }
      : { right: m, width: M.askW, height: M.footH - g },
  };
}
