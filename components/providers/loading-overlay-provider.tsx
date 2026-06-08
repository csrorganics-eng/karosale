"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useIsFetching } from "@tanstack/react-query";
import { WaitingOverlay } from "@/components/ui/waiting-overlay";

type LoadingOverlayContextValue = {
  /** Increment global blocking overlay (call `stop` once per `start`). */
  start: (message?: string) => void;
  stop: () => void;
  /** Runs `fn` between start/stop; rethrows errors after `stop`. */
  runWithLoading: <T>(message: string | undefined, fn: () => Promise<T>) => Promise<T>;
};

const LoadingOverlayContext = createContext<LoadingOverlayContextValue | null>(null);

export function useLoadingOverlay(): LoadingOverlayContextValue {
  const ctx = useContext(LoadingOverlayContext);
  if (!ctx) {
    throw new Error("useLoadingOverlay must be used within LoadingOverlayProvider");
  }
  return ctx;
}

/**
 * Global wait layer:
 * - **Manual**: `start` / `stop` / `runWithLoading` for mutations and slow forms (checkout, etc.).
 * - **React Query**: debounced overlay while any query is fetching (widgets using `useQuery`).
 */
export function LoadingOverlayProvider({ children }: { children: ReactNode }) {
  const [manualCount, setManualCount] = useState(0);
  const [manualMessage, setManualMessage] = useState<string | undefined>();

  const start = useCallback((message?: string) => {
    setManualCount((c) => c + 1);
    if (message) setManualMessage(message);
  }, []);

  const stop = useCallback(() => {
    setManualCount((c) => {
      const next = Math.max(0, c - 1);
      if (next === 0) setManualMessage(undefined);
      return next;
    });
  }, []);

  const runWithLoading = useCallback(
    async <T,>(message: string | undefined, fn: () => Promise<T>): Promise<T> => {
      start(message);
      try {
        return await fn();
      } finally {
        stop();
      }
    },
    [start, stop],
  );

  const isFetching = useIsFetching();
  const [queryOverlay, setQueryOverlay] = useState(false);
  const queryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isFetching === 0) {
      if (queryTimer.current) {
        clearTimeout(queryTimer.current);
        queryTimer.current = null;
      }
      setQueryOverlay(false);
      return;
    }
    queryTimer.current = setTimeout(() => setQueryOverlay(true), 280);
    return () => {
      if (queryTimer.current) {
        clearTimeout(queryTimer.current);
        queryTimer.current = null;
      }
    };
  }, [isFetching]);

  const manualVisible = manualCount > 0;
  const visible = manualVisible || queryOverlay;
  const message = manualVisible
    ? manualMessage
    : queryOverlay
      ? "Loading…"
      : manualMessage;

  const value = useMemo(
    () => ({ start, stop, runWithLoading }),
    [start, stop, runWithLoading],
  );

  return (
    <LoadingOverlayContext.Provider value={value}>
      {children}
      <WaitingOverlay open={visible} message={message} />
    </LoadingOverlayContext.Provider>
  );
}
