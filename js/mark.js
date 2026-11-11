// Home mark: inline the NN logo so each pixel can change colour on its own.
// On hover or focus, random pixels flicker through the palette.
// Without JS, the CSS mask version stays (soft black, gradient on hover).
(function () {
  var PALETTE = ['#7C7FD6', '#FF7AB0', '#F2A33A', '#E8C34A', '#5CC8D8', '#F08497', '#F26A4B'];
  var TICK_MS = 55;        // how often pixels change
  var CHANGE_RATE = 0.4;   // share of pixels that change each tick
  var DARK_RATE = 0.12;    // share that blink back to ink, for flicker

  var link = document.querySelector('.home-mark');
  var mark = link && link.querySelector('.mark');
  if (!mark || !window.fetch) return;

  var still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  fetch('/img/icon-nn.svg')
    .then(function (r) { return r.ok ? r.text() : Promise.reject(); })
    .then(function (text) {
      mark.innerHTML = text;
      var svg = mark.querySelector('svg');
      if (!svg) return;
      svg.removeAttribute('width');
      svg.removeAttribute('height');
      svg.setAttribute('aria-hidden', 'true');
      svg.setAttribute('focusable', 'false');
      mark.classList.add('is-live');
      wire(Array.prototype.slice.call(svg.querySelectorAll('rect')));
    })
    .catch(function () { /* keep the CSS mask fallback */ });

  function pick() { return PALETTE[(Math.random() * PALETTE.length) | 0]; }

  function wire(pixels) {
    var timer = null;

    function tick() {
      pixels.forEach(function (p) {
        var r = Math.random();
        if (r < DARK_RATE) p.style.fill = '';
        else if (r < CHANGE_RATE) p.style.fill = pick();
      });
    }

    function start() {
      if (timer) return;
      pixels.forEach(function (p) { p.style.fill = pick(); });
      if (!still) timer = setInterval(tick, TICK_MS);
    }

    function stop() {
      clearInterval(timer);
      timer = null;
      pixels.forEach(function (p) { p.style.fill = ''; });
    }

    link.addEventListener('mouseenter', start);
    link.addEventListener('mouseleave', stop);
    link.addEventListener('focus', start);
    link.addEventListener('blur', stop);
  }
})();
