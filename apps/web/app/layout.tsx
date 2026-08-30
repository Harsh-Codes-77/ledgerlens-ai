"use client";

import "./globals.css";
import Sidebar from "@/components/Sidebar";
import { SessionProvider } from "@/lib/session-context";
import { MobileNavProvider } from "@/lib/mobile-nav-context";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-background text-foreground antialiased">
        <SessionProvider>
          <MobileNavProvider>
            <div className="flex min-h-screen max-w-[100vw] overflow-x-hidden">
              <Sidebar />
              <div className="flex-1 flex flex-col min-w-0">
                {children}
              </div>
            </div>
          </MobileNavProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
