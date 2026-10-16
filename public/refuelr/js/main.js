// Mobile menu
(function () {
  var toggle = document.querySelector('.menu-toggle');
  var menu = document.querySelector('.mobile-menu');

  if (!toggle || !menu) return;

  function setOpen(isOpen) {
    menu.classList.toggle('is-open', isOpen);
    toggle.setAttribute('aria-expanded', String(isOpen));
    toggle.setAttribute('aria-label', isOpen ? 'Close menu' : 'Menu');
  }

  toggle.addEventListener('click', function () {
    setOpen(!menu.classList.contains('is-open'));
  });

  menu.querySelectorAll('a').forEach(function (link) {
    link.addEventListener('click', function () {
      setOpen(false);
    });
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && menu.classList.contains('is-open')) {
      setOpen(false);
      toggle.focus();
    }
  });
})();

// Hero map: price pins on the tilted map. Each pin's spot on the flat map is
// projected through the same perspective as .hero-map in styles.css, so the
// numbers in WIDE and NARROW must match those transforms.
(function () {
  var stage = document.querySelector('.hero-stage');
  var layer = stage && stage.querySelector('.hero-pins');
  var chip = stage && stage.querySelector('.hero-chip');

  if (!layer) return;

  // [map x, map y, price, cheapest]; the cheapest is drawn as a marker, not a price
  var PINS = [
    [1090, 700, 1.369, true], [930, 520, 1.429], [1240, 540, 1.449], [860, 800, 1.419],
    [1270, 860, 1.409], [700, 640, 1.439], [1480, 700, 1.459], [560, 900, 1.439],
    [640, 440, 1.479], [1660, 560, 1.429], [420, 640, 1.449], [1100, 330, 1.469],
    [1500, 1000, 1.439], [300, 1000, 1.459], [300, 200, 1.459], [1600, 180, 1.489],
    [1950, 420, 1.439], [60, 460, 1.469], [900, 150, 1.449], [1300, 250, 1.459]
  ];
  var YOU = [980, 640];

  var WIDE = {
    P: 1200, SIN: 0.7071, COS: 0.7071, oy: 920,
    plane: function (mx, my) { return [mx - 1000, my - 1300]; }
  };
  var NARROW = {
    P: 800, SIN: 0.6428, COS: 0.766, oy: 430,
    plane: function (mx, my) { return [(mx - 290) / 1.6 - 500, (my + 180) / 1.6 - 800]; }
  };

  var PUMP = '<path d="M5 21V5a2 2 0 012-2h6a2 2 0 012 2v16"/><path d="M3 21h14"/><path d="M15 9h2.5a1.5 1.5 0 011.5 1.5V16a1.5 1.5 0 003 0V8l-3-3"/>';
  var narrowQuery = window.matchMedia('(max-width: 899px)');
  var lastWidth = 0;

  function render(animate) {
    var w = stage.clientWidth;
    var wide = !narrowQuery.matches;
    var G = wide ? WIDE : NARROW;

    function project(mx, my) {
      var q = G.plane(mx, my);
      var f = G.P / (G.P - q[1] * G.SIN);
      return { x: w / 2 + q[0] * f, y: G.oy + q[1] * G.COS * f, f: f };
    }

    var pins = PINS.map(function (d) {
      var q = project(d[0], d[1]);
      var cheap = !!d[3];
      var k = cheap ? (wide ? 1 : 0.95) : Math.max(0.6, Math.min(wide ? 1 : 0.9, q.f * (wide ? 1.25 : 1.05)));
      var op = wide ? (q.y - 420) / 140 : (q.y - 100) / 110;
      return { x: Math.round(q.x), y: Math.round(q.y), k: k, op: Math.max(0.35, Math.min(1, op)), price: d[2].toFixed(3), cheap: cheap };
    });

    // The station card hangs 22px below the cheapest station's marker, centred
    // on it (wide) or across the stage (narrow); .hero-card in styles.css places
    // it the same way. Drop any pin it or the chip would hide.
    var c0 = pins.filter(function (p) { return p.cheap; })[0];
    var cardL = Math.max(24, Math.min(w - 384, c0.x - 180));
    var cardT = c0.y + 22;
    var covers = [wide
      ? { l: cardL, t: cardT - 14, r: cardL + 360, b: cardT + 240 }
      : { l: 0, t: cardT - 14, r: w, b: Infinity }];
    if (chip) {
      covers.push({ l: chip.offsetLeft, t: chip.offsetTop, r: chip.offsetLeft + chip.offsetWidth, b: chip.offsetTop + chip.offsetHeight });
    }

    pins = pins.filter(function (p) {
      var inStage = wide
        ? p.x > 40 && p.x < w - 40 && p.y > 425 && p.y < 870
        : p.x > 42 && p.x < w - 42 && p.y > 110;
      if (!inStage) return false;
      if (p.cheap) return true;
      var half = 52 * p.k;
      var top = p.y - 48 * p.k;
      return !covers.some(function (c) {
        return p.x + half > c.l - 16 && p.x - half < c.r + 16 && p.y > c.t - 16 && top < c.b + 16;
      });
    });

    // Furthest first so nearer pins paint on top; the cheapest station's marker drops in last.
    pins.sort(function (a, b) { return (a.cheap - b.cheap) || (a.y - b.y); });

    var you = project(YOU[0], YOU[1]);
    var html = '<div class="you-are-here" style="left: ' + Math.round(you.x) + 'px; top: ' + Math.round(you.y) + 'px"></div>';

    pins.forEach(function (p, i) {
      var style = 'left: ' + p.x + 'px; top: ' + p.y + 'px; --k: ' + p.k.toFixed(3);
      if (p.cheap) {
        if (animate) style += '; animation-delay: ' + (pins.length * 70 + 250) + 'ms';
        html += '<div class="hero-marker' + (animate ? ' pin-settle' : '') + '" style="' + style + '">' +
          '<span class="marker-pulse"></span><span class="marker-pulse"></span><span class="marker-dot"></span></div>';
      } else {
        var price = '<span>£' + p.price.slice(0, -1) + '<span class="tail">' + p.price.slice(-1) + '</span></span>';
        style += '; --op: ' + p.op.toFixed(2);
        if (animate) style += '; animation-delay: ' + i * 70 + 'ms';
        html += '<div class="tag' + (animate ? ' pin-in' : '') + '" style="' + style + '">' +
          '<div class="tag-body"><svg viewBox="0 0 24 24" fill="none" stroke="#b5b9c1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + PUMP + '</svg>' +
          price + '</div><div class="tag-tip"></div></div>';
      }
    });

    layer.innerHTML = html;
    lastWidth = w;
  }

  render(true);

  // Re-place the pins when the stage changes width, without replaying the drop-in
  if (typeof ResizeObserver !== 'undefined') {
    new ResizeObserver(function () {
      if (stage.clientWidth !== lastWidth) render(false);
    }).observe(stage);
  }
})();
