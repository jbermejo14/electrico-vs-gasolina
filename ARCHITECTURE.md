# ARCHITECTURE — Coche eléctrico o gasolina: coste por kilómetro

Web de la red Ododex publicada en `https://ododex.com/es/electrico-vs-gasolina`. Este documento es el contrato técnico: cada módulo debe poder implementarse leyendo solo su sección y las comunes.

## 1. Objetivo y alcance

**Qué hace**

- Calcula el coste por kilómetro, por 100 km y por año de un coche de combustión (gasolina 95 o diésel) frente a uno eléctrico.
- El precio del combustible es la **media real** de las gasolineras (MITECO), nacional y por provincia, tomada del mismo volcado diario que publica la web `gasolineras`.
- El precio de la electricidad sale de `data/charging-prices.json`: tarifas de recarga pública por operador y nivel de potencia, y tarifas de referencia para cargar en casa. Son valores **orientativos** recopilados por el titular en noviembre de 2026; la web lo dice visiblemente.
- Páginas: una principal (medias nacionales, calculadora, ranking de provincias, tabla de tarifas por operador y preguntas frecuentes) y una por provincia con su precio medio real.

**Qué no hace**

- No consulta datos en tiempo de ejecución: todo se genera al compilar (exportación estática).
- No tiene modelos de coche concretos, ni coste de compra, mantenimiento, seguros o amortización.
- No tiene precios de recarga por provincia (no existe ese dato).
- No guarda nada del usuario.

## 2. Convenciones heredadas

Este proyecto sigue el patrón común de la red (ver `../ododex-sitio/docs/02-arquitectura.md` y `../ododex-sitio/docs/05-convenciones.md`). Se toma como base el proyecto **`../calculadora-impuestos`** (misma estructura sin `src/`: `app/`, `components/`, `lib/`, `data/`, `tests/`, `config/`, `scripts/`).

- Next.js **16.4.6** (App Router), React **19.3.0**, Tailwind **4.3.3** por PostCSS, TypeScript estricto, `tsx` para las pruebas (`node --import tsx --test`). Versiones exactas, sin `^`, iguales a `../calculadora-impuestos/package.json`.
- `next.config.ts`: `basePath: '/es/electrico-vs-gasolina'`, `output: 'export'`, `reactStrictMode: true`, `images.unoptimized: true`. Compilación con `next build --webpack` (en Windows los binarios nativos están bloqueados; mismo apaño de PostCSS que impuestos: `postcss-tailwind-windows.cjs`).
- Identificadores en inglés; comentarios, documentación y textos de la web en español.
- Estilos: `app/globals.css` copiado de impuestos (tokens `--bg`, `--surface`, `--accent`…, tema con `data-theme` y `localStorage['ododex-theme']`). **Prohibido** escribir colores sueltos o degradados en componentes.
- Marca: logos de `../brand/` (los mismos `public/brand/*.svg` que impuestos) y `app/icon.svg` igual al de impuestos.
- Rutas dinámicas con `generateStaticParams`, `dynamicParams = false`, sin `revalidate`.
- Canonical, `og:url` y JSON-LD con `absoluteUrl()` (dominio de producción). `robots.txt` lo sirve la raíz del dominio, no esta web.

### Variables de entorno

| Variable | Uso | Por defecto |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | Origen del sitio (sin ruta ni barra final) | `http://localhost:3000` |
| `NEXT_PUBLIC_ADSENSE_CLIENT` | Cliente AdSense (`ca-pub-` + 16 dígitos) | vacío: sin anuncios |
| `NEXT_PUBLIC_ADSENSE_SLOT` | Unidad AdSense (10 dígitos) | vacío: sin `AdSlot` |
| `FUEL_STATIONS_FILE` | Fichero de entrada del importador de precios | `../gasolineras/public/datos/estaciones.json` |

`ododex-sitio` pasa las tres primeras al compilar. Se documentan en `.env.example`.

