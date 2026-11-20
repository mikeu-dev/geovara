import { describe, it, expect } from 'vitest';
import { CLOUD, desktopLayout, footWidth, mobileLayout, roundedPath } from '@/lib/cloud-shape';

const W = 1440;
const H = 900;
const open = { leftOpen: true, rightOpen: true, askOpen: false };

describe('roundedPath', () => {
  it('rounds every corner of a polygon into a closed path', () => {
    const d = roundedPath(
      [
        [0, 0],
        [100, 0],
        [100, 100],
        [0, 100],
      ],
      10
    );
    expect(d.startsWith('M ')).toBe(true);
    expect(d.endsWith(' Z')).toBe(true);
    expect(d.match(/ A /g)).toHaveLength(4);
  });

  it('clamps the radius to half of the shortest adjacent edge', () => {
    const d = roundedPath(
      [
        [0, 0],
        [8, 0],
        [8, 100],
        [0, 100],
      ],
      30
    );
    expect(d).toContain('A 4.0 4.0');
  });

  it('ignores repeated points instead of drawing zero-size corners', () => {
    const d = roundedPath(
      [
        [0, 0],
        [100, 0],
        [100, 0],
        [100, 100],
        [0, 100],
      ],
      10
    );
    expect(d.match(/ A /g)).toHaveLength(4);
    expect(d).not.toContain('A 0.0');
  });
});

describe('desktopLayout', () => {
  it('gives an expanded sidebar a foot narrower than its body', () => {
    expect(footWidth(CLOUD.leftW)).toBe(CLOUD.leftW - CLOUD.notchW);
    const l = desktopLayout(W, H, open);
    expect(l.leftFootW).toBe(CLOUD.leftW - CLOUD.notchW);
    expect(l.rightFootW).toBe(CLOUD.rightW - CLOUD.notchW);
    expect(new Set(l.pieces).size).toBe(3);
  });

  it('keeps the scale slot when the left piece collapses, at rail width', () => {
    const l = desktopLayout(W, H, { ...open, leftOpen: false });
    expect(l.leftFootW).toBe(0);
    expect(l.slot.width).toBe(CLOUD.tabW);
    expect(l.slot.height).toBe(CLOUD.footH - CLOUD.gap);
  });

  it('docks the Ask slot under the collapsed right rail', () => {
    const l = desktopLayout(W, H, { ...open, rightOpen: false });
    expect(l.ask).toEqual({ right: CLOUD.margin, width: CLOUD.tabW, height: CLOUD.footH - CLOUD.gap });
    expect(l.rightFootW).toBe(0);
  });

  it('grows an open Ask inside the right piece and raises its bottom edge', () => {
    const closed = desktopLayout(W, H, open);
    const asked = desktopLayout(W, H, { ...open, askOpen: true });
    expect(asked.ask.width).toBe(CLOUD.rightW);
    expect(asked.ask.height).toBe(CLOUD.askH);
    expect(asked.rightFootW).toBe(0);
    expect(asked.rightBodyBottom).toBe(CLOUD.margin + CLOUD.askH + CLOUD.gap);
    expect(asked.pieces[2]).not.toBe(closed.pieces[2]);
    expect(asked.pieces[0]).toBe(closed.pieces[0]);
    expect(asked.pieces[1]).toBe(closed.pieces[1]);
  });
});

describe('mobileLayout', () => {
  it('builds header, 2D/3D tab and sheet, and the sheet grows when expanded', () => {
    const small = mobileLayout(390, 844, { sheetExpanded: false, askOpen: false });
    const big = mobileLayout(390, 844, { sheetExpanded: true, askOpen: false });
    expect(small.pieces).toHaveLength(3);
    expect(small.sheetTop).toBe(844 - 8 - 290);
    expect(big.sheetTop).toBe(844 - 8 - 560);
    expect(big.pieces[2]).not.toBe(small.pieces[2]);
  });

  it('opens Ask full width', () => {
    const l = mobileLayout(390, 844, { sheetExpanded: false, askOpen: true });
    expect(l.ask.width).toBe(390 - 16);
  });
});
