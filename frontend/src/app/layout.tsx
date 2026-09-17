import type { Metadata } from 'next';
import './globals.css';
import { Header } from '@/components/layout/Header';
import { RoleProvider } from '@/context/RoleContext';
import { AnomalyProvider } from '@/context/AnomalyContext';
import { RoleGuard } from '@/components/layout/RoleGuard';

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
      <body className="flex h-screen bg-white text-gray-900 font-sans antialiased overflow-hidden">
        <RoleProvider>
          <AnomalyProvider>
            <div className="flex flex-col flex-1 overflow-hidden bg-white relative">
              <Header />
              <main className="flex-1 overflow-y-auto p-6 bg-gray-50/40">
                <RoleGuard>{children}</RoleGuard>
              </main>
            </div>
          </AnomalyProvider>
        </RoleProvider>
      </body>
    </html>
  );
}