## 3. Módulos

Dependencias permitidas (sin ciclos):

```
M1 site/legal/marca ─┐
M2 fuelPrices ───────┤
M3 chargingPrices ───┼──▶ M5 páginas y calculadora
M4 costPerKm ────────┘
```

M2, M3 y M4 son lógica pura (sin React ni DOM) y no dependen entre sí. M5 depende de todos.

### M1. Esqueleto, marca, legales y anuncios

**Responsabilidad:** dejar una web Next vacía que compila, con la cabecera, el pie, los legales y los anuncios de la red.

Se copia de `../calculadora-impuestos`, adaptando nombres y rutas:

| Fichero | Origen | Cambios |
|---|---|---|
| `package.json` | impuestos | `name: "electrico-vs-gasolina"`; scripts en §5 |
| `next.config.ts`, `tsconfig.json`, `postcss.config.mjs`, `postcss-tailwind-windows.cjs`, `.gitignore`, `.env.example` | impuestos | ruta base; `.gitignore` añade `/data/fuel-prices.json`; `.env.example` añade `NEXT_PUBLIC_ADSENSE_SLOT` y `FUEL_STATIONS_FILE` |
| `app/globals.css`, `app/icon.svg`, `public/brand/*` | impuestos | ninguno (quitar solo las clases propias de las calculadoras de impuestos si no se usan) |
| `app/layout.tsx` | impuestos | metadatos de esta web (§4) |
| `app/not-found.tsx`, `app/aviso-legal`, `app/privacidad`, `app/cookies` | impuestos | textos sobre esta web: fuente MITECO, tarifas orientativas, calculadora orientativa |
| `components/Header.tsx`, `Footer.tsx`, `BrandLogo.tsx`, `Breadcrumbs.tsx`, `AdSenseScript.tsx`, `AdSlot.tsx`, `ConsentSettingsButton.tsx` | impuestos | ninguno salvo enlaces |
| `lib/site.ts` | impuestos | `SECTION_NAME = 'Eléctrico vs gasolina'`, `BASE_PATH = '/es/electrico-vs-gasolina'` |
| `lib/legal.ts`, `config/titular.example.json`, `config/titular.json` | impuestos | ninguno (`config/titular.json` se copia pero **no va a git**) |
| `tests/site.test.ts`, `tests/ad-slot.test.tsx`, `tests/legal.test.ts`, `tests/legal-pages.test.tsx`, `tests/ui-brand-and-colors.test.ts`, `tests/ui-contrast.test.ts` | impuestos | adaptadas a esta web |

`app/page.tsx` en M1 es provisional: un `h1` y un párrafo. M5 lo sustituye.

**Interfaz pública de `lib/site.ts`:** `SITE_NAME`, `SECTION_NAME`, `BASE_PATH`, `getSiteUrl()`, `absoluteUrl(path)`, `assetPath(path)`, con el mismo comportamiento que en impuestos.

**Aceptación:** `npm test`, `npx tsc --noEmit` y `npm run build` pasan (en M1 el `build` es solo `next build --webpack`). Una prueba comprueba que `BASE_PATH` coincide con el de `next.config.ts`.

### M2. Precios medios de combustible (`lib/fuelPrices.ts` + `scripts/import-fuel-prices.ts`)

**Responsabilidad:** convertir el listado de estaciones de `gasolineras` en medias de precio por combustible, nacional y por provincia.

**Entrada** (`StationsPayload`, el `public/datos/estaciones.json` que genera `../gasolineras` en cada compilación; solo se usan estos campos):

```ts
interface StationsPayload {
  fechaMiteco: string;                 // "18/11/2026 18:03:47"
  estaciones: Array<{
    provincia: string;                 // "Albacete" (ya legible)
    provinciaSlug: string;             // "albacete"
    precios: { gasolina95: number | null; diesel: number | null; [otro: string]: number | null };
  }>;
}
```

