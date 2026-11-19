import fs from 'node:fs';
import path from 'node:path';
import { provincesWithData, summarizeFuelPrices } from '../lib/fuelPrices';

const IMPORT_DEFAULT_INPUT = path.join('..', 'gasolineras', 'public', 'datos', 'estaciones.json');
const IMPORT_OUTPUT = path.join('data', 'fuel-prices.json');
const IMPORT_EXIT_FAILURE = 1;
const IMPORT_JSON_INDENT = 2;

function importFuelPrices(): void {
  const root = process.cwd();
  const input = path.resolve(root, process.env.FUEL_STATIONS_FILE ?? IMPORT_DEFAULT_INPUT);
  if (!fs.existsSync(input)) {
    console.error(
      `No existe ${input}. Compila antes la web de gasolineras (npm run build en ../gasolineras) o indica otra ruta en FUEL_STATIONS_FILE.`,
    );
    process.exit(IMPORT_EXIT_FAILURE);
  }
  const { summary, discardedPrices } = summarizeFuelPrices(JSON.parse(fs.readFileSync(input, 'utf8')));
  const output = path.join(root, IMPORT_OUTPUT);
  const temporary = `${output}.tmp`;
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(temporary, `${JSON.stringify(summary, null, IMPORT_JSON_INDENT)}\n`);
  fs.renameSync(temporary, output);
  console.log(`Fecha MITECO: ${summary.mitecoDate}`);
  console.log(`Provincias con datos: ${provincesWithData(summary).length}`);
  console.log(`Precios descartados: ${discardedPrices}`);
  console.log(
    `Media nacional: gasolina 95 ${summary.national.gasolina95.average} €/l, diésel ${summary.national.diesel.average} €/l`,
  );
}

importFuelPrices();
