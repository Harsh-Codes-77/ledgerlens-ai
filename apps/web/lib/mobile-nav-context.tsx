"use client";

import { createContext, useContext, useState, ReactNode } from "react";

interface MobileNavContextType {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const MobileNavContext = createContext<MobileNavContextType>({
  open: false,
  setOpen: () => {},
});

export function MobileNavProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <MobileNavContext.Provider value={{ open, setOpen }}>
      {children}
    </MobileNavContext.Provider>
  );
}

export function useMobileNav() {
  return useContext(MobileNavContext);
}