**Salida** (`data/fuel-prices.json`, generado y fuera de git):

```ts
type FuelType = 'gasolina95' | 'diesel';

interface FuelAverage {
  average: number;      // €/l, media aritmética redondeada a 3 decimales
  stations: number;     // estaciones con precio válido que entran en la media
}

interface ProvinceFuelPrices {
  slug: string;         // provinciaSlug de MITECO, tal cual; solo para enlazar a /es/gasolineras/provincia/{slug}
  pageSlug: string;     // slug de la URL de esta web, derivado de name con provincePageSlug ("a-coruna", "las-palmas")
  name: string;         // provincia, tal cual
  gasolina95: FuelAverage | null;   // null si hay menos de MIN_STATIONS_FOR_AVERAGE
  diesel: FuelAverage | null;
}

interface FuelPriceSummary {
  source: string;       // "Ministerio para la Transición Ecológica y el Reto Demográfico (MITECO)"
  sourceUrl: string;    // "https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/"
  mitecoDate: string;   // fechaMiteco tal cual
  national: Record<FuelType, FuelAverage>;
  provinces: ProvinceFuelPrices[];  // orden alfabético por name con localeCompare('es')
}
```

**Interfaz de `lib/fuelPrices.ts`:**

```ts
export const FUEL_TYPES: readonly FuelType[];          // ['gasolina95', 'diesel']
export const FUEL_LABELS: Record<FuelType, string>;    // 'Gasolina 95', 'Diésel'
export const MIN_VALID_PRICE = 0.5;                    // €/l; por debajo es un error del dato
export const MAX_VALID_PRICE = 4;                      // €/l; por encima es un error del dato
export const MIN_STATIONS_FOR_AVERAGE = 10;            // umbral para publicar la media de una provincia

export interface SummaryReport { summary: FuelPriceSummary; discardedPrices: number; }

/** Valida la estructura y calcula las medias. Lanza Error con mensaje en español si falta fechaMiteco o estaciones no es un array. */
export function summarizeFuelPrices(payload: unknown): SummaryReport;

/** Valida un FuelPriceSummary ya generado (al leer data/fuel-prices.json). Lanza Error si no cumple el tipo. */
export function parseFuelPriceSummary(value: unknown): FuelPriceSummary;

/** Provincias con al menos una media publicable (las que tienen página). */
export function provincesWithData(summary: FuelPriceSummary): ProvinceFuelPrices[];

/** Busca una provincia por pageSlug; undefined si no existe o no tiene datos. */
export function findProvince(summary: FuelPriceSummary, pageSlug: string): ProvinceFuelPrices | undefined;

/**
 * Slug de URL a partir del nombre legible: minúsculas, sin diacríticos, guiones; si el nombre tiene "/"
 * y las dos mitades dan el mismo slug, una sola ("Valencia / València" → "valencia").
 */
export function provincePageSlug(name: string): string;

/** Provincias ordenadas por coste de gasolina 95 ascendente; después las que solo tienen diésel. */
export function rankProvincesByGasoline(provinces: ProvinceFuelPrices[]): ProvinceFuelPrices[];

/** Medias de un lugar como precios sueltos (null si no hay media). */
export function averagePricesOf(averages: Record<FuelType, FuelAverage | null>): Record<FuelType, number | null>;
```

Las URL usan `pageSlug` (mejor para SEO que el slug de MITECO, que pospone el artículo: `coruna-a`, `palmas-las`). `summarizeFuelPrices` lanza Error si dos provincias dan el mismo `pageSlug`.

Reglas: un precio `null` significa que la estación no vende ese combustible (no cuenta como descartado). Un precio no numérico, no finito o fuera de `[MIN_VALID_PRICE, MAX_VALID_PRICE]` se descarta y suma a `discardedPrices`. Una estación sin `provinciaSlug` o `provincia` de texto no vacío se descarta entera (también cuenta).

