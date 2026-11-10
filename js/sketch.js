// abstract-art-30: an old Processing/p5 sketch, ported to plain canvas.
// Same attractor and constants as the original, rotated 90° counterclockwise.
// It draws itself in like graphite, then keeps breathing: the constant c
// drifts a tiny amount, new marks are added and old ones slowly fade.
(function () {
  var A = 100, B = -100, C = 20;   // original constants (d was unused)
  var DRAW_IN = 1200000;           // points in the first drawing
  var DRAW_PER_FRAME = 30000;      // ~40 frames to draw in
  var LIVE_PER_FRAME = 24000;      // points added per frame afterwards
  var FADE = 0.965;                // how much of the old drawing each frame keeps
  var DRIFT = 0.0008;              // how far c wanders from 20
  var DRIFT_PERIOD = 24000;        // ms for one slow sway
  var FRAME_MS = 50;               // ~20fps once it's live
  var BREATHE_MS = 30000;          // breathe this long, then rest (saves battery)
  var INK = [21, 25, 28];          // --ink

  var fig = document.querySelector('.sketch');
  var canvas = fig && fig.querySelector('canvas');
  if (!canvas || !canvas.getContext) return;

  var wide = window.matchMedia('(min-width: 960px)');
  var still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var visible = true;
  var run = 0;
  var resume = null;   // continue after being scrolled away mid-animation
  var wake = null;     // start breathing again after a rest

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      var was = visible;
      visible = entries[0].isIntersecting;
      if (visible && resume) { var r = resume; resume = null; r(); }
      else if (visible && !was && wake) { var w = wake; wake = null; w(); }
    }).observe(fig);
  }

  // one step of the attractor; returns false if it fell into NaN
  function iterate(s, c) {
    var ox = s.x, oy = s.y, oz = s.z;
    s.x = Math.sin(c * oz) * Math.cos(c + oy);
    s.z = Math.sin(B / oz) % Math.cos(B / ox);
    s.y = Math.sin(A + oz) % Math.cos(A + oy);
    if (s.x !== s.x || s.y !== s.y || s.z !== s.z) { s.x = 5; s.y = 1; s.z = 1; return false; }
    s.ox = ox; s.oy = oy;
    return true;
  }

  function start() {
    if (!wide.matches) return;
    var id = ++run;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var size = Math.round(canvas.clientWidth * dpr);
    if (!size) return;
    canvas.width = canvas.height = size;
    var ctx = canvas.getContext('2d');
    var img = ctx.createImageData(size, size);
    var px = img.data;
    for (var j = 0; j < px.length; j += 4) { px[j] = INK[0]; px[j + 1] = INK[1]; px[j + 2] = INK[2]; }
    var counts = new Float32Array(size * size);
    var max = 1, drawn = 0;
    var s = { x: 5, y: 1, z: 1, ox: 0, oy: 0 };

    // Fit: sample the orbit and use its 0.3%–99.7% range, so stray points
    // can't shrink the drawing.
    var N = 50000, sa = new Float64Array(N), sb = new Float64Array(N), n = 0;
    var w = { x: 5, y: 1, z: 1 };
    for (var i = 0; i < N; i++) if (iterate(w, C)) { sa[n] = w.oy; sb[n] = w.ox; n++; }
    sa = sa.subarray(0, n).sort(); sb = sb.subarray(0, n).sort();
    var lo = Math.floor(n * 0.003), hi = Math.ceil(n * 0.997) - 1;
    var minA = sa[lo], maxA = sa[hi], minB = sb[lo], maxB = sb[hi];
    var pad = size * 0.04;
    var scale = (size - 2 * pad) / Math.max(maxA - minA, maxB - minB);
    // Rotated 90° counterclockwise from the original: oldX runs left to
    // right, oldY runs bottom to top.
    var offH = (size - (maxB - minB) * scale) / 2;
    var offV = (size - (maxA - minA) * scale) / 2;

    function plot(count, c) {
      for (var i = 0; i < count; i++) {
        if (!iterate(s, c)) continue;
        var h = (offH + (s.ox - minB) * scale) | 0;
        var v = (size - 1 - (offV + (s.oy - minA) * scale)) | 0;
        if (h < 0 || v < 0 || h >= size || v >= size) continue;
        counts[v * size + h] += 1;
      }
    }

    // Log shading through a lookup table, so painting stays cheap every frame.
    var LUT = new Uint8Array(1025);
    function paint(fade) {
      var lm = Math.log(1 + max);
      // darker graphite: faint marks start at 70, dense folds reach full ink
      for (var k = 0; k <= 1024; k++) LUT[k] = 70 + 185 * Math.pow(Math.log(1 + k / 1024 * max) / lm, 0.8);
      var next = 1, inv = 1024 / max;
      for (var p = 0, a = 3; p < counts.length; p++, a += 4) {
        var c = counts[p];
        if (c === 0) { px[a] = 0; continue; }
        if (fade) { c *= FADE; if (c < 0.05) c = 0; counts[p] = c; }
        if (c > next) next = c;
        px[a] = c ? LUT[Math.min(1024, (c * inv) | 0)] : 0;
      }
      max = next;
      ctx.putImageData(img, 0, 0);
    }

    if (still) { plot(DRAW_IN, C); paint(false); return; }

    var t0 = 0, last = 0, breathed = 0;
    function frame(now) {
      if (id !== run) return;                              // replaced by a newer run
      if (!visible) { resume = function () { requestAnimationFrame(frame); }; return; }
      if (drawn < DRAW_IN) {                               // draw in
        plot(DRAW_PER_FRAME, C);
        drawn += DRAW_PER_FRAME;
        paint(false);
      } else if (now - last >= FRAME_MS) {                 // then breathe, gently
        if (!t0) t0 = now;
        if (last) breathed += Math.min(now - last, 200);
        if (breathed >= BREATHE_MS) {                      // rest; wake when seen again
          breathed = 0; last = 0;
          wake = function () { if (id === run) requestAnimationFrame(frame); };
          return;
        }
        last = now;
        plot(LIVE_PER_FRAME, C + DRIFT * Math.sin((now - t0) / DRIFT_PERIOD * Math.PI * 2));
        paint(true);
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  start();
  wide.addEventListener('change', start);
  var t;
  window.addEventListener('resize', function () {
    clearTimeout(t);
    t = setTimeout(function () {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      if (wide.matches && Math.round(canvas.clientWidth * dpr) !== canvas.width) start();
    }, 250);
  });
})();
