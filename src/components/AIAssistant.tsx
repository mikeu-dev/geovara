'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Sparkles, Loader2, Command, X, ArrowRight } from 'lucide-react';
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
  const [lastNarrative, setLastNarrative] = useState('');
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
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isLoading) return;

    setIsLoading(true);
    setLastNarrative('Analyzing your request...');
    
    try {
      const result = await processSpatialIntent(query, featureContext);
      
      if (result.action === 'unknown') {
        setLastNarrative("I'm not sure how to help with that. Try 'Buffer this by 100m' or 'Fly to Paris'.");
        toast({
          title: "Unknown Command",
          description: "Try rephrasing your request.",
          variant: 'destructive',
        });
      } else {
        setLastNarrative(result.narrative);
        onAction(result);
        
        // Auto-close after a delay to let user read narrative
        setTimeout(() => {
          setQuery('');
          setIsOpen(false);
          setLastNarrative('');
        }, 3000);
      }
    } catch (err) {
      setLastNarrative('Something went wrong. Please try again.');
      toast({
        title: "AI Error",
        description: "Failed to process command.",
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
        className="fixed bottom-12 right-6 z-30 p-3 rounded-2xl glass shadow-2xl hover:scale-105 hover:shadow-accent/20 transition-all border border-white/10 bg-accent/10 group active:scale-95"
        title="Ask Geovara Intelligence (Ctrl+K)"
      >
        <Sparkles className="h-6 w-6 text-accent animate-pulse group-hover:scale-110 transition-transform" />
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4 bg-background/40 backdrop-blur-md animate-in fade-in duration-300">
      <div 
        className="w-full max-w-2xl overflow-hidden rounded-2xl shadow-[0_32px_64px_-12px_rgba(0,0,0,0.5)] border border-white/10 bg-card/80 backdrop-blur-2xl animate-in slide-in-from-top-8 duration-500"
      >
        <div className="relative">
          <form onSubmit={handleSubmit} className="flex items-center p-5 gap-4">
            <div className="flex-shrink-0">
              {isLoading ? (
                <div className="relative">
                   <div className="absolute inset-0 bg-accent/20 blur-xl rounded-full animate-pulse" />
                   <Loader2 className="h-6 w-6 animate-spin text-accent relative z-10" />
                </div>
              ) : (
                <Sparkles className="h-6 w-6 text-accent" />
              )}
            </div>
            
            <input
              ref={inputRef}
              type="text"
              className="flex-1 bg-transparent border-none outline-none text-lg font-medium placeholder:text-muted-foreground/50 pr-4 selection:bg-accent/30"
              placeholder="Ask Geovara (e.g., 'Fly to Jakarta' or 'Buffer these polylines')..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={isLoading}
            />

            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-lg border border-white/5 bg-white/5 text-[10px] text-muted-foreground font-mono uppercase tracking-wider">
                <Command className="h-3 w-3" />
                <span>Enter</span>
              </div>
              
              <button 
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-foreground transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </form>

          {/* AI Feedback/Narrative area */}
          {(lastNarrative || isLoading) && (
            <div className="px-5 pb-5 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="pt-4 border-t border-white/5 flex items-start gap-3">
                <div className="mt-1 p-1 rounded bg-accent/10 border border-accent/20">
                    <div className="w-1.5 h-1.5 rounded-full bg-accent animate-ping" />
                </div>
                <p className="text-sm text-foreground/80 leading-relaxed italic">
                  {lastNarrative || (
                    <span className="flex items-center gap-1">
                      Thinking<span className="animate-bounce">.</span><span className="animate-bounce [animation-delay:0.2s]">.</span><span className="animate-bounce [animation-delay:0.4s]">.</span>
                    </span>
                  )}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Suggestions / Shortcuts Footer */}
        {!isLoading && !lastNarrative && (
           <div className="bg-white/5 px-5 py-3 flex flex-wrap gap-2">
              <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold self-center mr-2">Quick Commands:</span>
              {['Fly to Jakarta', 'Buffer all', 'Simplify polygons', 'Switch to satellite'].map(cmd => (
                <button 
                  key={cmd}
                  onClick={() => setQuery(cmd)}
                  className="text-xs px-2.5 py-1.5 rounded-full bg-white/5 border border-white/10 hover:bg-accent/10 hover:border-accent/30 transition-all text-muted-foreground hover:text-accent-foreground"
                >
                  {cmd}
                </button>
              ))}
           </div>
        )}
      </div>
    </div>
  );
}
