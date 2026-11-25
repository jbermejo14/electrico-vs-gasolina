import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Metadata } from 'next';
import HomePage, { generateMetadata as homeMetadata } from '../app/page';
import ProvincePage, { generateMetadata as provinceMetadata, generateStaticParams } from '../app/[provincia]/page';
import { metadata as avisoMetadata } from '../app/aviso-legal/page';
import { metadata as cookiesMetadata } from '../app/cookies/page';
import { metadata as privacidadMetadata } from '../app/privacidad/page';
import {
  DESCRIPTION_MAX_LENGTH,
  DESCRIPTION_MIN_LENGTH,
  fitTitle,
  OG_IMAGE_PATH,
  titleWithBrand,
  TITLE_MAX_LENGTH,
  TITLE_TARGET_LENGTH,
} from '../lib/seo';

const EXPECTED_OG_IMAGE_SUFFIX = '/es/electrico-vs-gasolina/brand/ododex-og.png';
const BRAND = 'Ododex';

interface PageMetadata {
  label: string;
  metadata: Metadata;
}

/** Título final tal como lo escribe Next: absoluto, o la cadena con la plantilla '%s | Ododex'. */
function renderedTitle(metadata: Metadata): string {
  const title = metadata.title;
  if (typeof title === 'string') return titleWithBrand(title);
  if (title && 'absolute' in title && title.absolute) return title.absolute;
  throw new Error('La página no define un título utilizable');
}

function isIndexable(metadata: Metadata): boolean {
  const robots = metadata.robots;
  return !(robots && typeof robots === 'object' && 'index' in robots && robots.index === false);
}

async function allPageMetadata(): Promise<PageMetadata[]> {
  const pages: PageMetadata[] = [
    { label: '/', metadata: homeMetadata() },
    { label: '/aviso-legal', metadata: avisoMetadata },
    { label: '/cookies', metadata: cookiesMetadata },
    { label: '/privacidad', metadata: privacidadMetadata },
  ];
  for (const params of generateStaticParams()) {
    pages.push({ label: `/${params.provincia}`, metadata: await provinceMetadata({ params: Promise.resolve(params) }) });
  }
  return pages;
}

test('se recorren la portada, las tres páginas legales y todas las provincias', async () => {
  const pages = await allPageMetadata();
  assert.ok(pages.length > 4, `solo ${pages.length} páginas`);
  assert.equal(typeof HomePage, 'function');
  assert.equal(typeof ProvincePage, 'function');
});

test('títulos: con marca una sola vez y como máximo 65 caracteres', async () => {
  for (const { label, metadata } of await allPageMetadata()) {
    const title = renderedTitle(metadata);
    assert.ok(title.length <= TITLE_MAX_LENGTH, `${label}: ${title.length} caracteres: ${title}`);
    assert.ok(title.endsWith(` | ${BRAND}`), `${label}: sin marca al final: ${title}`);
    assert.equal(title.split(BRAND).length - 1, 1, `${label}: marca duplicada: ${title}`);
  }
});

test('títulos: únicos', async () => {
  const titles = (await allPageMetadata()).map(({ metadata }) => renderedTitle(metadata));
  assert.equal(new Set(titles).size, titles.length);
});

test('descripciones: entre 120 y 160 caracteres en las páginas indexables, y únicas', async () => {
  const pages = await allPageMetadata();
  for (const { label, metadata } of pages.filter((page) => isIndexable(page.metadata))) {
    const length = String(metadata.description).length;
    assert.ok(
      length >= DESCRIPTION_MIN_LENGTH && length <= DESCRIPTION_MAX_LENGTH,
      `${label}: ${length} caracteres: ${metadata.description}`,
    );
  }
  const descriptions = pages.map(({ metadata }) => String(metadata.description));
  assert.equal(new Set(descriptions).size, descriptions.length);
});

test('imagen OG absoluta con la ruta base y twitter summary_large_image en todas las páginas', async () => {
  assert.equal(OG_IMAGE_PATH, '/brand/ododex-og.png');
  for (const { label, metadata } of await allPageMetadata()) {
    const openGraph = metadata.openGraph as { images?: { url: string; width: number; height: number }[] } | null | undefined;
    const image = openGraph?.images?.[0];
    assert.ok(image, `${label}: sin imagen OG`);
    assert.ok(image.url.startsWith('http') && image.url.endsWith(EXPECTED_OG_IMAGE_SUFFIX), `${label}: ${image.url}`);
    assert.deepEqual([image.width, image.height], [1200, 630], label);
    const twitter = metadata.twitter as { card?: string; images?: string[] } | null | undefined;
    assert.equal(twitter?.card, 'summary_large_image', label);
    assert.deepEqual(twitter?.images, [image.url], label);
  }
});

test('las páginas legales siguen con noindex', () => {
  for (const metadata of [avisoMetadata, cookiesMetadata, privacidadMetadata]) {
    assert.equal(isIndexable(metadata), false);
  }
});

test('fitTitle: prefiere la primera variante que cabe en 60, luego en 65, y nunca trunca', () => {
  const brandLength = titleWithBrand('').length;
  const exact = 'x'.repeat(TITLE_TARGET_LENGTH - brandLength);
  const longer = 'y'.repeat(TITLE_MAX_LENGTH - brandLength);
  assert.equal(fitTitle([longer, exact]), titleWithBrand(exact));
  assert.equal(fitTitle([longer]), titleWithBrand(longer));
  assert.throws(() => fitTitle(['z'.repeat(TITLE_MAX_LENGTH)]), /variante más corta/);
});
