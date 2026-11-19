import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { SITE_NAME } from '../lib/site';

const SOURCE_DIRECTORIES = ['app', 'components', 'lib'];
const FIXED_PALETTE_PATTERN = /text-slate-|bg-zinc-|border-zinc-|text-orange-/;

function uiListFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const fullPath = path.join(directory, entry.name);
    return entry.isDirectory() ? uiListFiles(fullPath) : [fullPath];
  });
}

function uiSourceFiles(directories: string[]): string[] {
  return directories.flatMap(directory => uiListFiles(path.join(process.cwd(), directory)));
}

test('marca: SITE_NAME es Ododex', () => {
  assert.equal(SITE_NAME, 'Ododex');
});

test('marca: ningún fichero de app, components ni lib menciona AutoTax', () => {
  const offenders = uiSourceFiles(SOURCE_DIRECTORIES).filter(file =>
    readFileSync(file, 'utf-8').includes('AutoTax')
  );
  assert.deepEqual(offenders, []);
});

test('colores: ningún .tsx de app ni components usa colores de paleta fijos', () => {
  const offenders = uiSourceFiles(['app', 'components'])
    .filter(file => file.endsWith('.tsx'))
    .filter(file => FIXED_PALETTE_PATTERN.test(readFileSync(file, 'utf-8')));
  assert.deepEqual(offenders, []);
});
