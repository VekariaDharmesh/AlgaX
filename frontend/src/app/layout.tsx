import type { Metadata } from 'next';
import './globals.css';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';

export const metadata: Metadata = {
  title: 'AlgaX',
  description: 'Carbon Intelligence & Verification Platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="flex h-screen bg-slate-100/80 text-gray-900 font-sans antialiased overflow-hidden p-3 gap-3">
        <Sidebar />
        <div className="flex flex-col flex-1 overflow-hidden bg-white rounded-2xl border border-gray-200/90 shadow-sm">
          <Header />
          <main className="flex-1 overflow-y-auto p-6 bg-gray-50/40">{children}</main>
        </div>
      </body>
    </html>
  );
}
