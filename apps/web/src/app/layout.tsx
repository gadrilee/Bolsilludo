import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Bolsilludo — Tu sistema operativo de finanzas personales',
  description:
    'Presupuesto base-cero, multi-divisa, copiloto IA y gestión de patrimonio. ' +
    'Controla cada peso sin depender de hojas de cálculo.',
  keywords: ['presupuesto', 'finanzas personales', 'YNAB', 'Bolivia', 'cero-base'],
  authors: [{ name: 'Bolsilludo Team' }],
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.ico',
    apple: '/icons/icon-192.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#16B78C',
  colorScheme: 'dark',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" data-theme="dark" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
