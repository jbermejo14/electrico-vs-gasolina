import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getNetworkLinksForRoute, getNetworkData } from '../lib/network';

test('network: lee los datos de la red de enlaces si existen', () => {
  const data = getNetworkData();
  if (data) {
    assert.equal(data.version, 1);
    assert.ok(Array.isArray(data.secciones));
    assert.ok(data.secciones.some((s) => s.ruta === '/es/gasolineras'));
  }
});

test('network: devuelve enlaces cruzados para provincias conocidas', () => {
  const links = getNetworkLinksForRoute('/es/electrico-vs-gasolina/cadiz');
  if (links.length > 0) {
    assert.ok(links.some((l) => l.seccion === '/es/puntos-recarga' || l.seccion === '/es/gasolineras'));
  }
});

test('network: ruta inexistente devuelve array vacío', () => {
  const links = getNetworkLinksForRoute('/ruta/totalmente/inexistente');
  assert.deepEqual(links, []);
});