**Lectura en la web:** `lib/fuelPriceData.ts` exporta `getFuelPriceSummary(): FuelPriceSummary`, que lee `data/fuel-prices.json` con `fs` (solo en componentes de servidor) y lo valida con `parseFuelPriceSummary`. Si el fichero no existe lanza `Error('Falta data/fuel-prices.json. Ejecuta npm run import-fuel (necesita ../gasolineras compilada).')`.

**Script `scripts/import-fuel-prices.ts`:** lee `process.env.FUEL_STATIONS_FILE` o el valor por defecto (relativo a la raíz del proyecto), llama a `summarizeFuelPrices`, escribe `data/fuel-prices.json.tmp` y lo renombra a `data/fuel-prices.json`. Escribe en consola la fecha MITECO, el número de provincias con datos y los precios descartados. Si el fichero de entrada no existe, sale con código 1 y el mensaje `No existe <ruta>. Compila antes la web de gasolineras (npm run build en ../gasolineras) o indica otra ruta en FUEL_STATIONS_FILE.`

**Aceptación (`tests/fuel-prices.test.ts`, con un fixture reducido en `tests/fixtures/estaciones.json`):** medias y redondeo correctos; precios nulos ignorados; precios fuera de rango descartados y contados; provincia por debajo del umbral con `null`; orden alfabético; `findProvince` con slug inexistente devuelve `undefined`; payload inválido lanza error; `parseFuelPriceSummary` rechaza un objeto mal formado.

### M3. Tarifas de electricidad (`lib/chargingPrices.ts`)

**Responsabilidad:** validar `data/charging-prices.json` y ofrecer los precios de recarga de forma tipada.

El JSON es dato del titular y **no se modifica**: su formato es el que tiene el fichero (`updated_at`, `operators`, `default_fallback`, `home_charging_reference`).

```ts
export type PowerLevel = 'ac_22' | 'dc_50' | 'dc_150' | 'hpc_150_plus';
export type HomeTariff = 'pvpc_valle' | 'tarifa_ve_nocturna' | 'tarifa_unica';
export type PriceByLevel = Record<PowerLevel, number>;   // €/kWh

export interface ChargingPrices {
  updatedAt: string;                        // "2026-11"
  operators: Array<{ id: string; name: string; prices: PriceByLevel }>;  // orden alfabético por name
  marketDefault: PriceByLevel;              // default_fallback
  home: Record<HomeTariff, number>;         // home_charging_reference
}

export const POWER_LEVELS: readonly PowerLevel[];               // en el orden de arriba
export const POWER_LEVEL_LABELS: Record<PowerLevel, string>;    // 'Alterna hasta 22 kW', 'Rápida 50 kW', 'Rápida 150 kW', 'Ultrarrápida de más de 150 kW'
export const HOME_TARIFFS: readonly HomeTariff[];
export const HOME_TARIFF_LABELS: Record<HomeTariff, string>;    // 'PVPC en horas valle', 'Tarifa nocturna para coche eléctrico', 'Tarifa de precio único'
export const CHARGING_MARKET_ID = 'market';                     // operador reservado: la media del mercado (no puede existir en el JSON)
export const CHARGING_MARKET_LABEL = 'Media del mercado';
export const OPERATOR_NAMES: Record<string, string>;            // iberdrola → 'Iberdrola', endesa → 'Endesa X Way', repsol → 'Repsol', zunder → 'Zunder', wenea → 'Wenea', acciona → 'Acciona', tesla → 'Tesla', ionity → 'Ionity', edp → 'EDP', electra → 'Electra', fastned → 'Fastned', totalenergies → 'TotalEnergies', emovili → 'Emovili'
export const MAX_VALID_KWH_PRICE = 2;                           // €/kWh; por encima es un error del dato

/** Valida el JSON crudo. Lanza Error en español que nombre el campo erróneo (operador sin nombre en OPERATOR_NAMES, nivel ausente, precio <= 0 o > MAX_VALID_KWH_PRICE). */
export function parseChargingPrices(raw: unknown): ChargingPrices;

/** Las tarifas del fichero del proyecto, ya validadas (importa data/charging-prices.json). */
export function getChargingPrices(): ChargingPrices;

/** Precio público de un operador y nivel; operatorId 'market' devuelve marketDefault. Lanza Error si el operador no existe. */
export function publicPrice(prices: ChargingPrices, operatorId: string, level: PowerLevel): number;

/** Texto "noviembre de 2026" a partir de updatedAt "2026-11". */
export function formatUpdatedAt(updatedAt: string): string;
```

