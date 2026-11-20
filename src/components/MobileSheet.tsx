'use client';

import { CLOUD_MOBILE } from '@/lib/cloud-shape';

export type SheetTab = 'feat' | 'json' | 'table';

const TABS: { id: SheetTab; label: string }[] = [
  { id: 'feat', label: 'Fitur' },
  { id: 'json', label: 'JSON' },
  { id: 'table', label: 'Tabel' },
];

const CAS = '16px 8px 16px 8px';
const CBS = '8px 16px 8px 16px';

/** Height of the sheet's tab strip (padding + segmented control), shared with its panels. */
export const SHEET_TABS_H = 12 + 52 + 10;

interface MobileSheetProps {
  sheetTop: number;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  tab: SheetTab;
  onTabChange: (tab: SheetTab) => void;
  featureCount: number;
}

/**
 * Chrome of the mobile bottom sheet: the grab tab that toggles 290/560 px and the
 * Fitur / JSON / Tabel segmented control. The panels themselves are rendered by
 * Sidebar (JSON, Tabel) and RightSidebar (Fitur) into the box below the tabs.
 */
export default function MobileSheet({
  sheetTop,
  expanded,
  onExpandedChange,
  tab,
  onTabChange,
  featureCount,
}: MobileSheetProps) {
  const M = CLOUD_MOBILE;
  const ti = TABS.findIndex((t) => t.id === tab);

  return (
    <>
      <button
        type="button"
        onClick={() => onExpandedChange(!expanded)}
        aria-label={expanded ? 'Perkecil panel' : 'Perbesar panel'}
        aria-expanded={expanded}
        className="cloud-move absolute z-30 flex items-center justify-center gap-2 text-[13px] font-extrabold text-foreground"
        style={{ left: M.margin, top: sheetTop - M.sheetTabH, width: M.sheetTabW, height: M.sheetTabH + 10 }}
      >
        <span aria-hidden="true" className="w-8 h-[5px] rounded-full bg-foreground/35" />
        {featureCount} fitur
      </button>

      <div
        role="tablist"
        aria-label="Panel data"
        className="cloud-move absolute z-30 flex p-1 rounded-cloud-a bg-smoke-mid/55"
        style={{ left: M.margin + 12, right: M.margin + 12, top: sheetTop + 12 }}
      >
        <span
          aria-hidden="true"
          className="cloud-move cloud-spring absolute top-1 bottom-1 bg-smoke-well/90 shadow-[0_3px_8px_rgb(var(--shadow-ink)/0.12)]"
          style={{
            left: `calc(4px + ${ti} * (33.33% - 2.67px))`,
            width: 'calc(33.33% - 2.67px)',
            borderRadius: ti % 2 ? CBS : CAS,
          }}
        />
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => onTabChange(t.id)}
            className="relative flex-1 h-11 text-sm font-extrabold text-foreground"
          >
            {t.label}
          </button>
        ))}
      </div>
    </>
  );
}
