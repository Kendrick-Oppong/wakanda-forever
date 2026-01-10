"use client";

import { createContext, useContext, useState, ReactNode } from "react";

interface LoaderContextType {
  loaderComplete: boolean;
  setLoaderComplete: (value: boolean) => void;
}

const LoaderContext = createContext<LoaderContextType | undefined>(undefined);

export function useLoaderComplete() {
  const context = useContext(LoaderContext);
  if (context === undefined) {
    throw new Error("useLoaderComplete must be used within LoaderProvider");
  }
  return context;
}

export function LoaderProvider({ children }: { children: ReactNode }) {
  const [loaderComplete, setLoaderComplete] = useState(false);

  return (
    <LoaderContext.Provider value={{ loaderComplete, setLoaderComplete }}>
      {children}
    </LoaderContext.Provider>
  );
}
