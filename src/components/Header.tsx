'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Sun, Moon, HelpCircle } from 'lucide-react';
import HelpModal from './HelpContent';
import { CLOUD, CLOUD_MOBILE } from '@/lib/cloud-shape';

interface HeaderProps {
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
  is3d?: boolean;
  onToggle3d?: () => void;
  layout?: 'desktop' | 'mobile';
  /** Mobile: the brand fades while the search field is open over it. */
  brandHidden?: boolean;
}

const { margin: M, tabW: TW, headerH: HH, stepH: TH } = CLOUD;

export function GeovaraMark({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 26 26" aria-hidden="true">
      <path
        d="M5 8l8-5 8 5-3 12H8z"
        className="fill-primary/10 stroke-primary"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <circle cx="5" cy="8" r="2.2" className="fill-primary" />
      <circle cx="13" cy="3" r="2.2" className="fill-ember" />
      <circle cx="21" cy="8" r="2.2" className="fill-primary" />
    </svg>
  );
}

const stepButton =
  'w-10 h-10 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-smoke-mid/55 transition-colors';

/**
 * Header content. Sits on top of the CloudShell: the logo fills the left
 * sidebar's tab, the wordmark and 2D/3D switch live in the header piece, and
 * help / theme / GitHub sit in the header's stepped right end.
 */
export default function Header({
  theme = 'light',
  onToggleTheme,
  is3d = false,
  onToggle3d,
  layout = 'desktop',
  brandHidden = false,
}: HeaderProps) {
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  const helpButton = (className: string) => (
    <button
      type="button"
      onClick={() => setIsHelpOpen(true)}
      className={className}
      aria-label="Buka Panduan & Dokumentasi"
      title="Panduan & Dokumentasi"
    >
      <HelpCircle className="h-[18px] w-[18px]" strokeWidth={1.8} />
    </button>
  );
  const themeButton = (className: string) =>
    onToggleTheme && (
      <button
        type="button"
        onClick={onToggleTheme}
        className={className}
        aria-label={theme === 'light' ? 'Mode gelap' : 'Mode terang'}
        title={theme === 'light' ? 'Mode gelap' : 'Mode terang'}
      >
        {theme === 'light' ? (
          <Moon className="h-[18px] w-[18px]" strokeWidth={1.8} />
        ) : (
          <Sun className="h-[18px] w-[18px]" strokeWidth={1.8} />
        )}
      </button>
    );

  if (layout === 'mobile') {
    const MB = CLOUD_MOBILE;
    const mobileBtn =
      'w-11 h-11 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors';
    return (
      <header className="contents select-none">
        <div
          className="cloud-fade absolute z-30 flex items-center gap-2.5 pl-3.5"
          style={{
            left: MB.margin,
            top: MB.margin,
            height: MB.headerH,
            opacity: brandHidden ? 0 : 1,
            pointerEvents: brandHidden ? 'none' : 'auto',
          }}
          aria-hidden={brandHidden}
        >
          <Link href="/" aria-label="Geovara, beranda" className="flex items-center justify-center w-11 h-11 -mx-1.5">
            <GeovaraMark size={32} />
          </Link>
          <h1 className="text-xl font-black tracking-tight">Geovara</h1>
          {helpButton(`${mobileBtn} rounded-cloud-sa`)}
          {themeButton(`${mobileBtn} -ml-2 rounded-cloud-sb`)}
        </div>
        {onToggle3d && (
          <button
            type="button"
            onClick={onToggle3d}
            aria-label={is3d ? 'Ganti ke mode 2D' : 'Ganti ke mode 3D'}
            className="absolute z-30 w-14 h-11 rounded-cloud-sb bg-primary text-primary-foreground text-[15px] font-black shadow-[0_4px_10px_rgb(var(--shadow-ink)/0.2)]"
            style={{ right: MB.margin + 7, top: MB.margin + MB.stepH + MB.gap + 9 }}
          >
            <span
              className="cloud-move cloud-spring inline-block"
              style={{ transform: `rotateX(${is3d ? 360 : 0}deg)` }}
            >
              {is3d ? '3D' : '2D'}
            </span>
          </button>
        )}
        <HelpModal open={isHelpOpen} onOpenChange={setIsHelpOpen} />
      </header>
    );
  }

  return (
    <header className="contents select-none">
      <Link
        href="/"
        aria-label="Geovara, beranda"
        className="absolute z-30 flex items-center justify-center rounded-cloud-a"
        style={{ left: M, top: M, width: TW, height: HH }}
      >
        <GeovaraMark />
      </Link>
      <h1
        className="absolute z-30 hidden lg:flex items-center text-[22px] font-black tracking-tight text-foreground"
        style={{ left: M + TW + 32, top: M, height: HH }}
      >
        Geovara
      </h1>

      {onToggle3d && (
        <div
          role="group"
          aria-label="Mode peta"
          className="absolute z-30 hidden sm:flex h-12 p-1 rounded-cloud-b bg-smoke-mid/55"
          style={{ top: 26, right: M + TW + 28 }}
        >
          <span
            aria-hidden="true"
            className="cloud-move cloud-spring absolute top-1 bottom-1 w-16 bg-primary shadow-[0_4px_10px_rgb(var(--shadow-ink)/0.18)]"
            style={{
              left: is3d ? 68 : 4,
              borderRadius: is3d ? '8px 16px 8px 16px' : '16px 8px 16px 8px',
            }}
          />
          {(['2D', '3D'] as const).map((label) => {
            const on = (label === '3D') === is3d;
            return (
              <button
                key={label}
                type="button"
                aria-pressed={on}
                onClick={() => !on && onToggle3d()}
                className={`relative w-16 text-[15px] font-extrabold transition-colors duration-micro ${
                  on ? 'text-primary-foreground' : 'text-foreground'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      )}

      <div
        className="absolute z-30 flex items-center justify-center gap-1"
        style={{ right: M, top: M, width: TW, height: TH }}
      >
        {helpButton(`${stepButton} rounded-cloud-sa`)}
        {themeButton(`${stepButton} rounded-cloud-sb`)}
      </div>

      <HelpModal open={isHelpOpen} onOpenChange={setIsHelpOpen} />
    </header>
  );
}
