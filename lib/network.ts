import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

/** Variable de entorno con la ruta de red-enlaces.json generada por ododex-sitio */
export const NETWORK_ENV_VAR = 'ODODEX_RED_ENLACES';

export interface NetworkSection {
  ruta: string;
  nombre: string;
  descripcion: string;
}

export interface NetworkLink {
  seccion: string;
  texto: string;
  href: string;
}

interface NetworkData {
  version: number;
  secciones: NetworkSection[];
  enlaces?: Record<string, NetworkLink[]>;
}

let cachedData: NetworkData | null = null;

function resolveNetworkFile(): string | null {
  const envPath = process.env[NETWORK_ENV_VAR];
  if (envPath && existsSync(envPath)) return envPath;
  const siblingPath = path.resolve(process.cwd(), '../ododex-sitio/config/red-enlaces.json');
  if (existsSync(siblingPath)) return siblingPath;
  return null;
}

export function getNetworkData(): NetworkData | null {
  if (cachedData) return cachedData;
  const file = resolveNetworkFile();
  if (!file) return null;
  try {
    const raw = JSON.parse(readFileSync(file, 'utf8')) as NetworkData;
    if (raw && raw.version === 1) {
      cachedData = raw;
      return cachedData;
    }
  } catch (e) {
    console.error('Error cargando red-enlaces.json:', e);
  }
  return null;
}

/** Devuelve los enlaces cruzados contextuales para una ruta concreta o lista vacía si no existe. */
export function getNetworkLinksForRoute(route: string): NetworkLink[] {
  const data = getNetworkData();
  if (!data || !data.enlaces) return [];
  return data.enlaces[route] || [];
}
