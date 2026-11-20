'use client';

import { useState, useRef, useEffect } from 'react';
import { Sparkles, Loader2, Plus, ChevronRight } from 'lucide-react';
import { processSpatialIntent, SpatialIntentOutput } from '@/ai/flows/spatial-intent';
import {
  matchQuickSpatialIntent,
  getCachedIntent,
  setCachedIntent,
} from '@/lib/ai-intent-cache';
import { useToast } from '@/hooks/use-toast';

interface AIAssistantProps {
  onAction: (action: SpatialIntentOutput) => void;
  featureContext?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Slot (closed) or panel (open) box from the cloud layout, docked bottom-right. */
  box: { right: number; width: number; height: number };
  /** Narrow slot: show "Ask" instead of "Ask Geovara". */
  compact?: boolean;
}

// Each chip is matched instantly by matchQuickSpatialIntent (no AI call needed).
export const QUICK_COMMANDS = [
  'Menuju ke Jakarta',
  'Buat buffer 100 m',
  'Sederhanakan poligon',
  'Ganti ke satelit',
];

export default function AIAssistant({
  onAction,
  featureContext,
  open: isOpen,
  onOpenChange,
  box,
  compact = false,
}: AIAssistantProps) {
  const [query, setQuery] = useState('');
  const [lastQuery, setLastQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [lastNarrative, setLastNarrative] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Keyboard shortcut Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        onOpenChange(!isOpen);
      }
      if (e.key === 'Escape' && isOpen) {
        onOpenChange(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onOpenChange]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isLoading) return;
    setLastQuery(query.trim());

    // 1. Fast client-side matching (0ms latency, zero quota consumption)
    const quickMatch = matchQuickSpatialIntent(query);
    if (quickMatch) {
      setLastNarrative(quickMatch.narrative);
      onAction(quickMatch);
      setQuery('');
      return;
    }

    // 2. Check local in-memory intent cache
    const cached = getCachedIntent(query, featureContext);
    if (cached) {
      setLastNarrative(cached.narrative);
      onAction(cached);
      setQuery('');
      return;
    }

    setIsLoading(true);
    setLastNarrative('Menganalisis permintaan dengan Gemini…');

    try {
      const result = await processSpatialIntent(query, featureContext);

      if (!result.success) {
        if (result.isQuotaExceeded) {
          setLastNarrative('Batas kuota/kredit AI telah habis. Silakan coba beberapa saat lagi.');
          toast({
            title: 'Kuota/Kredit AI Habis',
            description:
              'Batas permintaan gratis API Gemini terlampaui. Mohon tunggu sekitar 1 menit sebelum mencoba lagi.',
            variant: 'destructive',
            duration: 10000,
          });
        } else {
          setLastNarrative(result.error);
          toast({
            title: 'Kesalahan AI',
            description: result.error,
            variant: 'destructive',
          });
        }
        return;
      }

      const spatialAction = result.data;

      if (spatialAction.action === 'unknown') {
        setLastNarrative(
          "Saya belum paham permintaan itu. Coba 'Buat buffer 100 m' atau 'Menuju ke Bandung'."
        );
        toast({
          title: 'Perintah tidak dikenali',
          description: 'Coba ubah kalimat permintaan Anda.',
          variant: 'destructive',
        });
      } else {
        // Save to cache
        setCachedIntent(query, spatialAction, featureContext);

        setLastNarrative(spatialAction.narrative);
        onAction(spatialAction);

        setQuery('');
      }
    } catch {
      setLastNarrative('Terjadi kesalahan. Silakan coba lagi.');
      toast({
        title: 'Kesalahan AI',
        description: 'Gagal memproses perintah.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-label="Asisten Geovara"
      className="glass-smoke float-shadow cloud-move cloud-spring absolute z-40 overflow-hidden"
      style={{
        right: box.right,
        bottom: box.right,
        width: box.width,
        height: box.height,
        borderRadius: isOpen ? 28 : '22px 22px 30px 22px',
      }}
    >
      {/* Collapsed pill */}
      <button
        type="button"
        onClick={() => onOpenChange(true)}
        aria-expanded={false}
        tabIndex={isOpen ? -1 : 0}
        title="Ask Geovara (Ctrl+K)"
        className="cloud-fade absolute inset-0 flex items-center justify-center gap-2 text-[15px] font-black text-foreground"
        style={{ opacity: isOpen ? 0 : 1, pointerEvents: isOpen ? 'none' : 'auto' }}
      >
        <span className="w-[34px] h-[34px] flex-shrink-0 flex items-center justify-center rounded-cloud-sb bg-ember text-white">
          <Sparkles className="h-[18px] w-[18px]" strokeWidth={1.8} />
        </span>
        {compact ? 'Ask' : 'Ask Geovara'}
      </button>

      {/* Expanded panel */}
      <div
        className="cloud-fade absolute inset-0 flex flex-col"
        style={{
          opacity: isOpen ? 1 : 0,
          transform: `translateY(${isOpen ? 0 : 20}px)`,
          pointerEvents: isOpen ? 'auto' : 'none',
        }}
        aria-hidden={!isOpen}
      >
        <div className="flex items-center justify-between h-14 pl-[18px] pr-2.5 flex-shrink-0">
          <span className="flex items-center gap-2 font-black">
            <Sparkles className="h-[18px] w-[18px] text-ember" strokeWidth={1.8} />
            Ask Geovara
          </span>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Tutup asisten"
            title="Tutup asisten (Esc)"
            tabIndex={isOpen ? 0 : -1}
            className="w-10 h-10 flex items-center justify-center rounded-cloud-sb bg-smoke-mid/55 text-foreground hover:bg-smoke-mid transition-colors"
          >
            <Plus className="h-[18px] w-[18px] rotate-45" strokeWidth={1.8} />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-2.5 px-3.5 py-1.5 text-sm leading-normal">
          {lastQuery && (
            <div className="self-end max-w-[85%] px-3.5 py-2.5 rounded-cloud-a bg-primary text-primary-foreground">
              {lastQuery}
            </div>
          )}
          {(lastNarrative || isLoading) && (
            <div className="max-w-[90%] px-3.5 py-2.5 rounded-cloud-b bg-smoke-well/75" aria-live="polite">
              {isLoading ? (
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin text-ember" />
                  {lastNarrative || 'Berpikir…'}
                </span>
              ) : (
                lastNarrative
              )}
            </div>
          )}
          {!lastQuery && !isLoading && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {QUICK_COMMANDS.map((cmd, i) => (
                <button
                  key={cmd}
                  type="button"
                  tabIndex={isOpen ? 0 : -1}
                  onClick={() => {
                    setQuery(cmd);
                    inputRef.current?.focus();
                  }}
                  className={`text-xs font-bold px-3 py-1.5 bg-smoke-well/70 hover:bg-smoke-well text-foreground transition-colors ${
                    i % 2 ? 'rounded-cloud-sb' : 'rounded-cloud-sa'
                  }`}
                >
                  {cmd}
                </button>
              ))}
            </div>
          )}
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex items-center gap-2 mx-3 mb-3 h-12 pl-4 pr-1.5 rounded-cloud-a bg-smoke-well/75 text-muted-foreground flex-shrink-0"
        >
          <label htmlFor="ask-geovara-input" className="sr-only">
            Pesan
          </label>
          <input
            id="ask-geovara-input"
            ref={inputRef}
            type="text"
            tabIndex={isOpen ? 0 : -1}
            className="flex-1 min-w-0 bg-transparent border-none outline-none text-sm text-foreground placeholder:text-muted-foreground"
            placeholder="Tanyakan tentang data Anda…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={isLoading}
          />
          <button
            type="submit"
            aria-label="Kirim"
            tabIndex={isOpen ? 0 : -1}
            disabled={isLoading || !query.trim()}
            className="w-9 h-9 flex items-center justify-center rounded-cloud-sb bg-primary text-primary-foreground disabled:opacity-50 transition-opacity"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChevronRight className="h-4 w-4" strokeWidth={1.8} />}
          </button>
        </form>
      </div>
    </div>
  );
}
