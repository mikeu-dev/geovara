'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Sparkles, Loader2, Command, X } from 'lucide-react';
import { processSpatialIntent, SpatialIntentOutput } from '@/ai/flows/spatial-intent';
import { useToast } from '@/hooks/use-toast';

interface AIAssistantProps {
  onAction: (action: SpatialIntentOutput) => void;
  featureContext?: string;
}

export default function AIAssistant({ onAction, featureContext }: AIAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Keyboard shortcut Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isLoading) return;

    setIsLoading(true);
    try {
      const result = await processSpatialIntent(query, featureContext);
      if (result.action === 'unknown') {
        toast({
          title: "Unknown Command",
          description: "I'm not sure how to help with that. Try 'Buffer this by 100m' or 'Fly to Paris'.",
          variant: 'destructive',
        });
      } else {
        onAction(result);
        setQuery('');
        setIsOpen(false);
        toast({
          title: "Geovara Intelligence",
          description: result.narrative,
        });
      }
    } catch (err) {
      toast({
        title: "AI Error",
        description: "Failed to process command. Please try again.",
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-12 right-6 z-30 p-3 rounded-full status-bar shadow-xl hover:scale-110 transition-all border border-glass-border bg-accent/10 group active:scale-95"
        title="Ask Geovara Intelligence (Ctrl+K)"
      >
        <Sparkles className="h-5 w-5 text-accent group-hover:text-accent-foreground" />
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-background/20 backdrop-blur-[2px] animate-fade-in">
      <div className="w-full max-w-xl mx-4 overflow-hidden rounded-xl shadow-2xl border border-glass-border status-bar animate-scale-in">
        <form onSubmit={handleSubmit} className="flex items-center p-4 gap-3">
          <Sparkles className={`h-5 w-5 text-accent ${isLoading ? 'animate-pulse' : ''}`} />
          <input
            ref={inputRef}
            type="text"
            className="flex-1 bg-transparent border-none outline-none text-base placeholder:text-muted-foreground pr-4"
            placeholder="Ask Geovara (e.g., 'Fly to Tokyo' or 'Buffer these lines')..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="flex items-center gap-2">
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : (
              <div className="hidden sm:flex items-center gap-1 px-1.5 py-0.5 rounded border border-muted bg-muted/50 text-[10px] text-muted-foreground uppercase font-medium">
                <Command className="h-2.5 w-2.5" />
                <span>Enter</span>
              </div>
            )}
            <button 
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-md hover:bg-muted text-muted-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
