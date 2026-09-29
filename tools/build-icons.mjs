/**
 * Arma el sprite de iconos del producto a partir de los paquetes de origen,
 * no de un volcado manual. Los once primeros son Phosphor en peso Regular,
 * que es el que usa el prototipo; los tres ultimos son Material Symbols en
 * estilo Outlined, que es el que trae el kit de Material 3.
 *
 *   node tools/build-icons.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const PHOSPHOR = join(raiz, 'node_modules', '@phosphor-icons', 'core', 'assets', 'regular');
const SYMBOLS = join(raiz, 'node_modules', '@material-symbols', 'svg-400', 'outlined');

/**
 * Cada icono declara de donde sale y donde se usa, para que nadie agregue uno
 * suelto sin saber a que pantalla responde.
 */
const ICONOS = [
  {
    nombre: 'check',
    origen: 'phosphor',
    archivo: 'check.svg',
    uso: 'confirmaciones y listas de beneficios',
  },
  { nombre: 'x', origen: 'phosphor', archivo: 'x.svg', uso: 'cerrar modales' },
  { nombre: 'plus', origen: 'phosphor', archivo: 'plus.svg', uso: 'nueva cotizacion' },
  {
    nombre: 'arrow-right',
    origen: 'phosphor',
    archivo: 'arrow-right.svg',
    uso: 'avanzar en el recorrido',
  },
  { nombre: 'wrench', origen: 'phosphor', archivo: 'wrench.svg', uso: 'amparo de asistencias' },
  {
    nombre: 'lightning',
    origen: 'phosphor',
    archivo: 'lightning.svg',
    uso: 'cotizacion inmediata',
  },
  { nombre: 'key', origen: 'phosphor', archivo: 'key.svg', uso: 'acceso y credenciales' },
  { nombre: 'browsers', origen: 'phosphor', archivo: 'browsers.svg', uso: 'canal web' },
  {
    nombre: 'hand-heart',
    origen: 'phosphor',
    archivo: 'hand-heart.svg',
    uso: 'proteccion de la familia',
  },
  { nombre: 'house', origen: 'phosphor', archivo: 'house.svg', uso: 'credito hipotecario' },
  {
    nombre: 'shield-check',
    origen: 'phosphor',
    archivo: 'shield-check.svg',
    uso: 'cobertura vigente',
  },
  {
    nombre: 'check-small',
    origen: 'symbols',
    archivo: 'check_small.svg',
    uso: 'items de una lista compacta',
  },
  {
    nombre: 'error',
    origen: 'symbols',
    archivo: 'error-fill.svg',
    uso: 'campo invalido y mensajes de error',
  },
  {
    nombre: 'stars-filled',
    origen: 'symbols',
    archivo: 'stars-fill.svg',
    uso: 'destacar un beneficio',
  },
];

const CARPETA = { phosphor: PHOSPHOR, symbols: SYMBOLS };

/** Deja solo el viewBox y el contenido, y hace que el color lo ponga el tema. */
function normalizar(svg) {
  const viewBox = /viewBox="([^"]+)"/.exec(svg)?.[1];
  if (!viewBox) throw new Error('el SVG no declara viewBox');
  const contenido = svg
    .replace(/^[\s\S]*?<svg[^>]*>/, '')
    .replace(/<\/svg>\s*$/, '')
    .replace(/\s*fill="(?!none)[^"]*"/g, '')
    .trim();
  return { viewBox, contenido };
}

const simbolos = ICONOS.map(({ nombre, origen, archivo }) => {
  const bruto = readFileSync(join(CARPETA[origen], archivo), 'utf8');
  const { viewBox, contenido } = normalizar(bruto);
  return `  <symbol id="${nombre}" viewBox="${viewBox}" fill="currentColor">${contenido}</symbol>`;
});

const sprite = [
  '<svg xmlns="http://www.w3.org/2000/svg">',
  '  <!-- Generado por tools/build-icons.mjs. No editar a mano. -->',
  ...simbolos,
  '</svg>',
  '',
].join('\n');

mkdirSync(join(raiz, 'public', 'iconos'), { recursive: true });
writeFileSync(join(raiz, 'public', 'iconos', 'solventa.svg'), sprite, 'utf8');

const union = ICONOS.map((i) => `  | '${i.nombre}'`).join('\n');
const tabla = ICONOS.map((i) => ` * - ${i.nombre}: ${i.uso} (${i.origen})`).join('\n');
const ts = `// Generado por tools/build-icons.mjs. No editar a mano.
//
/**
 * Iconos disponibles en el sprite del producto.
 *
${tabla}
 */
export type NombreDeIcono =
${union};

export const ICONOS: readonly NombreDeIcono[] = [
${ICONOS.map((i) => `  '${i.nombre}',`).join('\n')}
];
`;

mkdirSync(join(raiz, 'src', 'app', 'nucleo', 'iconos'), { recursive: true });
writeFileSync(join(raiz, 'src', 'app', 'nucleo', 'iconos', 'iconos.ts'), ts, 'utf8');

console.log(`sprite con ${ICONOS.length} iconos en public/iconos/solventa.svg`);
