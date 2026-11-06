// CP-01 - Prueba funcional (caja blanca, headless): bono de dano de LEON (sigilo + golpe letal)
// Verifica que los bonos NO se multipliquen entre si (bug corregido): se toma el mayor, no el producto.
// El dano base se MIDE en cada version del juego, asi la prueba sigue valiendo si se reequilibra el dano.
// Uso: node cp01_leon.js <ruta_al_html>
const fs = require('fs');
const vm = require('vm');

const htmlPath = process.argv[2];
const html = fs.readFileSync(htmlPath, 'utf8');
const m = html.match(/<script>([\s\S]*)<\/script>/);
if (!m) { console.error('No se encontro <script> en el HTML'); process.exit(2); }

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
vm.runInContext(m[1] + '\n;globalThis.__API = { Mecha, PERSONAJES };', sandbox, { filename: 'brawl_mecha.js' });
const { Mecha, PERSONAJES } = sandbox.__API;

// Un golpe cuerpo a cuerpo de LEON contra FRANK (185 de vida, sin bloqueo ni armadura). Devuelve el dano causado.
function golpe({ sigilo, letal }) {
  const leon = new Mecha(300, 300, PERSONAJES.LEON, {}, false);
  const rival = new Mecha(340, 300, PERSONAJES.FRANK, {}, false);
  leon.dir = 1; leon.combo = 0; rival.combo = 0;
  rival.bloqueando = false; rival.armadura = 0; rival.invencible = 0;
  leon.invisible = sigilo ? 60 : 0;
  leon.golpeLetal = letal;
  const antes = rival.vida;
  leon.atacar(rival);
  return +(antes - rival.vida).toFixed(2);
}

const SIGILO = 1.7, LETAL = 2.6;                 // bonos de diseno
const base = golpe({ sigilo: false, letal: false });  // dano base medido, combo 0
console.log('Dano base de LEON medido (sin bonos, combo 0): ' + base + '\n');

const casos = [
  { id: 'A', nombre: 'Solo sigilo',            sigilo: true,  letal: false, esperado: base * SIGILO },
  { id: 'B', nombre: 'Solo golpe letal',       sigilo: false, letal: true,  esperado: base * LETAL },
  { id: 'C', nombre: 'Sigilo + letal (CP-01)', sigilo: true,  letal: true,  esperado: base * Math.max(SIGILO, LETAL) },
];

let aprobados = 0;
console.log('Caso | Escenario                 | Esperado | Obtenido | Estado');
for (const c of casos) {
  const obtenido = golpe(c);
  const ok = Math.abs(obtenido - +c.esperado.toFixed(2)) < 0.011;
  if (ok) aprobados++;
  console.log(c.id + '    | ' + c.nombre.padEnd(25) + ' | ' + c.esperado.toFixed(2).padStart(8) + ' | ' + obtenido.toFixed(2).padStart(8) + ' | ' + (ok ? 'APROBADO' : 'FALLIDO'));
}
console.log('\nSi los bonos se multiplicaran (el bug), el caso C daria: ' + (base * SIGILO * LETAL).toFixed(2));
console.log('Casos aprobados: ' + aprobados + '/' + casos.length + ' (' + (aprobados / casos.length * 100).toFixed(1) + ' %)');
process.exit(aprobados === casos.length ? 0 : 1);