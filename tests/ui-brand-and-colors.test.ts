import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { SITE_NAME } from '../lib/site';

const SOURCE_DIRECTORIES = ['app', 'components', 'lib'];
const FORBIDDEN_TERMS = ['AutoTax', 'IEDMT', 'calculadora-impuestos'];
const FIXED_COLOR_PATTERN =
  /#[0-9a-fA-F]{3,8}\b|gradient|(text|bg|border)-(slate|zinc|orange|gray|neutral|stone|red|green|blue|amber|emerald)-\d/;

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

test('marca: ningún fichero de app, components ni lib usa términos heredados', () => {
  const offenders = uiSourceFiles(SOURCE_DIRECTORIES).filter(file => {
    const content = readFileSync(file, 'utf-8');
    return FORBIDDEN_TERMS.some(term => content.includes(term));
  });
  assert.deepEqual(offenders, []);
});

test('colores: ningún .tsx de app ni components usa colores sueltos, degradados ni paleta fija', () => {
  const offenders = uiSourceFiles(['app', 'components'])
    .filter(file => file.endsWith('.tsx'))
    .filter(file => FIXED_COLOR_PATTERN.test(readFileSync(file, 'utf-8')));
  assert.deepEqual(offenders, []);
});
