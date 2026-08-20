import "./globals.css";
import Sidebar from "@/components/Sidebar";

export const metadata = {
  title: "LedgerLens AI — Autonomous Financial Reconciliation",
  description: "Autonomous Financial Reconciliation Agent built for Razorpay Buildathon — Track 4: AI Finance Controller",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-background text-primaryText min-h-screen flex text-sm">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          {children}
        </div>
      </body>
    </html>
  );
}
