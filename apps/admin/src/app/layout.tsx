import type { Metadata } from 'next';
import { Lato, Montserrat, Playfair_Display } from 'next/font/google';
import { NO_FLASH_SCRIPT, ThemeProvider } from '@/lib/theme';
import './globals.css';

const playfair = Playfair_Display({ subsets: ['latin'], weight: '700', variable: '--font-playfair' });
const montserrat = Montserrat({ subsets: ['latin'], weight: ['600', '800'], variable: '--font-montserrat' });
const lato = Lato({ subsets: ['latin'], weight: ['300', '400', '700'], variable: '--font-lato' });

export const metadata: Metadata = { title: 'Archer Admin', robots: { index: false, follow: false } };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning className={`${playfair.variable} ${montserrat.variable} ${lato.variable}`}>
      <head><script dangerouslySetInnerHTML={{ __html: NO_FLASH_SCRIPT }} /></head>
      <body><ThemeProvider>{children}</ThemeProvider></body>
    </html>
  );
}
