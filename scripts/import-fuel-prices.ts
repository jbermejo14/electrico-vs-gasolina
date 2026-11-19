import fs from 'node:fs';
import path from 'node:path';
import { provincesWithData, summarizeFuelPrices, type FuelPriceSummary } from '../lib/fuelPrices';

const IMPORT_DEFAULT_INPUT = path.join('..', 'gasolineras', 'public', 'datos', 'estaciones.json');
const IMPORT_OUTPUT = path.join('data', 'fuel-prices.json');
const IMPORT_TEMPORARY_SUFFIX = '.tmp';
const IMPORT_EXIT_FAILURE = 1;
const IMPORT_JSON_INDENT = 2;

/** Lee y parsea el listado de estaciones; el JSON mal formado lanza SyntaxError. */
function readStations(input: string): unknown {
  return JSON.parse(fs.readFileSync(input, 'utf8')) as unknown;
}

/** Escribe el resumen en un fichero temporal y lo renombra, para no dejar un JSON a medias. */
function writeSummaryAtomically(summary: FuelPriceSummary, output: string): void {
  const temporary = `${output}${IMPORT_TEMPORARY_SUFFIX}`;
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(temporary, `${JSON.stringify(summary, null, IMPORT_JSON_INDENT)}\n`);
  fs.renameSync(temporary, output);
}

function removeTemporaryFile(output: string): void {
  fs.rmSync(`${output}${IMPORT_TEMPORARY_SUFFIX}`, { force: true });
}

function reportSummary(summary: FuelPriceSummary, discardedPrices: number): void {
  console.log(`Fecha MITECO: ${summary.mitecoDate}`);
  console.log(`Provincias con datos: ${provincesWithData(summary).length}`);
  console.log(`Precios descartados: ${discardedPrices}`);
  console.log(
    `Media nacional: gasolina 95 ${summary.national.gasolina95.average} €/l, diésel ${summary.national.diesel.average} €/l`,
  );
}

function importFuelPrices(): void {
  const root = process.cwd();
  const input = path.resolve(root, process.env.FUEL_STATIONS_FILE ?? IMPORT_DEFAULT_INPUT);
  const output = path.join(root, IMPORT_OUTPUT);
  if (!fs.existsSync(input)) {
    console.error(
      `No existe ${input}. Compila antes la web de gasolineras (npm run build en ../gasolineras) o indica otra ruta en FUEL_STATIONS_FILE.`,
    );
    process.exit(IMPORT_EXIT_FAILURE);
  }
  try {
    const { summary, discardedPrices } = summarizeFuelPrices(readStations(input));
    writeSummaryAtomically(summary, output);
    reportSummary(summary, discardedPrices);
  } catch (error) {
    // Se informa y se sale con código 1: un fichero ilegible no debe dejar un temporal a medias ni un build verde.
    const message = error instanceof Error ? error.message : String(error);
    console.error(
      `Error al importar ${input}: ${message}. Comprueba que es el estaciones.json generado por ../gasolineras.`,
    );
    removeTemporaryFile(output);
    process.exit(IMPORT_EXIT_FAILURE);
  }
}

importFuelPrices();
