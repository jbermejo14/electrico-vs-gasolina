import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { AdSenseScript, getAdSenseClient } from '@/components/AdSenseScript';
import { formatMitecoMonth } from '@/lib/format';
import { getFuelPriceSummary } from '@/lib/fuelPriceData';
import { absoluteUrl, getSiteUrl, SITE_NAME } from '@/lib/site';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter',
  display: 'swap'
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['500', '700'],
  variable: '--font-jetbrains',
  display: 'swap'
});

/**
 * Fija el tema antes de pintar para evitar el parpadeo: primero la elección guardada
 * y, si no hay, la preferencia del sistema. El try/catch cubre un localStorage no disponible.
 */
const THEME_SCRIPT = `
  (function() {
    var theme = null;
    try {
      var saved = localStorage.getItem('ododex-theme');
      if (saved === 'light' || saved === 'dark') theme = saved;
      if (!theme) {
        var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        theme = prefersDark ? 'dark' : 'light';
      }
    } catch (e) {
      theme = 'light';
    }
    document.documentElement.setAttribute('data-theme', theme);
  })();
`;

const homeUrl = absoluteUrl('/');
// El mes sale de la fecha de MITECO de los datos, no se escribe a mano.
const homeTitle = `Coche eléctrico o gasolina: coste por km en España (${formatMitecoMonth(getFuelPriceSummary().mitecoDate)})`;

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: homeTitle,
    template: `%s | ${SITE_NAME}`
  },
  description: 'Compara el coste por kilómetro de un coche eléctrico y uno de gasolina o diésel con el precio medio real de los carburantes en España y tarifas de recarga orientativas. Resultado orientativo, no oficial.',
  authors: [{ name: SITE_NAME }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  alternates: {
    canonical: homeUrl
  },
  openGraph: {
    type: 'website',
    locale: 'es_ES',
    url: homeUrl,
    siteName: SITE_NAME,
    title: 'Coche eléctrico o gasolina: ¿cuánto cuesta el kilómetro?',
    description: 'Coste por 100 km y por año de un coche eléctrico frente a uno de gasolina o diésel, con precios medios reales de combustible (MITECO) y tarifas de recarga orientativas.'
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: THEME_SCRIPT
          }}
        />
      </head>
      <body>
        <Header />
        {children}
        <Footer mostrarConsentimiento={getAdSenseClient() !== null} />
        <AdSenseScript />
      </body>
    </html>
  );
}
