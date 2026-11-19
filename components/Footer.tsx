import React from 'react';
import Link from 'next/link';
import { SITE_NAME } from '@/lib/site';
import { ConsentSettingsButton } from '@/components/ConsentSettingsButton';

export interface FooterProps {
  /** Muestra el botón para cambiar el consentimiento; solo si AdSense está configurado. */
  mostrarConsentimiento?: boolean;
}

export function Footer({ mostrarConsentimiento = false }: FooterProps) {
  return (
    <footer className="site-footer">
      <div className="footer-container">
        <p className="footer-text">
          <strong>{SITE_NAME}</strong> &bull; Calculadora del coste por kilómetro de un coche eléctrico frente a uno de gasolina o diésel.
        </p>
        <p className="footer-subtext">
          Los precios de los carburantes son las medias de las gasolineras publicadas por el Ministerio para la Transición Ecológica y el Reto Demográfico (MITECO). Las tarifas de recarga eléctrica las recopila Ododex y son orientativas: el precio real depende del operador, de la tarifa contratada y de las promociones. El resultado es una estimación y no es oficial. Sitio independiente: no es una web de ninguna administración pública.
        </p>
        <nav aria-label="Información legal" className="footer-legal">
          <Link href="/aviso-legal">Aviso legal</Link>
          <Link href="/privacidad">Privacidad</Link>
          <Link href="/cookies">Cookies</Link>
          {mostrarConsentimiento && <ConsentSettingsButton />}
        </nav>
      </div>
    </footer>
  );
}
