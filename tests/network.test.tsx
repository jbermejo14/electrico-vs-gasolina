import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Footer } from '../components/Footer';
import { NetworkLinks } from '../components/NetworkLinks';
import { NETWORK_FILE_VARIABLE, getNetworkLinks, getNetworkSections, loadNetwork } from '../lib/network';
import { BASE_PATH } from '../lib/site';

const PAGE_KEY = `${BASE_PATH}/alicante`;
const OTHER_ROUTE = '/es/gasolineras';

const NETWORK = {
  version: 1,
  generado: '2026-11-19T18:00:00.000Z',
  secciones: [
    { ruta: BASE_PATH, nombre: 'Propia', descripcion: 'La propia web.' },
    { ruta: OTHER_ROUTE, nombre: 'Gasolineras', descripcion: 'Precios.' },
  ],
  enlaces: {
    [PAGE_KEY]: [{ seccion: OTHER_ROUTE, texto: 'Gasolineras en Alicante', href: `${OTHER_ROUTE}/provincia/alicante` }],
  },
};

function temporaryFile(name: string, content: string): string {
  const file = join(mkdtempSync(join(tmpdir(), 'network-')), name);
  writeFileSync(file, content);
  return file;
}

test('sin variable de entorno ni ruta, devuelve null sin error', () => {
  const previous = process.env[NETWORK_FILE_VARIABLE];
  delete process.env[NETWORK_FILE_VARIABLE];
  try {
    assert.equal(loadNetwork(), null);
    assert.equal(getNetworkSections(), null);
    assert.deepEqual(getNetworkLinks(PAGE_KEY), []);
  } finally {
    if (previous !== undefined) process.env[NETWORK_FILE_VARIABLE] = previous;
  }
});

test('fichero inexistente devuelve null sin error', () => {
  assert.equal(loadNetwork(join(tmpdir(), 'no-existe-red-enlaces.json')), null);
});

test('JSON roto lanza un error claro en español', () => {
  const file = temporaryFile('roto.json', '{ no es json');
  assert.throws(() => loadNetwork(file), /no es válido: no es JSON/);
});

test('versión distinta de 1 lanza un error claro', () => {
  const file = temporaryFile('version.json', JSON.stringify({ ...NETWORK, version: 2 }));
  assert.throws(() => loadNetwork(file), /se esperaba version 1/);
});

test('las secciones excluyen la propia', () => {
  const file = temporaryFile('red.json', JSON.stringify(NETWORK));
  const sections = getNetworkSections(BASE_PATH, file);
  assert.deepEqual(sections?.map((section) => section.ruta), [OTHER_ROUTE]);
});

test('los enlaces de una ruta se buscan por clave; sin clave, vacío', () => {
  const file = temporaryFile('enlaces.json', JSON.stringify(NETWORK));
  assert.equal(getNetworkLinks(PAGE_KEY, file).length, 1);
  assert.deepEqual(getNetworkLinks(`${BASE_PATH}/otra`, file), []);
});

test('Footer pinta las otras webs con <a href> tal cual y nada sin red', () => {
  const sections = NETWORK.secciones.slice(1);
  const con = renderToStaticMarkup(<Footer redSecciones={sections} />);
  assert.ok(con.includes('Otras webs de Ododex'));
  assert.ok(con.includes(`href="${OTHER_ROUTE}"`));
  assert.ok(!renderToStaticMarkup(<Footer redSecciones={null} />).includes('Otras webs de Ododex'));
  assert.ok(!renderToStaticMarkup(<Footer />).includes('Otras webs de Ododex'));
});

test('NetworkLinks pinta el bloque « En Ododex también » solo con enlaces', () => {
  const html = renderToStaticMarkup(<NetworkLinks links={NETWORK.enlaces[PAGE_KEY]} />);
  assert.ok(html.includes('En Ododex también'));
  assert.ok(html.includes('href="/es/gasolineras/provincia/alicante"'));
  assert.equal(renderToStaticMarkup(<NetworkLinks links={[]} />), '');
});
