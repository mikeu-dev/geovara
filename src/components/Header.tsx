'use client';

import React, { useState } from 'react';
import { Sun, Moon, HelpCircle, Github } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import HelpModal from './HelpContent';
import { CLOUD } from '@/lib/cloud-shape';

interface HeaderProps {
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
  is3d?: boolean;
  onToggle3d?: () => void;
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
  'w-[30px] h-[30px] flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-smoke-mid/55 transition-colors';

/**
 * Header content. Sits on top of the CloudShell: the logo fills the left
 * sidebar's tab, the wordmark and 2D/3D switch live in the header piece, and
 * help / theme / GitHub sit in the header's stepped right end.
 */
export default function Header({ theme = 'light', onToggleTheme, is3d = false, onToggle3d }: HeaderProps) {
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  return (
    <header className="contents select-none">
      <a
        href="/"
        aria-label="Geovara, beranda"
        className="absolute z-30 flex items-center justify-center rounded-cloud-a"
        style={{ left: M, top: M, width: TW, height: HH }}
      >
        <GeovaraMark />
      </a>
      <h1
        className="absolute z-30 flex items-center text-[22px] font-black tracking-tight text-foreground"
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
            style={{ left: is3d ? 68 : 4, borderRadius: is3d ? '8px 16px 8px 16px' : '16px 8px 16px 8px' }}
          />
          {(['2D', '3D'] as const).map((label) => {
            const on = (label === '3D') === is3d;
            return (
              <button
                key={label}
                type="button"
                aria-pressed={on}
                onClick={() => !on && onToggle3d()}
                className={`relative w-16 text-[15px] font-extrabold transition-colors duration-300 ${
                  on ? 'text-primary-foreground' : 'text-foreground'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      )}

      <TooltipProvider>
        <div
          className="absolute z-30 flex items-center justify-center gap-[2px]"
          style={{ right: M, top: M, width: TW, height: TH }}
        >
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => setIsHelpOpen(true)}
                className={`${stepButton} rounded-cloud-sa`}
                aria-label="Bantuan & dokumentasi"
              >
                <HelpCircle className="h-[18px] w-[18px]" strokeWidth={1.8} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p className="text-xs">Panduan & Dokumentasi</p>
            </TooltipContent>
          </Tooltip>

          {onToggleTheme && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={onToggleTheme}
                  className={`${stepButton} rounded-cloud-sb`}
                  aria-label={theme === 'light' ? 'Mode gelap' : 'Mode terang'}
                >
                  {theme === 'light' ? (
                    <Moon className="h-[18px] w-[18px]" strokeWidth={1.8} />
                  ) : (
                    <Sun className="h-[18px] w-[18px]" strokeWidth={1.8} />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="text-xs">{theme === 'light' ? 'Mode gelap' : 'Mode terang'}</p>
              </TooltipContent>
            </Tooltip>
          )}

          <Tooltip>
            <TooltipTrigger asChild>
              <a
                href="https://github.com/mikeu-dev/geovara"
                target="_blank"
                rel="noopener noreferrer"
                className={`${stepButton} rounded-cloud-sa`}
                aria-label="GitHub: mikeu-dev/geovara"
              >
                <Github className="h-[18px] w-[18px]" strokeWidth={1.8} />
              </a>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p className="text-xs">© {new Date().getFullYear()} mikeudev.my.id · GitHub</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>

      <HelpModal open={isHelpOpen} onOpenChange={setIsHelpOpen} />
    </header>
  );
}
