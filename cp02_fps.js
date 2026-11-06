// CP-02 - Prueba de rendimiento: contador de fotogramas para Brawl Mecha
// Uso: abre index.html en Chrome, inicia una pelea (por ejemplo IA vs IA), pulsa F12 > Consola,
// pega TODO este archivo y pulsa Enter. A los 60 s de pelea ACTIVA imprime el resultado.
(() => {
  const P = { deltas: [], activeMs: 0, maxEnt: 0, maxProj: 0, maxPart: 0, wall0: performance.now() };
  let last = performance.now();
  console.log('CP-02: midiendo 60 s de pelea activa... (no cambies de pestana)');
  function tick(t) {
    const d = t - last; last = t;
    if (typeof estado !== 'undefined' && estado === 'JUGANDO' && cuentaAtras <= 0 && d < 1000) {
      P.deltas.push(d); P.activeMs += d;
      P.maxEnt = Math.max(P.maxEnt, entidades.length);
      P.maxProj = Math.max(P.maxProj, proyectiles.length);
      P.maxPart = Math.max(P.maxPart, particulas.length);
    }
    if (P.activeMs >= 60000 || performance.now() - P.wall0 > 240000) return resumen();
    requestAnimationFrame(tick);
  }
  function resumen() {
    const d = P.deltas.slice().sort((a, b) => a - b);
    const n = d.length, sum = d.reduce((a, b) => a + b, 0);
    const pct = q => d[Math.min(n - 1, Math.floor(q * n))];
    const r = {
      'Segundos de pelea activa': +(P.activeMs / 1000).toFixed(1),
      'Fotogramas': n,
      'FPS promedio': +(n / (sum / 1000)).toFixed(1),
      'ms por fotograma (promedio)': +(sum / n).toFixed(2),
      'ms por fotograma (percentil 95)': +pct(0.95).toFixed(2),
      'ms por fotograma (maximo)': +d[n - 1].toFixed(2),
      'FPS minimo instantaneo': +(1000 / d[n - 1]).toFixed(1),
      'Fotogramas de mas de 20 ms': d.filter(x => x > 20).length,
      'Max. entidades / proyectiles / particulas': P.maxEnt + ' / ' + P.maxProj + ' / ' + P.maxPart,
      'Cumple RNF-01 (>= 55 FPS)': n / (sum / 1000) >= 55,
      'Cumple RNF-02 (<= 18 ms)': sum / n <= 18,
    };
    console.table(r);
  }
  requestAnimationFrame(tick);
})();