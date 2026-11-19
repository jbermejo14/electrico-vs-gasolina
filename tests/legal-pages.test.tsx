import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import AvisoLegalPage, { metadata as avisoMetadata } from '../app/aviso-legal/page';
import PrivacidadPage, { metadata as privacidadMetadata } from '../app/privacidad/page';
import CookiesPage, { metadata as cookiesMetadata } from '../app/cookies/page';
import { AdSenseScript } from '../components/AdSenseScript';
import { Footer } from '../components/Footer';
import { getTitular, valorOPendiente } from '../lib/legal';

const TEST_ADSENSE_CLIENT = 'ca-pub-0000000000000000';
const LEGAL_ROBOTS = { index: false, follow: true };
const FORBIDDEN_CASE_SENSITIVE_TERMS = ['IEDMT', 'ITP'];
const FORBIDDEN_CASE_INSENSITIVE_TERM = 'impuesto';

function legalConAdSense(valor: string | undefined, prueba: () => void): void {
  const previo = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;
  if (valor === undefined) delete process.env.NEXT_PUBLIC_ADSENSE_CLIENT;
  else process.env.NEXT_PUBLIC_ADSENSE_CLIENT = valor;
  try {
    prueba();
  } finally {
    if (previo === undefined) delete process.env.NEXT_PUBLIC_ADSENSE_CLIENT;
    else process.env.NEXT_PUBLIC_ADSENSE_CLIENT = previo;
  }
}

test('aviso legal: muestra nombre del titular o marcador, y no se indexa', () => {
  const html = renderToStaticMarkup(<AvisoLegalPage />);
  assert.ok(html.includes(valorOPendiente(getTitular(), 'nombre')));
  assert.ok(html.includes('LSSI'));
  assert.deepEqual(avisoMetadata.robots, LEGAL_ROBOTS);
  assert.ok(html.includes('MITECO'));
  assert.ok(html.includes('orientativ'));
});

test('privacidad: muestra el titular y menciona a la AEPD', () => {
  const html = renderToStaticMarkup(<PrivacidadPage />);
  assert.ok(html.includes(valorOPendiente(getTitular(), 'nombre')));
  assert.ok(html.includes('AEPD'));
  assert.ok(html.includes('AdSense'));
  assert.deepEqual(privacidadMetadata.robots, LEGAL_ROBOTS);
});

test('cookies: documenta ododex-theme y el enlace de Google', () => {
  const html = renderToStaticMarkup(<CookiesPage />);
  assert.ok(html.includes('ododex-theme'));
  assert.ok(html.includes('https://policies.google.com/technologies/cookies?hl=es'));
  assert.ok(html.includes('CMP'));
  assert.deepEqual(cookiesMetadata.robots, LEGAL_ROBOTS);
});

test('legales: no heredan términos de la web de impuestos', () => {
  const pages = [<AvisoLegalPage />, <PrivacidadPage />, <CookiesPage />];
  for (const page of pages) {
    const html = renderToStaticMarkup(page);
    for (const term of FORBIDDEN_CASE_SENSITIVE_TERMS) assert.ok(!html.includes(term), `aparece ${term}`);
    assert.ok(!html.toLowerCase().includes(FORBIDDEN_CASE_INSENSITIVE_TERM), 'aparece impuesto');
  }
});

test('layout: no fija robots global (cada página pone el suyo)', () => {
  const layout = readFileSync(path.join(process.cwd(), 'app', 'layout.tsx'), 'utf-8');
  assert.ok(!layout.includes('robots'));
});

test('AdSenseScript no renderiza nada sin variable o con valor inválido', () => {
  legalConAdSense(undefined, () => assert.equal(AdSenseScript(), null));
  legalConAdSense('', () => assert.equal(AdSenseScript(), null));
  legalConAdSense('ca-pub-123', () => assert.equal(AdSenseScript(), null));
});

test('AdSenseScript renderiza el script con un ca-pub válido', () => {
  legalConAdSense(TEST_ADSENSE_CLIENT, () => {
    const element = AdSenseScript();
    assert.ok(element);
    assert.equal(
      element.props.src,
      `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${TEST_ADSENSE_CLIENT}`
    );
    assert.equal(element.props.strategy, 'afterInteractive');
    assert.equal(element.props.crossOrigin, 'anonymous');
  });
});

test('Footer: enlaces legales siempre; botón de cookies solo si se pide', () => {
  const sin = renderToStaticMarkup(<Footer />);
  for (const ruta of ['/aviso-legal', '/privacidad', '/cookies']) {
    assert.ok(sin.includes(`href="${ruta}"`), `Falta ${ruta}`);
  }
  assert.ok(!sin.includes('Configurar cookies'));
  assert.ok(renderToStaticMarkup(<Footer mostrarConsentimiento />).includes('Configurar cookies'));
});
