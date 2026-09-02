"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { fetchApi, Batch } from "@/lib/api";

interface SessionContextType {
  selectedBatchId: string | null;
  setSelectedBatchId: (id: string | null) => void;
  batches: Batch[];
  loadingBatches: boolean;
  refreshBatches: () => Promise<void>;
  selectedBatch: Batch | null;
}

const SessionContext = createContext<SessionContextType>({
  selectedBatchId: null,
  setSelectedBatchId: () => {},
  batches: [],
  loadingBatches: true,
  refreshBatches: async () => {},
  selectedBatch: null,
});

const STORAGE_KEY = "ledgerlens-selected-batch";

export function SessionProvider({ children }: { children: ReactNode }) {
  const [selectedBatchId, setSelectedBatchIdState] = useState<string | null>(null);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loadingBatches, setLoadingBatches] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) setSelectedBatchIdState(stored);
  }, []);

  const setSelectedBatchId = (id: string | null) => {
    setSelectedBatchIdState(id);
    if (id) {
      localStorage.setItem(STORAGE_KEY, id);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  async function refreshBatches() {
    try {
      setLoadingBatches(true);
      const data = await fetchApi<Batch[]>("/api/batches");
      setBatches(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingBatches(false);
    }
  }

  useEffect(() => {
    refreshBatches();
  }, []);

  useEffect(() => {
    if (!loadingBatches && selectedBatchId && batches.length > 0) {
      const exists = batches.some((b) => b.id === selectedBatchId);
      if (!exists) {
        setSelectedBatchIdState(null);
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, [loadingBatches, selectedBatchId, batches]);

  const selectedBatch = batches.find((b) => b.id === selectedBatchId) || null;

  return (
    <SessionContext.Provider
      value={{
        selectedBatchId,
        setSelectedBatchId,
        batches,
        loadingBatches,
        refreshBatches,
        selectedBatch,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  return useContext(SessionContext);
}
