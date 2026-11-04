// CP-01 — Prueba funcional (caja blanca, headless): bono de daño de LEON (sigilo + golpe letal)
// Uso: node -I cp01_leon.js <ruta_al_html>
const fs = require('fs');
const vm = require('vm');

const htmlPath = process.argv[2];
const html = fs.readFileSync(htmlPath, 'utf8');
const m = html.match(/<script>([\s\S]*)<\/script>/);
if (!m) { console.error('No se encontró <script> en el HTML'); process.exit(2); }

// Stub universal de DOM/Canvas/Audio: cualquier propiedad o llamada devuelve otro stub
function stub() {
  const f = function () { return stub(); };
  return new Proxy(f, {
    get: (t, k) => {
      if (k === Symbol.toPrimitive) return () => 0;
      if (k === 'length') return 0;
      return stub();
    },
    set: () => true,
    apply: () => stub(),
    construct: () => stub(),
  });
}
const store = {};
const sandbox = {
  console, Math, JSON, Date, Array, Object, Number, String, Map, Set, Promise, setTimeout, clearTimeout,
  document: stub(), window: null, navigator: { getGamepads: () => [] },
  localStorage: { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); } },
  AudioContext: function () { return stub(); }, webkitAudioContext: function () { return stub(); },
  requestAnimationFrame: () => 0, cancelAnimationFrame: () => {},
  addEventListener: () => {}, performance: { now: () => 0 },
};
sandbox.window = sandbox;
vm.createContext(sandbox);
// Exponer clases/constantes (declaradas con const/class no quedan en el objeto global del contexto)
const codigo = m[1] + '\n;globalThis.__API = { Mecha, PERSONAJES };';
vm.runInContext(codigo, sandbox, { filename: 'brawl_mecha.js' });
const { Mecha, PERSONAJES } = sandbox.__API;

function crearPar() {
  const leon = new Mecha(300, 300, PERSONAJES.LEON, {}, false);
  const rival = new Mecha(340, 300, PERSONAJES.FRANK, {}, false);  // 185 de vida, sin defensa
  leon.dir = 1; leon.combo = 0; rival.combo = 0;
  rival.bloqueando = false; rival.armadura = 0; rival.invencible = 0;
  return { leon, rival };
}

const BASE = 12;           // daño base cuerpo a cuerpo con combo 0 (línea 3408 del juego)
const SIGILO = 1.7, LETAL = 2.6;
const casos = [
  { id: 'A', nombre: 'Solo sigilo',            sigilo: true,  letal: false, esperado: BASE * SIGILO },
  { id: 'B', nombre: 'Solo golpe letal',       sigilo: false, letal: true,  esperado: BASE * LETAL },
  { id: 'C', nombre: 'Sigilo + letal (CP-01)', sigilo: true,  letal: true,  esperado: BASE * Math.max(SIGILO, LETAL) },
];

let aprobados = 0;
console.log('Caso | Escenario                 | Esperado | Obtenido | Estado');
for (const c of casos) {
  const { leon, rival } = crearPar();
  leon.invisible = c.sigilo ? 60 : 0;
  leon.golpeLetal = c.letal;
  const antes = rival.vida;
  leon.atacar(rival);
  const obtenido = +(antes - rival.vida).toFixed(2);
  const ok = Math.abs(obtenido - c.esperado) < 0.01;
  if (ok) aprobados++;
  console.log(`${c.id}    | ${c.nombre.padEnd(25)} | ${String(c.esperado.toFixed(2)).padStart(8)} | ${String(obtenido.toFixed(2)).padStart(8)} | ${ok ? 'APROBADO' : 'FALLIDO'}`);
}
console.log(`\nMultiplicación indebida (regresión del bug) daría: ${(BASE * SIGILO * LETAL).toFixed(2)}`);
console.log(`Casos aprobados: ${aprobados}/${casos.length} (${(aprobados / casos.length * 100).toFixed(1)} %)`);
process.exit(aprobados === casos.length ? 0 : 1);
