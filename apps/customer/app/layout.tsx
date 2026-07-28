import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Kismayo QR Menu',
  description: 'Scan. Order. Pay. - From Table to Kitchen in Seconds',
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  themeColor: '#00a86b',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="so">
      <body>{children}</body>
    </html>
  );
}