`getChargingPrices` importa el JSON con `import data from '@/data/charging-prices.json'` para que funcione también en el componente de cliente.

**Aceptación (`tests/charging-prices.test.ts`):** el fichero real se valida sin errores y tiene 13 operadores; un operador desconocido, un nivel ausente o un precio negativo lanzan error con el nombre del campo; `publicPrice` con `'market'` y con un operador; operador inexistente lanza error; `formatUpdatedAt('2026-11') === 'noviembre de 2026'`.

### M4. Cálculo de coste por kilómetro (`lib/costPerKm.ts`)

**Responsabilidad:** las fórmulas, puras y sin datos.

```ts
export const DEFAULT_ANNUAL_KM = 15000;
export const DEFAULT_CONSUMPTION_L_100KM: Record<FuelType, number> = { gasolina95: 6.5, diesel: 5.5 };
export const DEFAULT_EV_CONSUMPTION_KWH_100KM = 17;
export const DEFAULT_HOME_SHARE = 0.8;               // 80 % de la energía se carga en casa
export const DEFAULT_HOME_TARIFF: HomeTariff = 'tarifa_unica';
export const DEFAULT_PUBLIC_LEVEL: PowerLevel = 'dc_150';
/** Rendimiento de la recarga: parte de la energía que paga el usuario llega a la batería. */
export const CHARGING_EFFICIENCY = 0.9;

export interface CombustionInput { consumptionLitresPer100Km: number; pricePerLitre: number; annualKm: number; }
export interface ElectricInput {
  consumptionKwhPer100Km: number;   // consumo del ordenador de a bordo (energía que sale de la batería)
  homeShare: number;                // 0..1
  homePricePerKwh: number;
  publicPricePerKwh: number;
  annualKm: number;
}
export interface CostResult { per100Km: number; perKm: number; annual: number; }   // € sin redondear
export interface Comparison {
  combustion: CostResult;
  electric: CostResult;
  annualSavings: number;          // combustion.annual - electric.annual (negativo si el eléctrico sale más caro)
  cheaper: 'electric' | 'combustion' | 'equal';
}

export function combustionCost(input: CombustionInput): CostResult;
/** Precio medio de la energía: homeShare * casa + (1 - homeShare) * pública. */
export function blendedPricePerKwh(homeShare: number, homePricePerKwh: number, publicPricePerKwh: number): number;
/** per100Km = consumo / CHARGING_EFFICIENCY * precio medio. */
export function electricCost(input: ElectricInput): CostResult;
export function compareCosts(combustion: CombustionInput, electric: ElectricInput): Comparison;
```

Fórmulas: `per100Km` combustión = consumo × precio; `perKm = per100Km / 100`; `annual = per100Km × annualKm / 100`. `cheaper` es `'equal'` si `|annualSavings| < 0.005`.

Validación: consumos, precios y `annualKm` deben ser números finitos `> 0` (`annualKm` puede ser `0`); `homeShare` en `[0, 1]`. Si no, `RangeError` con mensaje en español que nombra el campo (`'El consumo de combustible debe ser un número mayor que 0.'`).

**Aceptación (`tests/cost-per-km.test.ts`):** casos numéricos a mano (6,5 l × 1,5 €/l = 9,75 €/100 km; 17 kWh / 0,9 × 0,18 €/kWh = 3,40 €/100 km); `homeShare` 0 y 1; ahorro positivo, negativo e igual; cada validación lanza `RangeError`.

