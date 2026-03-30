import { useState, useCallback, useRef } from 'react';

/**
 * useUndoHistory Hook: Manages a history of states for Undo/Redo operations.
 * Uses refs internally to keep callback identity stable and prevent infinite re-renders.
 */
export function useUndoHistory<T>(initialState: T, limit: number = 50) {
  const [current, setCurrent] = useState<T>(initialState);
  const [past, setPast] = useState<T[]>([]);
  const [future, setFuture] = useState<T[]>([]);
  
  // Use refs to keep stable callback identities
  const currentRef = useRef<T>(initialState);
  currentRef.current = current;
  
  const pastRef = useRef<T[]>([]);
  pastRef.current = past;
  
  const futureRef = useRef<T[]>([]);
  futureRef.current = future;

  const set = useCallback((newState: T) => {
    if (newState === currentRef.current) return;

    const prev = currentRef.current;
    setPast(p => {
      const next = [...p, prev];
      if (next.length > limit) return next.slice(1);
      return next;
    });
    setCurrent(newState);
    setFuture([]);
  }, [limit]);

  const undo = useCallback(() => {
    const p = pastRef.current;
    if (p.length === 0) return undefined;

    const previous = p[p.length - 1];
    const newPast = p.slice(0, p.length - 1);

    setFuture(f => [currentRef.current, ...f]);
    setPast(newPast);
    setCurrent(previous);
    
    return previous;
  }, []);

  const redo = useCallback(() => {
    const f = futureRef.current;
    if (f.length === 0) return undefined;

    const next = f[0];
    const newFuture = f.slice(1);

    setPast(p => [...p, currentRef.current]);
    setFuture(newFuture);
    setCurrent(next);

    return next;
  }, []);

  const reset = useCallback((newState: T) => {
    setCurrent(newState);
    setPast([]);
    setFuture([]);
  }, []);

  return {
    state: current,
    set,
    undo,
    redo,
    canUndo: past.length > 0,
    canRedo: future.length > 0,
    reset,
  };
}
