(function () {
  'use strict';

  var canvas = document.getElementById('lairr-globe');
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext('2d');

  var reduceMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  var LOCATIONS = [
    { key: 'edinburgh', name: 'Edinburgh', lat: 55.95, lon: -3.19, primary: false },
    { key: 'dubai', name: 'Dubai (LAIRR)', lat: 25.20, lon: 55.27, primary: true },
    { key: 'malaysia', name: 'Malaysia', lat: 2.93, lon: 101.70, primary: false }
  ];
  var ARC_PAIRS = [[1, 0], [1, 2]];

  var BASE_TILT = -16 * Math.PI / 180;
  var MIN_TILT = -85 * Math.PI / 180;
  var MAX_TILT = 85 * Math.PI / 180;
  var tiltAngle = BASE_TILT;
  var DPR = Math.min(window.devicePixelRatio || 1, 2);
  var size = 420, R = 168, cx = 210, cy = 210;
  var INITIAL_SPIN = -55 * Math.PI / 180;
  var spinAngle = INITIAL_SPIN;
  var lastT = null;

  var AUTO_RESUME_DELAY = 1400;
  var isDragging = false;
  var dragMoved = false;
  var lastPointerX = 0, lastPointerY = 0;
  var lastInteractionTime = -Infinity;
  var spinVelocity = 0.00014;

  var COLORS = {
    gridFront: 'rgba(34,211,238,0.32)',
    gridBack: 'rgba(34,211,238,0.055)',
    rim: 'rgba(34,211,238,0.4)',
    fillA: 'rgba(34,211,238,0.12)',
    fillB: 'rgba(34,211,238,0.02)',
    dot: '#e9edf5',
    dotPrimary: '#22d3ee',
    labelBg: 'rgba(5,7,13,0.78)',
    labelBorder: 'rgba(34,211,238,0.5)',
    labelBorderDim: 'rgba(148,163,184,0.25)',
    labelText: '#cbd5e1',
    labelTextPrimary: '#67e8f9',
    arc: 'rgba(34,211,238,0.55)',
    pulse: '#a5f3fc',
    land: 'rgba(34,211,238,0.9)'
  };

  function hexToRgb(hex) {
    var m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
    if (!m) return null;
    return { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) };
  }

  function refreshColors() {
    var cs = getComputedStyle(document.documentElement);
    var accent = (cs.getPropertyValue('--accent') || '#22d3ee').trim();
    var rgb = hexToRgb(accent) || { r: 34, g: 211, b: 238 };
    var isLight = document.documentElement.getAttribute('data-theme') === 'light' ||
      (!document.documentElement.getAttribute('data-theme') && window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches);

    var a = rgb.r + ',' + rgb.g + ',' + rgb.b;
    COLORS.gridFront = 'rgba(' + a + ',0.34)';
    COLORS.gridBack = 'rgba(' + a + ',' + (isLight ? '0.09' : '0.05') + ')';
    COLORS.rim = 'rgba(' + a + ',0.45)';
    COLORS.fillA = 'rgba(' + a + ',' + (isLight ? '0.10' : '0.12') + ')';
    COLORS.fillB = 'rgba(' + a + ',0.02)';
    COLORS.dotPrimary = accent;
    COLORS.labelBg = isLight ? 'rgba(255,255,255,0.9)' : 'rgba(5,7,13,0.78)';
    COLORS.labelBorder = 'rgba(' + a + ',0.55)';
    COLORS.labelText = isLight ? '#334155' : '#cbd5e1';
    COLORS.labelTextPrimary = isLight ? accent : '#67e8f9';
    COLORS.dot = isLight ? '#1e293b' : '#e9edf5';
    COLORS.arc = 'rgba(' + a + ',0.6)';
    COLORS.land = 'rgba(' + a + ',0.85)';
  }

  function toXYZ(latDeg, lonDeg) {
    var lat = latDeg * Math.PI / 180;
    var lon = lonDeg * Math.PI / 180;
    return {
      x: Math.cos(lat) * Math.cos(lon),
      y: Math.sin(lat),
      z: Math.cos(lat) * Math.sin(lon)
    };
  }

  function rotatePoint(p, spin, tilt) {
    var cosS = Math.cos(spin), sinS = Math.sin(spin);
    var x1 = p.x * cosS + p.z * sinS;
    var z1 = -p.x * sinS + p.z * cosS;
    var y1 = p.y;
    var cosT = Math.cos(tilt), sinT = Math.sin(tilt);
    var y2 = y1 * cosT - z1 * sinT;
    var z2 = y1 * sinT + z1 * cosT;
    return { x: x1, y: y2, z: z2 };
  }

  function project(p) {
    return { x: cx + p.x * R, y: cy - p.y * R, z: p.z };
  }

  function buildGraticule() {
    var lines = [];
    var lon, lat, line, i;
    for (lon = -180; lon < 180; lon += 30) {
      line = [];
      for (lat = -90; lat <= 90; lat += 6) line.push(toXYZ(lat, lon));
      lines.push(line);
    }
    for (lat = -60; lat <= 60; lat += 30) {
      line = [];
      for (lon = -180; lon <= 180; lon += 6) line.push(toXYZ(lat, lon));
      lines.push(line);
    }
    return lines;
  }
  var graticule = buildGraticule();

  var CONTINENTS = [
    [[-165,68],[-155,60],[-130,55],[-125,48],[-124,40],[-117,32],[-105,22],[-97,16],[-90,14],
     [-80,9],[-75,18],[-70,25],[-65,35],[-60,45],[-55,50],[-65,60],[-80,68],[-100,72],[-130,70],[-150,70],[-165,68]],
    [[-80,10],[-75,5],[-70,-5],[-70,-18],[-68,-30],[-70,-40],[-73,-50],[-68,-55],[-65,-52],
     [-58,-38],[-48,-25],[-35,-8],[-40,2],[-55,10],[-70,12],[-80,10]],
    [[-9,43],[-9,50],[-5,58],[5,62],[15,66],[25,60],[30,55],[40,50],[35,45],
     [28,41],[20,40],[15,38],[10,44],[0,44],[-9,43]],
    [[-17,15],[-15,25],[-9,33],[10,37],[25,32],[33,31],[35,20],[43,12],[51,12],
     [51,0],[42,-12],[35,-24],[27,-33],[18,-35],[13,-27],[12,-18],[8,4],[-5,5],[-10,10],[-17,15]],
    [[35,45],[40,38],[45,30],[50,25],[55,25],[60,25],[65,25],[70,20],[75,10],[80,8],
     [85,20],[90,22],[95,20],[100,10],[105,10],[110,20],[115,23],[120,30],[125,35],[130,40],
     [135,45],[140,50],[150,55],[160,60],[170,65],[150,70],[130,73],[110,73],[90,72],[70,70],
     [60,65],[50,60],[40,55],[35,50],[35,45]],
    [[113,-22],[118,-20],[130,-12],[142,-11],[145,-17],[150,-22],[153,-28],[150,-35],
     [143,-38],[137,-35],[131,-32],[125,-33],[115,-34],[113,-22]],
    [[-8,50],[-8,59],[-1,61],[2,53],[-2,50],[-8,50]],
    [[34,32],[36,28],[40,20],[44,13],[50,13],[59,18],[59,27],[53,29],[47,30],[40,33],[34,32]],
    [[95,22],[108,24],[115,10],[106,-2],[95,-2],[93,10],[95,22]]
  ];

  function pointInPolygon(lon, lat, poly) {
    var inside = false;
    for (var i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      var xi = poly[i][0], yi = poly[i][1];
      var xj = poly[j][0], yj = poly[j][1];
      var intersect = ((yi > lat) !== (yj > lat)) &&
        (lon < (xj - xi) * (lat - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }

  function buildLandDots() {
    var dots = [];
    for (var lat = -58; lat <= 76; lat += 3.6) {
      for (var lon = -180; lon <= 180; lon += 3.6) {
        for (var c = 0; c < CONTINENTS.length; c++) {
          if (pointInPolygon(lon, lat, CONTINENTS[c])) {
            dots.push(toXYZ(lat, lon));
            break;
          }
        }
      }
    }
    return dots;
  }
  var landDots = buildLandDots();

  function slerpArc(a, b, steps, bulge) {
    var pa = toXYZ(a.lat, a.lon), pb = toXYZ(b.lat, b.lon);
    var dot = Math.max(-1, Math.min(1, pa.x * pb.x + pa.y * pb.y + pa.z * pb.z));
    var theta = Math.acos(dot);
    var sinTheta = Math.sin(theta) || 1e-6;
    var pts = [];
    for (var i = 0; i <= steps; i++) {
      var t = i / steps;
      var wa = Math.sin((1 - t) * theta) / sinTheta;
      var wb = Math.sin(t * theta) / sinTheta;
      var x = wa * pa.x + wb * pb.x;
      var y = wa * pa.y + wb * pb.y;
      var z = wa * pa.z + wb * pb.z;
      var len = Math.sqrt(x * x + y * y + z * z) || 1;
      var lift = 1 + bulge * Math.sin(t * Math.PI);
      pts.push({ x: (x / len) * lift, y: (y / len) * lift, z: (z / len) * lift, t: t });
    }
    return pts;
  }
  var arcs = ARC_PAIRS.map(function (pair) {
    return { points: slerpArc(LOCATIONS[pair[0]], LOCATIONS[pair[1]], 56, 0.22) };
  });

  function resize() {
    var parent = canvas.parentElement;
    var rect = parent.getBoundingClientRect();
    size = Math.max(120, Math.min(rect.width, rect.height) || 300);
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(size * DPR);
    canvas.height = Math.round(size * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    R = size * 0.37;
    cx = size / 2;
    cy = size / 2;
  }

  function strokeGroupedPolyline(points3d) {
    if (points3d.length < 2) return;
    var currentBucket = null;
    var path = null;
    for (var i = 0; i < points3d.length - 1; i++) {
      var a = points3d[i], b = points3d[i + 1];
      var avgZ = (a.z + b.z) / 2;
      var bucket = avgZ > 0 ? 'front' : 'back';
      if (bucket !== currentBucket) {
        if (path) { ctx.stroke(); }
        currentBucket = bucket;
        ctx.beginPath();
        ctx.strokeStyle = bucket === 'front' ? COLORS.gridFront : COLORS.gridBack;
        ctx.lineWidth = bucket === 'front' ? 1 : 0.75;
        ctx.moveTo(a.x, a.y);
        path = true;
      }
      ctx.lineTo(b.x, b.y);
    }
    if (path) ctx.stroke();
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawLabel(x, y, text, primary, opacity) {
    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.font = (primary ? '600 12px' : '500 11px') + ' Inter, sans-serif';
    var padX = 8;
    var w = ctx.measureText(text).width;
    var boxW = w + padX * 2, boxH = 20;
    var placeLeft = x > size * 0.58;
    var bx = placeLeft ? x - boxW - 9 : x + 9;
    var by = y - boxH / 2;
    bx = Math.max(3, Math.min(size - boxW - 3, bx));
    by = Math.max(3, Math.min(size - boxH - 3, by));
    roundRect(bx, by, boxW, boxH, 6);
    ctx.fillStyle = COLORS.labelBg;
    ctx.fill();
    ctx.strokeStyle = primary ? COLORS.labelBorder : COLORS.labelBorderDim;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = primary ? COLORS.labelTextPrimary : COLORS.labelText;
    ctx.textBaseline = 'middle';
    ctx.fillText(text, bx + padX, by + boxH / 2 + 0.5);
    ctx.restore();
  }

  function draw(t) {
    if (lastT === null) lastT = t;
    var dt = t - lastT;
    lastT = t;
    var idle = t - lastInteractionTime > AUTO_RESUME_DELAY;
    if (!reduceMotion && !isDragging && idle) spinAngle += dt * spinVelocity;

    ctx.clearRect(0, 0, size, size);

    var sphereGrad = ctx.createRadialGradient(cx - R * 0.3, cy - R * 0.35, R * 0.1, cx, cy, R);
    sphereGrad.addColorStop(0, COLORS.fillA);
    sphereGrad.addColorStop(1, COLORS.fillB);
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.fillStyle = sphereGrad;
    ctx.fill();
    ctx.strokeStyle = COLORS.rim;
    ctx.lineWidth = 1.25;
    ctx.stroke();

    graticule.forEach(function (line) {
      var projected = line.map(function (p) { return project(rotatePoint(p, spinAngle, tiltAngle)); });
      strokeGroupedPolyline(projected);
    });

    ctx.fillStyle = COLORS.land;
    for (var d = 0; d < landDots.length; d++) {
      var rp0 = rotatePoint(landDots[d], spinAngle, tiltAngle);
      if (rp0.z <= -0.04) continue;
      var pp0 = project(rp0);
      var op0 = Math.max(0, Math.min(0.9, rp0.z * 1.3 + 0.18));
      ctx.globalAlpha = op0;
      ctx.beginPath();
      ctx.arc(pp0.x, pp0.y, R * 0.0095, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    arcs.forEach(function (arc) {
      var projected = arc.points.map(function (p) { return project(rotatePoint(p, spinAngle, tiltAngle)); });
      var currentBucket = null, path = null;
      for (var i = 0; i < projected.length - 1; i++) {
        var a = projected[i], b = projected[i + 1];
        var avgZ = (a.z + b.z) / 2;
        var bucket = avgZ > 0 ? 'front' : 'back';
        if (bucket !== currentBucket) {
          if (path) ctx.stroke();
          currentBucket = bucket;
          ctx.beginPath();
          ctx.strokeStyle = COLORS.arc;
          ctx.globalAlpha = bucket === 'front' ? 0.9 : 0.12;
          ctx.lineWidth = 1.5;
          ctx.moveTo(a.x, a.y);
          path = true;
        }
        ctx.lineTo(b.x, b.y);
      }
      if (path) ctx.stroke();
      ctx.globalAlpha = 1;

      if (!reduceMotion) {
        var pulseT = (t * 0.00028 + arc.offset) % 1;
        var idx = Math.min(arc.points.length - 1, Math.floor(pulseT * arc.points.length));
        var pp = project(rotatePoint(arc.points[idx], spinAngle, tiltAngle));
        if (pp.z > 0) {
          ctx.save();
          ctx.globalAlpha = 0.9;
          ctx.fillStyle = COLORS.pulse;
          ctx.beginPath();
          ctx.arc(pp.x, pp.y, 2.4, 0, Math.PI * 2);
          ctx.shadowColor = COLORS.pulse;
          ctx.shadowBlur = 8;
          ctx.fill();
          ctx.restore();
        }
      }
    });

    LOCATIONS.forEach(function (loc) {
      var rp = rotatePoint(toXYZ(loc.lat, loc.lon), spinAngle, tiltAngle);
      var pp = project(rp);
      var opacity = Math.max(0, Math.min(1, rp.z * 2.2 + 0.35));
      if (opacity <= 0.02) return;

      var baseR = loc.primary ? 4.4 : 3.2;
      var pulse = loc.primary && !reduceMotion ? 1 + 0.25 * Math.sin(t * 0.003) : 1;

      if (loc.primary) {
        ctx.save();
        ctx.globalAlpha = opacity * 0.35;
        ctx.beginPath();
        ctx.arc(pp.x, pp.y, baseR * pulse * 2.4, 0, Math.PI * 2);
        ctx.fillStyle = COLORS.dotPrimary;
        ctx.fill();
        ctx.restore();
      }

      ctx.save();
      ctx.globalAlpha = opacity;
      ctx.beginPath();
      ctx.arc(pp.x, pp.y, baseR * (loc.primary ? pulse : 1), 0, Math.PI * 2);
      ctx.fillStyle = loc.primary ? COLORS.dotPrimary : COLORS.dot;
      ctx.fill();
      ctx.restore();

      drawLabel(pp.x, pp.y, loc.name, loc.primary, opacity);
    });

    requestAnimationFrame(draw);
  }

  arcs.forEach(function (arc, i) { arc.offset = i * 0.5; });

  function bindInteraction() {
    var activePointerId = null;

    function onPointerDown(e) {
      isDragging = true;
      dragMoved = false;
      lastPointerX = e.clientX;
      lastPointerY = e.clientY;
      activePointerId = e.pointerId;
      try { canvas.setPointerCapture(activePointerId); } catch (err) { /* unsupported */ }
      lastInteractionTime = performance.now();
    }

    function onPointerMove(e) {
      if (!isDragging) return;
      var dx = e.clientX - lastPointerX;
      var dy = e.clientY - lastPointerY;
      lastPointerX = e.clientX;
      lastPointerY = e.clientY;
      if (Math.abs(dx) > 1 || Math.abs(dy) > 1) dragMoved = true;
      spinAngle += dx * 0.011;
      tiltAngle = Math.max(MIN_TILT, Math.min(MAX_TILT, tiltAngle - dy * 0.011));
      lastInteractionTime = performance.now();
    }

    function onPointerUp() {
      isDragging = false;
      if (activePointerId !== null) {
        try { canvas.releasePointerCapture(activePointerId); } catch (err) { /* unsupported */ }
        activePointerId = null;
      }
      lastInteractionTime = performance.now();
    }

    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointercancel', onPointerUp);
    canvas.addEventListener('dragstart', function (e) { e.preventDefault(); });
  }

  function init() {
    refreshColors();
    resize();
    bindInteraction();
    requestAnimationFrame(draw);
  }

  window.addEventListener('resize', resize);
  document.addEventListener('lairr-theme-change', refreshColors);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