### M5. Páginas y calculadora

**Responsabilidad:** las páginas estáticas, la calculadora interactiva y el SEO.

**Formato de cifras** (`lib/format.ts`): `formatEuros(value, decimals = 2)` → `"9,75 €"`; `formatPricePerLitre(v)` → `"1,523 €/l"`; `formatPricePerKwh(v)` → `"0,18 €/kWh"`; `formatPercent(share)` → `"80 %"`; `formatKm(n)` → `"15.000 km"`; `formatDecimal(v)`; `formatMitecoDay(mitecoDate)` → `"18/11/2026"`; `formatMitecoMonth(mitecoDate)` → `"noviembre de 2026"`; `formatAnnualSavings(comparison)` → frase de ahorro según `comparison.cheaper`. Todo con `Intl.NumberFormat('es-ES')` (agrupación de miles siempre, espacio duro antes de la unidad). Se usan en servidor y cliente. La hora de MITECO no se muestra.

**Lógica de página, pura y probada** (`lib/`):

| Módulo | Contenido |
|---|---|
| `referenceCosts.ts` | `referenceCombustionPer100Km(fuel, pricePerLitre)` y `referenceElectricPer100Km(charging, homeShare)`: coste por 100 km con los valores por defecto de M4 (casa con `DEFAULT_HOME_TARIFF`, pública con la media del mercado y `DEFAULT_PUBLIC_LEVEL`). Los usan `ScenarioCards`, `ProvinceRanking`, las páginas y el FAQ. |
| `faq.ts` | `buildFaqItems(summary, charging)`: preguntas frecuentes con cifras calculadas. |
| `homePage.ts` | `homeTitle(summary)` (layout y principal) y `homeDescription(summary, charging)`. |
| `provincePage.ts` | `provinceDifferenceText`, `provinceComparisonSentences`, `provinceRankingText`, `provinceDescription`. La diferencia con la media se redondea a 3 decimales antes de elegir "más/menos/igual". |
| `routes.ts` | `provinceParams(summary)` y `sitemapEntries(summary)`. |
| `structuredData.ts` | Solo constructores JSON-LD: `breadcrumbJsonLd`, `webApplicationJsonLd`, `faqPageJsonLd`. |
| `calculatorState.ts` | Estado de la calculadora: `calculatorInitialState`, `calculatorValidate`, `calculatorCompare` (null si hay entradas inválidas), `calculatorReduce` (reductor puro; acciones `editText`, `editHomePrice`, `setFuel`, `setHomeTariff`, `setHomePercent`, `setOperator`, `setLevel`). Ninguna función lanza. |

Descriptions de 160 caracteres como máximo (lo comprueba una prueba).

**Componentes:**

- `components/CostCalculator.tsx` (`'use client'`, con `useReducer(calculatorReduce)`; campos en `CalculatorFields.tsx` y resultado en `CalculatorResults.tsx`). Props: `{ fuelPrices: Record<FuelType, number | null>; charging: ChargingPrices; placeLabel: string }` (`placeLabel`: `"España"` o el nombre de la provincia). Estado y controles (todos con `<label>`, objetivos táctiles de 44 px):
  1. Kilómetros al año (número, por defecto `DEFAULT_ANNUAL_KM`).
  2. Combustible: gasolina 95 / diésel (solo los que tengan precio); consumo l/100 km (por defecto según combustible); precio €/l (rellenado con la media del lugar, editable; al cambiar de combustible se rellena de nuevo).
  3. Eléctrico: consumo kWh/100 km; porcentaje cargado en casa (rango 0-100, paso 10); tarifa de casa (las tres de referencia o "Otra", con su precio editable); recarga pública: operador ("Media del mercado" u operador) y nivel de potencia, con el precio resultante editable.
  4. Resultado: dos tarjetas (combustión y eléctrico) con €/100 km grande, €/km y €/año; y una línea de ahorro anual en `--positive` o `--negative` **con texto** ("El eléctrico te ahorra 1.234 € al año" / "El eléctrico te cuesta 120 € más al año").
  Entradas inválidas (vacías o negativas) muestran un mensaje junto al campo y ocultan el resultado; nunca lanzan. El primer render (servidor) ya muestra el resultado con los valores por defecto, así la página se lee sin JavaScript.
