# Eléctrico vs gasolina — coste por kilómetro

Web de la red Ododex publicada en `https://ododex.com/es/electrico-vs-gasolina`. Compara cuánto cuesta el kilómetro con un coche eléctrico frente a uno de gasolina 95 o diésel, con el precio medio real de los carburantes en España y en cada provincia.

- **Página principal:** medias nacionales, calculadora, ranking de provincias, tabla de tarifas de recarga por operador y preguntas frecuentes.
- **Una página por provincia** (`/es/electrico-vs-gasolina/<provincia>`): su precio medio, comparación con la media de España, posición en el ranking y calculadora con sus precios.
- Legales: `/aviso-legal`, `/privacidad`, `/cookies`.

El contrato técnico (módulos, interfaces y criterios de aceptación) está en [`ARCHITECTURE.md`](ARCHITECTURE.md).

## Datos

| Dato | Fuente | Actualización |
|---|---|---|
| Precio medio de gasolina 95 y diésel (nacional y por provincia) | MITECO, Precios de carburantes en estaciones de servicio, leído del `public/datos/estaciones.json` que genera `../gasolineras` | Cada día, con la actualización de gasolineras |
| Tarifas de recarga pública por operador y nivel de potencia, y tarifas de referencia para cargar en casa | `data/charging-prices.json`, recopiladas a mano por el titular (campo `updated_at`) | A mano, cuando cambien las tarifas |

Las tarifas de recarga son **orientativas** y la web lo indica: el precio real depende del operador, la tarifa contratada y las promociones.

### Actualizar los precios de combustible

`npm run import-fuel` lee el `estaciones.json` de gasolineras, calcula las medias (descarta precios fuera de 0,5-4 €/l y no publica la media de una provincia con menos de 10 estaciones) y escribe `data/fuel-prices.json` (fuera de git). `npm run build` lo ejecuta antes de compilar, así que basta con compilar después de gasolineras.

En producción lo hace solo la actualización diaria: `npm run actualizar:gasolineras` en `../ododex-sitio` (acceso "Actualizar gasolineras" del escritorio) compila y publica gasolineras y después esta web.

### Actualizar las tarifas de recarga

Edita `data/charging-prices.json` respetando su formato y cambia `updated_at` (`AAAA-MM`). Un operador nuevo necesita su nombre visible en `OPERATOR_NAMES` (`lib/chargingPrices.ts`); si falta, las pruebas y la compilación fallan con un mensaje que lo indica. Después: `npm test` aquí y, en `../ododex-sitio`, `npm run build -- --solo /es/electrico-vs-gasolina` y `npm run deploy -- --solo /es/electrico-vs-gasolina`.

## Instalación

```bash
npm install --force --cpu=wasm32
```

En este Windows el Control de Aplicaciones bloquea los binarios nativos de Tailwind y SWC. `--cpu=wasm32` instala la versión WebAssembly de Tailwind (`@tailwindcss/oxide-wasm32-wasi`) y la compilación usa webpack con PostCSS (`postcss-tailwind-windows.cjs`). El aviso "Application Control policy has blocked @next/swc-win32-x64-msvc" es esperado y no impide compilar.

`config/titular.json` (datos del titular para los legales) no está en git: cópialo de otra web de la red o créalo desde `config/titular.example.json`.

## Variables de entorno

| Variable | Uso | Por defecto |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | Origen del sitio, sin ruta ni barra final | `http://localhost:3000` |
| `NEXT_PUBLIC_ADSENSE_CLIENT` | Cliente AdSense (`ca-pub-` y 16 dígitos) | vacío: sin anuncios |
| `NEXT_PUBLIC_ADSENSE_SLOT` | Unidad AdSense (10 dígitos) | vacío: sin bloques de anuncio |
| `FUEL_STATIONS_FILE` | Fichero de entrada de `import-fuel` | `../gasolineras/public/datos/estaciones.json` |

`../ododex-sitio` pasa las tres primeras al compilar para producción. Ver `.env.example`.

## Desarrollo, pruebas y compilación

```bash
npm run dev          # servidor de desarrollo (necesita data/fuel-prices.json: ejecuta antes npm run import-fuel)
npm test             # pruebas (node --test con tsx, sin red)
npx tsc --noEmit     # comprobación de tipos
npm run build        # import-fuel + exportación estática en out/
```

## Publicación

No se publica desde aquí. Se compila y despliega desde `../ododex-sitio`, en el Worker propio `ododex-electrico-vs-gasolina` (route `ododex.com/es/electrico-vs-gasolina*`):

```bash
npm run build -- --solo /es/electrico-vs-gasolina
npm run deploy -- --solo /es/electrico-vs-gasolina
```
