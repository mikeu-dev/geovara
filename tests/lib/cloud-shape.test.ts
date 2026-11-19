import { describe, it, expect } from 'vitest';
import { CLOUD, cloudLayout, footWidth, roundedPath } from '@/lib/cloud-shape';

describe('cloud-shape', () => {
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

  it('gives an expanded sidebar a foot narrower than its body and a collapsed one a full-width foot', () => {
    expect(footWidth(CLOUD.leftW)).toBe(CLOUD.leftW - 180);
    expect(footWidth(CLOUD.tabW)).toBe(CLOUD.tabW);
  });

  it('builds three distinct pieces that change when a sidebar collapses', () => {
    const open = cloudLayout(1440, 900, CLOUD.leftW, CLOUD.rightW);
    const collapsed = cloudLayout(1440, 900, CLOUD.tabW, CLOUD.rightW);
    expect(new Set([open.left, open.head, open.right]).size).toBe(3);
    expect(collapsed.left).not.toBe(open.left);
    expect(collapsed.head).toBe(open.head);
    expect(collapsed.right).toBe(open.right);
  });
});
