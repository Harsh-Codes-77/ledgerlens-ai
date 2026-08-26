import "./globals.css";
import Sidebar from "@/components/Sidebar";

export const metadata = {
  title: "LedgerLens AI — Autonomous Financial Reconciliation",
  description:
    "Autonomous Financial Reconciliation Agent — Track 4: AI Finance Controller",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-background text-foreground antialiased">
        <div className="flex min-h-screen">
          <Sidebar />
          <div className="flex-1 flex flex-col min-w-0">
            {children}
          </div>
        </div>
      </body>
    </html>
  );
}