- `components/ProvinceRanking.tsx` (servidor): tabla de provincias con precio medio de gasolina 95 y diésel y su coste por 100 km con el consumo por defecto; cada provincia enlaza a su página. Ordenada por coste de gasolina 95 ascendente. Celda `null` → "Sin datos". La tabla tiene scroll horizontal propio.
- `components/OperatorPriceTable.tsx` (servidor): operadores × niveles de potencia en €/kWh, más la fila "Media del mercado" destacada.
- `components/ScenarioCards.tsx` (servidor): para un lugar, coste por 100 km de gasolina 95, diésel, eléctrico cargando en casa (`DEFAULT_HOME_TARIFF`, 100 % casa) y eléctrico solo en recarga rápida pública (media del mercado, `DEFAULT_PUBLIC_LEVEL`). Es la "respuesta primero" de cada página.
- `components/DataSources.tsx` (servidor): fuente MITECO con enlace y `mitecoDate`; tarifas "recopiladas por Ododex, {formatUpdatedAt}", con aviso **orientativo**: los precios reales dependen del operador, la tarifa contratada y las promociones.

**Rutas (`trailingSlash` por defecto, como impuestos):**

| Ruta | Página | Contenido en orden |
|---|---|---|
| `/` | `app/page.tsx` | h1 "Coche eléctrico o gasolina: ¿cuánto cuesta el kilómetro?"; `ScenarioCards` nacional; `CostCalculator` con medias nacionales; `AdSlot`; `ProvinceRanking`; `OperatorPriceTable`; preguntas frecuentes (4-6, visibles); `DataSources`; `AdSlot` |
| `/[provincia]` (por `pageSlug`) | `app/[provincia]/page.tsx` | migas (Eléctrico vs gasolina › Provincia, dos niveles como el resto de la red); h1 "Coche eléctrico o gasolina en {Provincia}: coste por km"; `ScenarioCards`; frase comparando con la media nacional ("En {Provincia} la gasolina 95 cuesta de media 1,512 €/l, 0,011 € menos que la media de España"); `CostCalculator` con las medias de la provincia; `AdSlot`; enlace a `/es/gasolineras/provincia/{slug}` ("Gasolineras más baratas en {Provincia}") y a `/es/puntos-recarga` ("Puntos de recarga"); posición de la provincia en el ranking (más barata/más cara) y enlaces a la anterior y la siguiente del ranking; lista compacta de todas las provincias; `DataSources` |
| `/aviso-legal`, `/privacidad`, `/cookies` | M1 | `noindex, follow`; sin anuncios |

`app/[provincia]/page.tsx`: `generateStaticParams` desde `provincesWithData(getFuelPriceSummary())`, `dynamicParams = false`; slug inexistente → 404 real (`notFound()`). Los enlaces a otras secciones (`/es/gasolineras/...`, `/es/puntos-recarga`) son `<a>` normales, no `next/link`, porque están fuera del `basePath`.

**SEO:**

- Title y description únicos por página con cifras reales. Principal: `"Coche eléctrico o gasolina: coste por km en España ({mes año})"`. Provincia: `"Eléctrico o gasolina en {Provincia}: coste por km"` y una description con el €/100 km de gasolina y de eléctrico en casa.
- Canonical y Open Graph con `absoluteUrl`.
- JSON-LD: `BreadcrumbList` en las páginas con migas visibles (provincias; lo emite `Breadcrumbs`); `WebApplication` (categoría `FinanceApplication`, `offers.price = 0`) en la principal; `FAQPage` solo en la principal, con las mismas preguntas que se ven.
- `app/sitemap.ts` (`force-static`): la principal y todas las provincias con datos; sin legales.
- Fuente y fecha visibles en cada página (`DataSources`).

