import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { AppProviders } from '@/providers/app-providers';
import './globals.css';
import localFont from 'next/font/local';
const sora = localFont({ src: '../styles/fonts/sora-latin-variable.woff2', variable: '--font-sora', display: 'swap' });
const inter = localFont({ src: '../styles/fonts/inter-latin-variable.woff2', variable: '--font-inter', display: 'swap' });
export const metadata: Metadata = {
  title: { default: 'ORBITA — Operação', template: '%s | ORBITA' },
  description: 'Operação logística ORBITA',
  robots: { index: false, follow: false },
  icons: { icon: '/brand/orbita-symbol.png', apple: '/brand/orbita-symbol.png' },
};
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className={`${sora.variable} ${inter.variable}`}>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
