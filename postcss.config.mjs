import path from "node:path";

// Tailwind se integra por PostCSS para que funcione igual con webpack y con Turbopack.
// Los plugins se declaran por nombre o ruta (requisito de Next). El primero solo actúa en
// Windows; ver postcss-tailwind-windows.cjs y el README.
// La ruta es absoluta porque Turbopack evalúa esta configuración desde .next/ y una ruta
// relativa ("./...") no se resolvería.
const windowsCandidatesPlugin = path.join(process.cwd(), "postcss-tailwind-windows.cjs");

const config = {
  plugins: [windowsCandidatesPlugin, "@tailwindcss/postcss"],
};

export default config;