**Anuncios:** como máximo dos `AdSlot` por página, en las posiciones de la tabla. Nunca dentro de la calculadora ni de las tablas.

**Aceptación:**

- `tests/format.test.ts`: cada formateador.
- `tests/routes-and-sitemap.test.ts`: con un `FuelPriceSummary` de fixture, `generateStaticParams` solo incluye provincias con datos; el sitemap incluye la principal y las provincias y no los legales; todas las URL son absolutas y empiezan por `https://ododex.com/es/electrico-vs-gasolina` cuando `NEXT_PUBLIC_SITE_URL=https://ododex.com`. Para poder probarlo sin fichero real, `getFuelPriceSummary` acepta la ruta del fichero como parámetro opcional (por defecto `data/fuel-prices.json`).
- `tests/calculator.test.tsx`: el render en servidor de `CostCalculator` (con `react-dom/server`) muestra el resultado por defecto y el texto de ahorro.
- Las pruebas de M1 (marca, colores, contraste, `AdSlot`, legales) siguen pasando con los componentes nuevos.
- Verificación en pantalla (sesión principal): principal y una provincia, claro y oscuro, 375 y 1280 px, sin desbordamiento horizontal.

## 4. Metadatos del layout

`app/layout.tsx`: `title.default` = título de la principal; `title.template = '%s | Ododex'`; `description` genérica de la web; `openGraph.locale = 'es_ES'`; `robots` sin valor global (cada página pone el suyo; los legales `noindex, follow`).

## 5. Scripts de npm

| Script | Comando |
|---|---|
| `dev` | `next dev` |
| `import-fuel` | `node --import tsx scripts/import-fuel-prices.ts` |
| `build` | `npm run import-fuel && next build --webpack` (desde M2; en M1 solo `next build --webpack`) |
| `test` | `node --import tsx --test "tests/**/*.test.ts" "tests/**/*.test.tsx"` |

## 6. Publicación

- Sección en `../ododex-sitio/config/secciones.json` con `ruta: "/es/electrico-vs-gasolina"`, Worker propio `ododex-electrico-vs-gasolina` (route `ododex.com/es/electrico-vs-gasolina*`), situada **después** de gasolineras para que la compilación completa genere antes `estaciones.json`.
- La actualización diaria de gasolineras (`npm run actualizar:gasolineras` en `ododex-sitio`) compila y despliega también esta sección, para que las medias sean del mismo día.

## 7. Orden de implementación

1. M1 (esqueleto).
2. M2, M3 y M4 (independientes; un solo encargo).
3. M5 (páginas).
4. Integración en `ododex-sitio` y verificación en pantalla (sesión principal).

## 8. Enlaces de red de Ododex (2026-11-19)

- `lib/network.ts` lee en compilación el JSON de `ODODEX_RED_ENLACES` (formato en `../ododex-sitio/ARCHITECTURE.md` §10), con caché por ruta. Sin variable o sin fichero devuelve `null`; JSON inválido o `version !== 1` lanza un `Error` en español.
- Pie (`components/Footer.tsx`, recibe `redSecciones` desde `app/layout.tsx`): « Otras webs de Ododex » con las secciones sin la propia, `<a href>` tal cual (son de otra sección: sin `next/link` ni `assetPath`). Sin red no se pinta.
- `/[provincia]`: `components/NetworkLinks.tsx` pinta « En Ododex también » con los enlaces de la clave `/es/electrico-vs-gasolina/{pageSlug}`. Sustituye a los enlaces fijos de « Más información », que solo se mantienen como respaldo si no hay red (desarrollo local).
- Pruebas: `tests/network.test.tsx`.
