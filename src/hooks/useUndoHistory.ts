import { useState, useCallback, useRef } from 'react';

/**
 * useUndoHistory Hook: Manages a history of states for Undo/Redo operations.
 * This demonstrates advanced state machine management.
 */
export function useUndoHistory<T>(initialState: T, limit: number = 50) {
  const [current, setCurrent] = useState<T>(initialState);
  const [past, setPast] = useState<T[]>([]);
  const [future, setFuture] = useState<T[]>([]);
  
  // Ref to track if the change was triggered by undo/redo to avoid loop
  const isInternalChange = useRef(false);

  const set = useCallback((newState: T) => {
    if (isInternalChange.current) {
      isInternalChange.current = false;
      return;
    }

    if (newState === current) return;

    setPast(prev => {
      const next = [...prev, current];
      if (next.length > limit) return next.slice(1);
      return next;
    });
    setCurrent(newState);
    setFuture([]); // Clear redo history on new action
  }, [current, limit]);

  const undo = useCallback(() => {
    if (past.length === 0) return;

    const previous = past[past.length - 1];
    const newPast = past.slice(0, past.length - 1);

    isInternalChange.current = true;
    setFuture(prev => [current, ...prev]);
    setPast(newPast);
    setCurrent(previous);
    
    return previous;
  }, [past, current]);

  const redo = useCallback(() => {
    if (future.length === 0) return;

    const next = future[0];
    const newFuture = future.slice(1);

    isInternalChange.current = true;
    setPast(prev => [...prev, current]);
    setFuture(newFuture);
    setCurrent(next);

    return next;
  }, [future, current]);

  return {
    state: current,
    set,
    undo,
    redo,
    canUndo: past.length > 0,
    canRedo: future.length > 0,
    // For external state synchronization
    reset: (newState: T) => {
        setCurrent(newState);
        setPast([]);
        setFuture([]);
    }
  };
}
