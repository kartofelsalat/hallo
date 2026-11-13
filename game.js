/* Catch My Love — a little game about a rose.
   Vanilla JS, canvas 2D, no dependencies. Landscape, touch-first.
   Everything personal lives in content.js. */
(function () {
'use strict';

/* ============================== palette ================================== */
var INK   = '#3a2a22';
var CREAM = '#f4ead6';
var SAND  = '#e0b878';
var MINT  = '#9ec8b0';
var BONE  = '#d8d2bf';
var FOXC  = '#d2763a';
var GOLD  = '#f0c46a';
var RED   = '#c8324a';          /* reserved for the rose, and nothing else */
var SKY_T = '#0c2530';
var SKY_B = '#1e4d55';
var PLANET= '#2d544c';
var PLANET2='#23443f';

var C = (typeof CONTENT !== 'undefined') ? CONTENT : {};
function cfg(k, d) { return (C[k] === undefined || C[k] === null) ? d : C[k]; }
var HER = cfg('name', 'you');

/* ============================== canvas =================================== */
var canvas = document.getElementById('stage');
var ctx = canvas.getContext('2d', { alpha: false });
var W = 800, H = 450, S = 1, DPR = 1;

var quality = 1;          /* drops to 0 by itself on a slow device */
function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, quality ? 2 : 1.25);
  var cw = window.innerWidth, ch = window.innerHeight;
  canvas.width  = Math.round(cw * DPR);
  canvas.height = Math.round(ch * DPR);
  canvas.style.width = cw + 'px';
  canvas.style.height = ch + 'px';
  W = cw; H = ch;
  S = Math.max(0.55, Math.min(H / 440, 2.4));
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  buildPaper();
  layoutGround();
  buildStars();
  buildPlanet();
  buildPaperTex();
  buildVignette();
  skyKey = '';
}
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', function () { setTimeout(resize, 120); });

/* ============================== save ===================================== */
var SAVE_KEY = 'catchmylove.v1';
var save = {
  high: 0, highEndless: 0, trinkets: [], fragments: [], letter2: 0,
  endless: false, finale: false, sound: true, runs: 0, bestNight: 0
};
function loadSave() {
  try {
    var raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      var o = JSON.parse(raw);
      for (var k in save) if (o[k] !== undefined) save[k] = o[k];
    }
  } catch (e) {}
}
function writeSave() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {} }
loadSave();

/* ============================== audio ==================================== */
/* WebAudio only — no files, works offline. Unlocked by the first touch. */
var AC = null, master = null, musicOn = true, nextNote = 0, musicStep = 0, musicNight = 0;
function audioInit() {
  if (AC) { if (AC.state === 'suspended') AC.resume(); return; }
  try {
    var Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return;
    AC = new Ctor();
    master = AC.createGain();
    master.gain.value = save.sound ? 0.5 : 0;
    master.connect(AC.destination);
    nextNote = AC.currentTime + 0.1;
  } catch (e) { AC = null; }
}
function setSound(on) {
  save.sound = on; writeSave();
  if (master) master.gain.setTargetAtTime(on ? 0.5 : 0, AC.currentTime, 0.05);
}
function tone(freq, when, dur, type, vol, detune) {
  if (!AC || !save.sound) return;
  var o = AC.createOscillator(), g = AC.createGain();
  o.type = type || 'triangle';
  o.frequency.value = freq;
  if (detune) o.detune.value = detune;
  g.gain.setValueAtTime(0, when);
  g.gain.linearRampToValueAtTime(vol === undefined ? 0.2 : vol, when + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
  o.connect(g); g.connect(master);
  o.start(when); o.stop(when + dur + 0.05);
}
function noiseBurst(when, dur, vol, hp) {
  if (!AC || !save.sound) return;
  var len = Math.floor(AC.sampleRate * dur);
  var buf = AC.createBuffer(1, len, AC.sampleRate), d = buf.getChannelData(0);
  for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  var src = AC.createBufferSource(); src.buffer = buf;
  var f = AC.createBiquadFilter(); f.type = hp ? 'highpass' : 'lowpass'; f.frequency.value = hp || 700;
  var g = AC.createGain(); g.gain.value = vol || 0.2;
  src.connect(f); f.connect(g); g.connect(master);
  src.start(when);
}
function now() { return AC ? AC.currentTime : 0; }
var sfx = {
  catch1: function (n) { if (!AC) return; var t = now(); tone(520 + Math.min(n, 12) * 42, t, 0.26, 'triangle', 0.16);
                         tone(1040 + Math.min(n, 12) * 84, t + 0.015, 0.18, 'sine', 0.07); },
  bad:    function () { if (!AC) return; var t = now(); tone(140, t, 0.3, 'sawtooth', 0.12); noiseBurst(t, 0.22, 0.16, 0); },
  pour:   function () { if (!AC) return; var t = now();
                        [392, 494, 587, 784].forEach(function (f, i) { tone(f, t + i * 0.07, 0.5, 'sine', 0.14); }); },
  spark:  function () { if (!AC) return; var t = now();
                        [1047, 1319, 1568, 2093].forEach(function (f, i) { tone(f, t + i * 0.055, 0.5, 'sine', 0.1); }); },
  fox:    function () { if (!AC) return; var t = now(); tone(330, t, 1.6, 'sine', 0.16); tone(495, t + 0.1, 1.4, 'sine', 0.08); },
  seed:   function () { if (!AC) return; var t = now(); tone(90, t, 0.4, 'sine', 0.14); noiseBurst(t, 0.3, 0.1, 0); },
  ui:     function () { if (!AC) return; tone(660, now(), 0.12, 'triangle', 0.12); },
  night:  function () { if (!AC) return; var t = now();
                        [523, 659, 784].forEach(function (f, i) { tone(f, t + i * 0.12, 0.9, 'sine', 0.12); }); },
  over:   function () { if (!AC) return; var t = now();
                        [392, 349, 294, 262].forEach(function (f, i) { tone(f, t + i * 0.22, 1.1, 'triangle', 0.14); }); }
};
/* a five-note music box motif, varied per night */
var MOTIF = [0, 4, 7, 4, 2];
var SCALES = [[0,2,4,7,9],[0,3,5,7,10],[0,2,5,7,9],[0,2,3,7,8],[0,4,7,9,11]];
function musicTick() {
  if (!AC || !save.sound || !musicOn) return;
  var t = AC.currentTime;
  if (nextNote < t) nextNote = t + 0.05;
  while (nextNote < t + 0.4) {
    var sc = SCALES[musicNight % SCALES.length];
    var st = MOTIF[musicStep % MOTIF.length] + (musicStep % 10 >= 5 ? 12 : 0);
    var semi = sc[st % 5] + 12 * Math.floor(st / 5);
    var f = 261.63 * Math.pow(2, semi / 12);
    tone(f, nextNote, 1.1, 'sine', 0.055);
    tone(f * 2, nextNote, 0.5, 'sine', 0.018);
    if (musicStep % 5 === 0) tone(f / 2, nextNote, 1.6, 'triangle', 0.035);
    musicStep++;
    nextNote += 0.42;
  }
}

/* ============================ rng + boil ================================= */
function hash(a, b) {
  var h = (a * 374761393 + b * 668265263) | 0;
  h = (h ^ (h >> 13)) * 1274126177 | 0;
  return ((h ^ (h >> 16)) & 0x7fffffff) / 0x7fffffff;
}
var boil = 0;                              /* changes 3x a second */
function jx(seed, i, amp) { return (hash(seed * 131 + i, boil) - 0.5) * amp; }
function jy(seed, i, amp) { return (hash(seed * 977 + i, boil + 7919) - 0.5) * amp; }

/* ============================ ink drawing ================================ */
/* every outline is redrawn with a new wobble three times a second, so the
   world looks like it is being sketched while she plays */
function inkPath(pts, seed, amp, close) {
  amp = amp === undefined ? 1.6 * S : amp;
  ctx.beginPath();
  for (var i = 0; i < pts.length; i++) {
    var p = pts[i];
    var x = p[0] + jx(seed, i, amp), y = p[1] + jy(seed, i, amp);
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  if (close) ctx.closePath();
}
function stroke(w, col) {
  ctx.lineWidth = (w === undefined ? 2.1 : w) * S;
  ctx.strokeStyle = col || INK;
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.stroke();
}
function wash(col, alpha) {
  ctx.globalAlpha = alpha === undefined ? 0.92 : alpha;
  ctx.fillStyle = col; ctx.fill();
  ctx.globalAlpha = 1;
}
/* a wobbly circle as a point list */
function circlePts(cx, cy, r, n, squash) {
  n = n || 14; squash = squash === undefined ? 1 : squash;
  var a = [];
  for (var i = 0; i < n; i++) {
    var t = i / n * Math.PI * 2;
    a.push([cx + Math.cos(t) * r, cy + Math.sin(t) * r * squash]);
  }
  return a;
}
function inkBlob(cx, cy, r, seed, fill, alpha, squash, lw) {
  var pts = circlePts(cx, cy, r, 14, squash);
  if (fill) {
    inkPath(pts, seed + 1, r * 0.16, true);
    ctx.save(); ctx.translate(r * 0.08, r * 0.1); wash(fill, alpha); ctx.restore();
  }
  inkPath(pts, seed, Math.max(1.1 * S, r * 0.1), true);
  stroke(lw === undefined ? 2 : lw);
}
var glowCache = {};
function glowSprite(col) {
  if (glowCache[col]) return glowCache[col];
  var c = document.createElement('canvas');
  c.width = c.height = 96;
  var g = c.getContext('2d');
  var rg = g.createRadialGradient(48, 48, 0, 48, 48, 48);
  rg.addColorStop(0, col); rg.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = rg; g.fillRect(0, 0, 96, 96);
  glowCache[col] = c;
  return c;
}
function glow(x, y, r, col, a) {
  ctx.globalAlpha = a === undefined ? 0.3 : a;
  ctx.drawImage(glowSprite(col), x - r, y - r, r * 2, r * 2);
  ctx.globalAlpha = 1;
}
function heartPts(cx, cy, r) {
  var a = [];
  for (var i = 0; i <= 18; i++) {
    var t = i / 18 * Math.PI * 2;
    var x = 16 * Math.pow(Math.sin(t), 3);
    var y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
    a.push([cx + x * r / 16, cy + y * r / 16]);
  }
  return a;
}
function starPts(cx, cy, r, n, inner) {
  n = n || 5; inner = inner || 0.44;
  var a = [];
  for (var i = 0; i < n * 2; i++) {
    var t = -Math.PI / 2 + i / (n * 2) * Math.PI * 2;
    var rr = (i % 2 === 0) ? r : r * inner;
    a.push([cx + Math.cos(t) * rr, cy + Math.sin(t) * rr]);
  }
  return a;
}

/* ============================ paper + stars =============================== */
var paper = null, starfield = null;
function buildPaper() {
  var c = document.createElement('canvas');
  c.width = 220; c.height = 220;
  var g = c.getContext('2d');
  var im = g.createImageData(220, 220), d = im.data;
  for (var i = 0; i < d.length; i += 4) {
    var v = 118 + Math.random() * 90;
    d[i] = d[i + 1] = d[i + 2] = v;
    d[i + 3] = Math.random() * 26;
  }
  g.putImageData(im, 0, 0);
  for (var k = 0; k < 40; k++) {
    g.globalAlpha = 0.05;
    g.strokeStyle = '#000';
    g.beginPath();
    var x = Math.random() * 220, y = Math.random() * 220;
    g.moveTo(x, y); g.lineTo(x + (Math.random() - 0.5) * 60, y + (Math.random() - 0.5) * 60);
    g.stroke();
  }
  paper = c;
  paperTex = null;
}
function buildStars() {
  var c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(W * DPR)); c.height = Math.max(1, Math.round(H * DPR));
  var g = c.getContext('2d');
  g.setTransform(DPR, 0, 0, DPR, 0, 0);
  for (var i = 0; i < 150; i++) {
    var x = Math.random() * W, y = Math.random() * H * 0.86;
    var r = (Math.random() * 1.5 + 0.5) * S;
    g.globalAlpha = 0.25 + Math.random() * 0.6;
    g.fillStyle = Math.random() < 0.12 ? GOLD : CREAM;
    g.beginPath(); g.arc(x, y, r, 0, 6.2832); g.fill();
  }
  g.globalAlpha = 1;
  starfield = c;
}
var vignette = null;
function buildVignette() {
  var c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(W / 2)); c.height = Math.max(1, Math.round(H / 2));
  var g = c.getContext('2d');
  var rg = g.createRadialGradient(c.width / 2, c.height * 0.46, Math.min(c.width, c.height) * 0.36,
                                  c.width / 2, c.height * 0.5, Math.max(c.width, c.height) * 0.78);
  rg.addColorStop(0, 'rgba(0,0,0,0)');
  rg.addColorStop(1, 'rgba(6,16,24,0.55)');
  g.fillStyle = rg; g.fillRect(0, 0, c.width, c.height);
  vignette = c;
}
var paperTex = null;
function buildPaperTex() {
  if (!paper) return;
  var c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(W)); c.height = Math.max(1, Math.round(H));
  var g = c.getContext('2d');
  g.fillStyle = g.createPattern(paper, 'repeat');
  g.fillRect(0, 0, W, H);
  paperTex = c;
}
function drawPaper() {
  if (!quality) return;
  if (!paperTex) buildPaperTex();
  if (!paperTex) return;
  ctx.globalAlpha = 0.5;
  ctx.drawImage(paperTex, 0, 0, W, H);
  ctx.globalAlpha = 1;
}

/* ============================ text ======================================= */
var FONT = '"Noteworthy","Marker Felt","Bradley Hand","Segoe Print",Georgia,serif';
function text(str, x, y, size, col, align, italic, alpha) {
  ctx.font = (italic ? 'italic ' : '') + Math.round(size * S) + 'px ' + FONT;
  ctx.textAlign = align || 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.globalAlpha = alpha === undefined ? 1 : alpha;
  ctx.fillStyle = col || CREAM;
  ctx.fillText(str, x, y);
  ctx.globalAlpha = 1;
}
function textW(str, size, italic) {
  ctx.font = (italic ? 'italic ' : '') + Math.round(size * S) + 'px ' + FONT;
  return ctx.measureText(str).width;
}
function wrap(str, size, maxW) {
  var words = String(str).split(' '), lines = [], cur = '';
  for (var i = 0; i < words.length; i++) {
    var t = cur ? cur + ' ' + words[i] : words[i];
    if (textW(t, size) > maxW && cur) { lines.push(cur); cur = words[i]; }
    else cur = t;
  }
  if (cur) lines.push(cur);
  return lines;
}

/* ============================ the planet ================================= */
/* the prince stands on the shoulder of a very small world, so the ground is
   a gentle arc rather than a line */
var gr = { R: 0, cx: 0, cy: 0, base: 0 };
function layoutGround() {
  gr.base = H * 0.80;
  gr.R = W * 1.9;
  gr.cx = W / 2;
  gr.cy = gr.base + gr.R - H * 0.085;
}
function groundY(x) {
  var dx = x - gr.cx;
  var inside = gr.R * gr.R - dx * dx;
  if (inside < 0) return gr.base;
  return gr.cy - Math.sqrt(inside);
}

/* ============================ the prince ================================= */
function drawPrince(p, dark) {
  var x = p.x, y = groundY(p.x);
  var u = 21 * S;
  var spd = Math.min(1, Math.abs(p.vx) / (220 * S));
  var lean = clamp(p.vx / (420 * S), -0.22, 0.22);
  var bob = Math.sin(p.walk * 7) * 1.7 * S * spd;
  var hipY = y - u * 0.92 + bob;
  var shoulderY = y - u * 2.0 + bob;
  var headY = shoulderY - u * 0.66;
  var ic = dark ? 'rgba(244,234,214,0.9)' : INK;
  var coatC = dark ? '#2e5b63' : MINT;
  var hairC = dark ? 'rgba(240,196,106,0.85)' : GOLD;
  var skin  = dark ? '#e8dcc0' : '#f7e9cd';

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(lean * 0.35);
  if (p.squash > 0) {
    var sq = Math.sin(p.squash * Math.PI) * 0.16;
    ctx.scale(1 - sq * 0.7, 1 + sq);
  }
  ctx.translate(-x, -y);

  /* the cape, behind everything, swinging against the walk */
  var sw = -Math.sign(p.vx || 1);
  var flare = (0.5 + spd) * u * 0.8;
  var cape = [[x, shoulderY - u * 0.1],
              [x + sw * (u * 0.5 + flare * 0.5), shoulderY + u * 0.5],
              [x + sw * (u * 0.62 + flare), hipY + u * 0.55],
              [x + sw * u * 0.1, hipY + u * 0.35]];
  inkPath(cape, 20, 2 * S, true);
  wash(dark ? '#1f4149' : '#7fb0a0', 0.92);
  inkPath(cape, 21, 2 * S, true);
  stroke(2.1, ic);

  /* the scarf streams from the neck */
  drawScarf(p, 0, dark);

  /* legs */
  var step = Math.sin(p.walk * 7) * 8 * S * spd;
  inkPath([[x - u * 0.17, hipY], [x - u * 0.2 + step, y]], 22, 1.3 * S); stroke(2.8, ic);
  inkPath([[x + u * 0.17, hipY], [x + u * 0.2 - step, y]], 23, 1.3 * S); stroke(2.8, ic);
  inkPath([[x - u * 0.3 + step, y], [x - u * 0.08 + step, y]], 24, 1 * S); stroke(3, ic);
  inkPath([[x + u * 0.08 - step, y], [x + u * 0.3 - step, y]], 25, 1 * S); stroke(3, ic);

  /* the coat: narrow at the shoulders, flared at the hem */
  var coat = [[x - u * 0.34, shoulderY + u * 0.06],
              [x + u * 0.34, shoulderY + u * 0.06],
              [x + u * 0.56, hipY + u * 0.14],
              [x - u * 0.56, hipY + u * 0.14]];
  inkPath(coat, 26, 1.7 * S, true);
  ctx.save(); ctx.translate(1.3 * S, 1.5 * S); wash(coatC, 0.92); ctx.restore();
  inkPath(coat, 27, 1.7 * S, true);
  stroke(2.4, ic);
  /* belt */
  inkPath([[x - u * 0.42, hipY - u * 0.18], [x + u * 0.42, hipY - u * 0.18]], 28, 1 * S);
  stroke(2.2, dark ? ic : '#6f9c84');
  /* a hem that catches the light */
  inkPath([[x - u * 0.54, hipY + u * 0.12], [x + u * 0.54, hipY + u * 0.12]], 29, 1.2 * S);
  stroke(1.6, 'rgba(244,234,214,0.45)');

  /* arms */
  inkPath([[x - u * 0.3, shoulderY + u * 0.2], [x - u * 0.72, shoulderY + u * 0.52],
           [x - u * 0.78, shoulderY + u * 0.1]], 30, 1.4 * S);
  stroke(2.7, ic);
  inkPath([[x + u * 0.3, shoulderY + u * 0.16], [x + u * 0.74, shoulderY - u * 0.12]], 32, 1.4 * S);
  stroke(2.7, ic);

  /* head */
  inkBlob(x, headY, u * 0.62, 33, skin, 0.96, 1.02, 2.3);
  /* a crown of curls instead of spikes */
  for (var k = 0; k < 8; k++) {
    var ang = -Math.PI * 1.04 + k / 7 * Math.PI * 1.08;
    var rr = u * (0.26 + (k % 2) * 0.07);
    inkBlob(x + Math.cos(ang) * u * 0.58, headY + Math.sin(ang) * u * 0.56,
            rr, 40 + k, hairC, 0.95, 1, 1.7);
  }
  inkBlob(x - u * 0.52, headY + u * 0.3, u * 0.17, 50, hairC, 0.95, 1, 1.5);
  inkBlob(x + u * 0.52, headY + u * 0.28, u * 0.16, 51, hairC, 0.95, 1, 1.5);

  /* face — she watches the sky when it is empty, and the rose when the can is full */
  var look = clamp(p.vx / 220, -1, 1) * 2.2 * S;
  var tilt = 0;
  if (Math.abs(p.vx) < 30 * S && G.screen === 'play') {
    if (p.water >= CAN_MAX) look = clamp((G.roseX - p.x) / (90 * S), -1, 1) * 2.4 * S;
    else tilt = -1.4 * S;
  }
  headY += tilt;
  ctx.globalAlpha = dark ? 0.5 : 0.75;
  ctx.fillStyle = '#e59a9a';
  ctx.beginPath(); ctx.ellipse(x - u * 0.32 + look, headY + u * 0.16, u * 0.13, u * 0.09, 0, 0, 6.2832); ctx.fill();
  ctx.beginPath(); ctx.ellipse(x + u * 0.3 + look, headY + u * 0.16, u * 0.13, u * 0.09, 0, 0, 6.2832); ctx.fill();
  ctx.globalAlpha = 1;
  ctx.fillStyle = ic;
  var blink = (Math.sin(G.t * 0.9) > 0.985) ? 0.25 : 1;
  ctx.beginPath(); ctx.ellipse(x - u * 0.18 + look, headY - u * 0.02, 2.1 * S, 2.1 * S * blink, 0, 0, 6.2832); ctx.fill();
  ctx.beginPath(); ctx.ellipse(x + u * 0.18 + look, headY - u * 0.02, 2.1 * S, 2.1 * S * blink, 0, 0, 6.2832); ctx.fill();
  if (!dark) {
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath(); ctx.arc(x - u * 0.22 + look, headY - u * 0.07, 0.8 * S, 0, 6.2832); ctx.fill();
    ctx.beginPath(); ctx.arc(x + u * 0.14 + look, headY - u * 0.07, 0.8 * S, 0, 6.2832); ctx.fill();
  }
  inkPath([[x - u * 0.09 + look, headY + u * 0.26], [x + look, headY + u * 0.31],
           [x + u * 0.09 + look, headY + u * 0.26]], 52, 0.8 * S);
  stroke(1.8, ic);

  /* the watering can */
  var canX = x + u * 0.96, canY = shoulderY - u * 0.12;
  var pops2 = p.canPop > 0 ? 1 + Math.sin(p.canPop * Math.PI) * 0.22 : 1;
  var cw = u * 0.72 * pops2, ch = u * 0.58 * pops2;
  if (p.canPop > 0.05) glow(canX, canY, u * 1.4, '#6fb8c8', p.canPop * 0.4);
  var canPts = [[canX - cw / 2, canY - ch / 2], [canX + cw / 2, canY - ch * 0.56],
                [canX + cw * 0.44, canY + ch / 2], [canX - cw * 0.44, canY + ch / 2]];
  inkPath(canPts, 71, 1.2 * S, true);
  wash(dark ? '#3a5f66' : BONE, 0.94);
  if (p.water > 0) {
    var fr = Math.min(1, p.water / CAN_MAX);
    ctx.save();
    ctx.beginPath(); ctx.rect(canX - cw, canY + ch / 2 - ch * fr, cw * 2, ch * fr); ctx.clip();
    inkPath(canPts, 71, 1.2 * S, true);
    wash('#6fb8c8', 0.95);
    ctx.restore();
  }
  inkPath(canPts, 71, 1.2 * S, true);
  stroke(2.2, ic);
  inkPath([[canX + cw * 0.46, canY - ch * 0.2], [canX + cw * 0.95, canY - ch * 0.62],
           [canX + cw * 1.12, canY - ch * 0.44]], 72, 1 * S);
  stroke(2.4, ic);
  inkPath([[canX - cw * 0.3, canY - ch * 0.5], [canX, canY - ch * 1.0], [canX + cw * 0.3, canY - ch * 0.52]], 73, 1 * S);
  stroke(2, ic);
  ctx.restore();
}

/* ============================ the rose =================================== */
function drawRose(x, bloom, t, dark, scale) {
  var sc = (scale || 1) * S * (1 + (G.roseHit > 0 ? Math.sin(G.roseHit * Math.PI) * 0.13 : 0));
  var y = groundY(x);
  var h = 58 * sc;
  var sway = Math.sin(t * 0.8) * 2.4 * sc;
  /* she leans toward whoever is coming */
  if (G.screen === 'play' && G.prince) {
    var dxp = clamp((G.prince.x - x) / (160 * S), -1, 1);
    var near = 1 - Math.min(1, Math.abs(G.prince.x - x) / (220 * S));
    sway += dxp * near * 7 * sc;
  }
  var stemC = dark ? 'rgba(158,200,176,0.85)' : '#5e8a6a';

  /* stem */
  inkPath([[x, y], [x - 2.4 * sc, y - h * 0.4], [x + 2 * sc + sway * 0.4, y - h * 0.74],
           [x + sway, y - h]], 140, 1.3 * S);
  stroke(3, stemC);
  /* two leaves, growing out of the stem */
  for (var s2 = -1; s2 <= 1; s2 += 2) {
    var f = (s2 < 0 ? 0.4 : 0.58);
    var ly = y - h * f;
    var lx = x + (-2.4 * sc) * (1 - f) + (2 * sc + sway * 0.4) * f;   /* follow the stem */
    var tipx = lx + s2 * 17 * sc, tipy = ly - 8 * sc;
    inkPath([[lx, ly + 1.5 * sc],
             [lx + s2 * 8 * sc, ly - 5.5 * sc],
             [tipx, tipy],
             [lx + s2 * 9 * sc, ly + 3.5 * sc]], 141 + s2, 1.3 * S, true);
    wash(dark ? '#4b7a5c' : '#6f9c74', 0.92);
    stroke(2, dark ? 'rgba(58,42,34,0.8)' : INK);
    inkPath([[lx + s2 * 1.5 * sc, ly], [tipx - s2 * 2 * sc, tipy + 1.5 * sc]], 146 + s2, 0.8 * S);
    stroke(1.3, dark ? 'rgba(58,42,34,0.5)' : 'rgba(58,42,34,0.45)');
  }
  /* sepal */
  var by = y - h + sway * 0.2, br = (9 + bloom * 13) * sc;
  inkPath([[x + sway - br * 0.4, by + br * 0.5], [x + sway, by + br * 1.1],
           [x + sway + br * 0.4, by + br * 0.5]], 143, 1.3 * S, true);
  wash('#5e8a6a', 0.92); stroke(1.9, dark ? 'rgba(58,42,34,0.8)' : INK);

  if (bloom > 0.99) glow(x + sway, by, br * 3.2, RED, 0.4 + Math.sin(t * 2) * 0.12);

  /* the bloom: an outer ring that opens, an inner ring, a spiral heart */
  var cx = x + sway;
  var outer = 6, open = 0.34 + bloom * 0.8;
  for (var i = 0; i < outer; i++) {
    var a = -Math.PI / 2 + i / outer * Math.PI * 2 + t * 0.07;
    inkBlob(cx + Math.cos(a) * br * open * 0.78, by + Math.sin(a) * br * open * 0.74,
            br * 0.6, 150 + i, '#b02b42', 0.93, 1, 1.9);
  }
  for (var j = 0; j < 4; j++) {
    var a2 = -Math.PI / 2 + j / 4 * Math.PI * 2 - t * 0.05;
    inkBlob(cx + Math.cos(a2) * br * 0.34, by + Math.sin(a2) * br * 0.32,
            br * 0.46, 158 + j, RED, 0.95, 1, 1.8);
  }
  inkBlob(cx, by, br * 0.34, 164, bloom > 0.6 ? '#e05a70' : '#8e2134', 0.96, 1, 1.7);
  inkPath([[cx - br * 0.14, by], [cx + br * 0.1, by - br * 0.12], [cx + br * 0.12, by + br * 0.12]], 165, 0.7 * S);
  stroke(1.5, 'rgba(60,10,20,0.6)');
}

/* ============================ the fox ==================================== */
function drawFox(f, t) {
  var x = f.x, y = groundY(f.x), u = 13 * S;
  var bob = Math.sin(t * 4) * 0.8 * S;
  /* tail */
  inkPath([[x + u * 0.9, y - u * 0.8 + bob], [x + u * 1.8, y - u * 1.2],
           [x + u * 2.2, y - u * 0.3]], 180, 1.8 * S, true);
  wash(FOXC, 0.9); stroke(2, INK);
  /* body */
  inkBlob(x, y - u * 0.78 + bob, u * 0.9, 181, FOXC, 0.92, 0.78, 2.2);
  /* legs */
  for (var s = -1; s <= 1; s += 2) {
    inkPath([[x + s * u * 0.45, y - u * 0.5], [x + s * u * 0.5, y]], 182 + s, 1.2 * S);
    stroke(2.2, INK);
  }
  /* head + ears */
  var hx = x - u * 0.95, hy = y - u * 1.25 + bob;
  inkPath([[hx - u * 0.42, hy - u * 0.1], [hx - u * 0.55, hy - u * 0.95], [hx - u * 0.02, hy - u * 0.4]], 184, 1.4 * S, true);
  wash(FOXC, 0.9); stroke(2, INK);
  inkPath([[hx + u * 0.3, hy - u * 0.2], [hx + u * 0.45, hy - u * 0.98], [hx - u * 0.05, hy - u * 0.45]], 185, 1.4 * S, true);
  wash(FOXC, 0.9); stroke(2, INK);
  inkBlob(hx, hy, u * 0.52, 186, FOXC, 0.95, 1, 2.1);
  inkPath([[hx - u * 0.5, hy + u * 0.2], [hx - u * 0.85, hy + u * 0.34]], 187, 1.2 * S);
  stroke(2.4, INK);
  ctx.fillStyle = INK;
  ctx.beginPath(); ctx.arc(hx - u * 0.2, hy - u * 0.02, 1.8 * S, 0, 6.2832); ctx.fill();
  ctx.beginPath(); ctx.arc(hx + u * 0.16, hy - u * 0.05, 1.8 * S, 0, 6.2832); ctx.fill();
}

/* ============================ baobabs ==================================== */
function drawBaobab(b) {
  var x = b.x, y = groundY(x), g = b.growth;
  var h = (14 + g * 86) * S;
  var w = (3 + g * 15) * S;
  inkPath([[x - w, y], [x - w * 0.55, y - h * 0.75], [x - w * 0.3, y - h],
           [x + w * 0.3, y - h], [x + w * 0.55, y - h * 0.75], [x + w, y]], 200 + b.id, 1.7 * S, true);
  ctx.save(); ctx.translate(1.5 * S, 0); wash('#4a3a2e', 0.9); ctx.restore();
  inkPath([[x - w, y], [x - w * 0.55, y - h * 0.75], [x - w * 0.3, y - h],
           [x + w * 0.3, y - h], [x + w * 0.55, y - h * 0.75], [x + w, y]], 201 + b.id, 1.7 * S, true);
  stroke(2.3);
  var cn = Math.min(7, 2 + Math.floor(g * 5));
  for (var i = 0; i < cn; i++) {
    var a = -Math.PI * 0.88 + (i / Math.max(1, cn - 1)) * Math.PI * 0.76;
    var spread = w * 2.4 + g * 10 * S;
    var rr = (5 + g * 14) * S * (0.72 + hash(b.id * 13 + i, 5) * 0.6);
    inkBlob(x + Math.cos(a) * spread, y - h + Math.sin(a) * rr * 0.9 + rr * 0.35,
            rr, 210 + b.id * 7 + i, g > 0.99 ? '#3c6b4a' : '#55835c', 0.92, 0.92, 2.1);
  }
  inkBlob(x, y - h - (3 + g * 10) * S, (5 + g * 13) * S, 240 + b.id,
          g > 0.99 ? '#44754f' : '#5d8c63', 0.92, 0.9, 2.1);
  if (g > 0.99) {
    ctx.globalAlpha = 0.5; text('!', x, y - h - 28 * S, 20, RED); ctx.globalAlpha = 1;
  }
}

/* ============================ trinkets =================================== */
/* the things that stay on her planet once caught */
var TRINKETS = ['lamp','bench','rabbit','scope','jar','dome','sheep','volcano','vane','boat','swing','cup','cage'];
function trinketName(k) { var n = cfg('trinketNames', {}); return n[k] || k; }
function drawTrinket(kind, x, y, sc, t) {
  var u = 14 * S * (sc || 1);
  ctx.save();
  switch (kind) {
    case 'lamp':
      inkPath([[x, y], [x, y - u * 2.2]], 300, 1.3 * S); stroke(2.4);
      inkPath([[x - u * 0.4, y - u * 2.2], [x + u * 0.4, y - u * 2.2], [x + u * 0.25, y - u * 2.9], [x - u * 0.25, y - u * 2.9]], 301, 1.3 * S, true);
      wash(GOLD, 0.9); stroke(2);
      glow(x, y - u * 2.5, u * 2.4, GOLD, 0.3 + Math.sin(t * 2) * 0.07);
      break;
    case 'bench':
      inkPath([[x - u, y - u * 0.7], [x + u, y - u * 0.7]], 302, 1.2 * S); stroke(3.2, '#7a5a3a');
      inkPath([[x - u, y - u * 1.4], [x + u, y - u * 1.4]], 303, 1.2 * S); stroke(2.6, '#7a5a3a');
      inkPath([[x - u * 0.8, y], [x - u * 0.8, y - u * 1.5]], 304, 1 * S); stroke(2.2);
      inkPath([[x + u * 0.8, y], [x + u * 0.8, y - u * 1.5]], 305, 1 * S); stroke(2.2);
      break;
    case 'rabbit':
      u *= 2.4;                    /* he deserves to be seen */
      /* he hops, every few seconds, on his own clock */
      var ph = (t * 0.55 + (x % 97) * 0.11) % 1;
      var hop = ph < 0.26 ? Math.sin(ph / 0.26 * Math.PI) * u * 0.52 : 0;
      var lean = ph < 0.26 ? Math.sin(ph / 0.26 * Math.PI) * 0.22 : 0;
      ctx.save();
      ctx.translate(x, y - hop); ctx.rotate(-lean); ctx.translate(-x, -(y - hop));
      var by3 = y - hop;
      /* back feet */
      inkPath([[x - u * 0.7, by3 - u * 0.1], [x - u * 0.2, by3 - u * 0.02]], 338, 0.8 * S);
      stroke(3.4, BONE);
      /* body */
      inkBlob(x - u * 0.12, by3 - u * 0.45, u * 0.5, 339, '#e6dcc6', 0.96, 0.92, 2.1);
      /* tail */
      inkBlob(x - u * 0.6, by3 - u * 0.5, u * 0.18, 340, CREAM, 0.96, 1, 1.6);
      /* head */
      inkBlob(x + u * 0.36, by3 - u * 0.72, u * 0.33, 341, '#efe6d2', 0.96, 1, 2);
      /* ears, laid back a little when he jumps */
      for (var ei = 0; ei < 2; ei++) {
        var ea = -1.45 + ei * 0.34 + lean * 1.1;
        inkPath([[x + u * 0.34 + ei * u * 0.1, by3 - u * 0.92],
                 [x + u * 0.34 + Math.cos(ea) * u * 0.3 + ei * u * 0.12, by3 - u * 1.25],
                 [x + u * 0.3 + Math.cos(ea) * u * 0.42 + ei * u * 0.14, by3 - u * 1.62]],
                342 + ei, 0.9 * S);
        stroke(3.2, '#efe6d2');
      }
      ctx.fillStyle = INK;
      ctx.beginPath(); ctx.arc(x + u * 0.46, by3 - u * 0.76, 1.5 * S, 0, 6.2832); ctx.fill();
      ctx.beginPath(); ctx.arc(x + u * 0.64, by3 - u * 0.66, 1.1 * S, 0, 6.2832); ctx.fill();
      ctx.restore();
      break;
    case 'scope':
      inkPath([[x - u * 0.5, y], [x, y - u * 0.9], [x + u * 0.5, y]], 306, 1.2 * S); stroke(2.2);
      ctx.save(); ctx.translate(x, y - u * 1.1); ctx.rotate(-0.6);
      inkPath([[-u * 0.9, -u * 0.22], [u * 0.9, -u * 0.34], [u * 0.9, u * 0.34], [-u * 0.9, u * 0.22]], 307, 1.2 * S, true);
      wash(BONE, 0.92); stroke(2); ctx.restore();
      break;
    case 'jar':
      inkPath([[x - u * 0.55, y], [x - u * 0.6, y - u * 1.2], [x + u * 0.6, y - u * 1.2], [x + u * 0.55, y]], 308, 1.2 * S, true);
      wash('rgba(200,230,235,0.35)', 1); stroke(2);
      inkPath(starPts(x, y - u * 0.6, u * 0.4), 309, 0.9 * S, true); wash(GOLD, 0.95); stroke(1.6);
      inkPath([[x - u * 0.62, y - u * 1.2], [x + u * 0.62, y - u * 1.25]], 310, 1 * S); stroke(2.6, '#9a7a4a');
      break;
    case 'dome':
      ctx.globalAlpha = 0.3;
      inkPath(circlePts(x, y - u * 0.9, u * 1.15, 14, 1).filter(function (p) { return p[1] <= y - u * 0.85; }), 311, 1.4 * S);
      stroke(2.4, CREAM); ctx.globalAlpha = 1;
      inkPath([[x - u * 1.2, y], [x + u * 1.2, y]], 312, 1 * S); stroke(2.2);
      break;
    case 'sheep':
      inkBlob(x, y - u * 0.75, u * 0.78, 313, CREAM, 0.95, 0.8, 2.1);
      inkBlob(x - u * 0.72, y - u * 1.0, u * 0.36, 314, BONE, 0.95, 1, 2);
      for (var s = -1; s <= 1; s += 2) { inkPath([[x + s * u * 0.35, y - u * 0.3], [x + s * u * 0.38, y]], 315 + s, 1 * S); stroke(2.1); }
      inkPath([[x + u * 0.8, y - u * 0.9], [x + u * 1.2, y - u * 0.9]], 317, 1 * S); stroke(2, '#8a6a3a');
      break;
    case 'volcano':
      inkPath([[x - u * 1.3, y], [x - u * 0.45, y - u * 1.1], [x + u * 0.45, y - u * 1.1], [x + u * 1.3, y]], 318, 1.5 * S, true);
      wash('#6b4a3a', 0.92); stroke(2.3);
      ctx.globalAlpha = 0.75;
      inkPath([[x - u * 0.3, y - u * 1.1], [x - u * 0.1, y - u * 1.7 - Math.sin(t * 3) * u * 0.2], [x + u * 0.3, y - u * 1.1]], 319, 1.6 * S, true);
      wash(SAND, 0.8); ctx.globalAlpha = 1;
      break;
    case 'vane':
      inkPath([[x, y], [x, y - u * 2]], 320, 1.2 * S); stroke(2.3);
      ctx.save(); ctx.translate(x, y - u * 2); ctx.rotate(Math.sin(t * 0.7) * 0.5);
      inkPath([[-u * 0.8, 0], [u * 0.8, -u * 0.3], [u * 0.8, u * 0.3]], 321, 1.2 * S, true);
      wash('#8a8070', 0.92); stroke(2); ctx.restore();
      break;
    case 'boat':
      inkPath([[x - u, y], [x + u, y], [x + u * 0.6, y - u * 0.5], [x - u * 0.6, y - u * 0.5]], 322, 1.3 * S, true);
      wash(CREAM, 0.95); stroke(2.1);
      inkPath([[x, y - u * 0.5], [x, y - u * 1.6], [x + u * 0.7, y - u * 0.5]], 323, 1.3 * S, true);
      wash(BONE, 0.95); stroke(2);
      break;
    case 'swing':
      inkPath([[x - u * 1.1, y - u * 2.4], [x + u * 1.1, y - u * 2.4]], 324, 1 * S); stroke(2.2);
      inkPath([[x - u * 0.5, y - u * 2.4], [x - u * 0.45, y - u * 0.5]], 325, 1 * S); stroke(1.8);
      inkPath([[x + u * 0.5, y - u * 2.4], [x + u * 0.45, y - u * 0.5]], 326, 1 * S); stroke(1.8);
      inkPath([[x - u * 0.6, y - u * 0.5], [x + u * 0.6, y - u * 0.5]], 327, 1 * S); stroke(3.4, '#7a5a3a');
      break;
    case 'cup':
      for (var i = 0; i < 2; i++) {
        var cx2 = x + (i ? u * 0.85 : -u * 0.85);
        inkPath([[cx2 - u * 0.42, y - u * 0.7], [cx2 + u * 0.42, y - u * 0.7], [cx2 + u * 0.3, y], [cx2 - u * 0.3, y]], 328 + i, 1.1 * S, true);
        wash(CREAM, 0.95); stroke(2);
      }
      break;
    case 'cage':
      inkPath([[x - u * 0.8, y], [x + u * 0.8, y]], 330, 1 * S); stroke(2.4);
      for (var j = -2; j <= 2; j++) {
        inkPath([[x + j * u * 0.34, y], [x + j * u * 0.26, y - u * 1.5]], 331 + j, 1.1 * S); stroke(1.7);
      }
      inkPath([[x - u * 0.8, y - u * 1.5], [x, y - u * 1.9], [x + u * 0.8, y - u * 1.5]], 336, 1.2 * S); stroke(2.1);
      break;
  }
  ctx.restore();
}

/* ======================= falling things ================================== */
var CAN_MAX = 10;
var T_HEART = 'heart', T_STAR = 'star', T_NOTE = 'note', T_ROSE = 'rose', T_REDROSE = 'redrose',
    T_COIN = 'coin', T_THORN = 'thorn', T_ROCK = 'rock', T_SHEEP = 'sheep',
    T_TRINKET = 'trinket', T_GOLD = 'goldrose',
    T_CATER = 'caterpillar', T_FLY = 'butterfly', T_SEED = 'seed',
    T_DOME = 'dome', T_WATCH = 'watch', T_SUN = 'sunset';
var GOOD = { heart: 1, star: 1, note: 1, redrose: 1, sheep: 1, trinket: 1, goldrose: 1,
             caterpillar: 1, butterfly: 1, seed: 1, dome: 1, watch: 1, sunset: 1 };
var BAD  = { thorn: 1, rock: 1 };

/* a soft mark on the ground under the things that cost her something */
function drawLandings() {
  for (var i = 0; i < G.objs.length; i++) {
    var o = G.objs[i];
    if (o.type !== T_HEART && o.type !== T_SEED) continue;
    var gy = groundY(o.x), fall = gy - o.y;
    if (fall > H * 0.46 || fall < 0) continue;
    var a = (1 - fall / (H * 0.46)) * 0.5;
    ctx.globalAlpha = a;
    ctx.fillStyle = o.type === T_SEED ? '#8fbf6a' : '#e5839a';
    ctx.beginPath();
    ctx.ellipse(o.x, gy + 2 * S, (9 + (1 - a) * 5) * S, 3.2 * S, 0, 0, 6.2832);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}
function drawFalling(o, t, dark) {
  var x = o.x, y = o.y, r = o.r;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(o.rot);
  ctx.translate(-x, -y);
  if (GOOD[o.type] && !dark) {
    glow(x, y, r * 2.4, o.type === T_SEED ? '#8fbf6a' : GOLD, o.type === T_SEED ? 0.34 : 0.3);
  }
  switch (o.type) {
    case T_HEART:
      inkPath(heartPts(x, y, r), o.id + 1, r * 0.13, true);
      ctx.save(); ctx.translate(r * 0.1, r * 0.12); wash('#c9546f', 0.92); ctx.restore();
      inkPath(heartPts(x, y, r * 0.78), o.id + 4, r * 0.1, true);
      wash('#e5839a', 0.5);
      ctx.globalAlpha = 0.7; ctx.fillStyle = 'rgba(255,240,240,0.9)';
      ctx.beginPath(); ctx.ellipse(x - r * 0.33, y - r * 0.3, r * 0.2, r * 0.13, -0.5, 0, 6.2832);
      ctx.fill(); ctx.globalAlpha = 1;
      inkPath(heartPts(x, y, r), o.id, r * 0.13, true); stroke(2.1);
      break;
    case T_STAR:
      inkPath(starPts(x, y, r * 1.12), o.id + 1, r * 0.12, true);
      ctx.save(); ctx.translate(r * 0.1, r * 0.1); wash(GOLD, 0.92); ctx.restore();
      inkPath(starPts(x, y, r * 1.12), o.id, r * 0.12, true); stroke(2);
      break;
    case T_NOTE:
      inkPath(starPts(x, y, r * 1.3, 5, 0.5), o.id + 1, r * 0.12, true);
      wash(CREAM, 0.95);
      inkPath(starPts(x, y, r * 1.3, 5, 0.5), o.id, r * 0.12, true); stroke(2.2);
      inkPath([[x - r * 0.4, y - r * 0.18], [x + r * 0.4, y - r * 0.2]], o.id + 2, 0.8 * S); stroke(1.5);
      inkPath([[x - r * 0.4, y + r * 0.12], [x + r * 0.2, y + r * 0.1]], o.id + 3, 0.8 * S); stroke(1.5);
      break;
    case T_ROSE:
      inkBlob(x, y, r * 0.95, o.id, BONE, 0.9, 1, 2);
      inkBlob(x, y, r * 0.42, o.id + 5, '#c8c0ac', 0.9, 1, 1.6);
      inkPath([[x, y + r * 0.9], [x + r * 0.2, y + r * 1.9]], o.id + 6, 1.2 * S); stroke(2, '#6f8f74');
      break;
    case T_REDROSE:
      glow(x, y, r * 3.2, RED, 0.5);
      for (var i = 0; i < 5; i++) {
        var a = i / 5 * 6.2832 + t;
        inkBlob(x + Math.cos(a) * r * 0.5, y + Math.sin(a) * r * 0.5, r * 0.55, o.id + i, RED, 0.92, 1, 1.8);
      }
      inkBlob(x, y, r * 0.42, o.id + 9, '#e05a70', 0.95, 1, 1.8);
      break;
    case T_GOLD:
      glow(x, y, r * 3.6, GOLD, 0.6);
      for (var i2 = 0; i2 < 6; i2++) {
        var a2 = i2 / 6 * 6.2832 + t * 1.4;
        inkBlob(x + Math.cos(a2) * r * 0.55, y + Math.sin(a2) * r * 0.55, r * 0.6, o.id + i2, GOLD, 0.95, 1, 1.8);
      }
      inkBlob(x, y, r * 0.45, o.id + 19, '#fff0c0', 1, 1, 1.8);
      break;
    case T_COIN:
      inkBlob(x, y, r, o.id, GOLD, 0.95, 1, 2.2);
      inkBlob(x, y, r * 0.55, o.id + 3, '#d8a84a', 0.9, 1, 1.5);
      break;
    case T_THORN:
      var th = [[x, y - r * 1.25], [x + r * 0.78, y + r * 0.95], [x - r * 0.78, y + r * 0.95]];
      inkPath(th, o.id + 1, r * 0.14, true);
      ctx.save(); ctx.translate(r * 0.1, r * 0.1); wash('#5a4336', 0.92); ctx.restore();
      inkPath(th, o.id, r * 0.14, true); stroke(2.2);
      inkPath([[x - r * 0.3, y + r * 0.2], [x + r * 0.1, y - r * 0.5]], o.id + 4, 0.9 * S); stroke(1.4, BONE);
      break;
    case T_ROCK:
      var n = 8, pr = [];
      for (var k = 0; k < n; k++) {
        var aa = k / n * 6.2832;
        var rr = r * (0.78 + hash(o.id * 13 + k, 3) * 0.45);
        pr.push([x + Math.cos(aa) * rr, y + Math.sin(aa) * rr]);
      }
      inkPath(pr, o.id + 1, r * 0.12, true);
      ctx.save(); ctx.translate(r * 0.12, r * 0.12); wash('#4b4a46', 0.95); ctx.restore();
      inkPath(pr, o.id, r * 0.12, true); stroke(2.3);
      inkPath([[x - r * 0.35, y - r * 0.1], [x + r * 0.05, y + r * 0.25]], o.id + 7, 0.9 * S); stroke(1.4, '#6d6c66');
      break;
    case T_SHEEP:
      inkBlob(x, y, r, o.id, CREAM, 0.96, 0.82, 2.2);
      inkBlob(x - r * 0.9, y - r * 0.25, r * 0.44, o.id + 2, BONE, 0.96, 1, 2);
      ctx.fillStyle = INK;
      ctx.beginPath(); ctx.arc(x - r * 1.0, y - r * 0.3, 1.5 * S, 0, 6.2832); ctx.fill();
      for (var s2 = -1; s2 <= 1; s2 += 2) {
        inkPath([[x + s2 * r * 0.4, y + r * 0.6], [x + s2 * r * 0.45, y + r * 1.1]], o.id + 11 + s2, 1 * S);
        stroke(2);
      }
      break;
    case T_CATER:
      for (var ci = 0; ci < 4; ci++) {
        inkBlob(x + (ci - 1.5) * r * 0.46, y + Math.sin(t * 6 + ci) * r * 0.16,
                r * (0.42 - ci * 0.03), o.id + ci, ci === 0 ? '#7a9a52' : '#92b35e', 0.95, 1, 1.7);
      }
      inkPath([[x - r * 0.68, y - r * 0.3], [x - r * 0.84, y - r * 0.62]], o.id + 9, 0.7 * S); stroke(1.5);
      inkPath([[x - r * 0.52, y - r * 0.32], [x - r * 0.5, y - r * 0.66]], o.id + 10, 0.7 * S); stroke(1.5);
      break;
    case T_FLY:
      var flap = 0.74 + Math.abs(Math.sin(t * 9)) * 0.42;
      for (var sfi = -1; sfi <= 1; sfi += 2) {
        ctx.save();
        ctx.translate(x, y); ctx.scale(sfi * flap, 1); ctx.translate(-x, -y);
        inkPath([[x, y], [x + r * 0.5, y - r * 1.05], [x + r * 1.15, y - r * 0.4],
                 [x + r * 0.95, y + r * 0.5], [x + r * 0.3, y + r * 0.45]], o.id + (sfi + 2), r * 0.1, true);
        wash('#c98fc0', 0.92); stroke(1.9);
        inkBlob(x + r * 0.72, y - r * 0.4, r * 0.2, o.id + 20 + sfi, '#f2d9a0', 0.9, 1, 0);
        ctx.restore();
      }
      inkPath([[x, y - r * 0.6], [x, y + r * 0.5]], o.id + 6, 0.8 * S); stroke(2.2);
      inkPath([[x - r * 0.1, y - r * 0.6], [x - r * 0.35, y - r]], o.id + 7, 0.6 * S); stroke(1.3);
      inkPath([[x + r * 0.1, y - r * 0.6], [x + r * 0.35, y - r]], o.id + 8, 0.6 * S); stroke(1.3);
      break;
    case T_SEED:
      var sd = circlePts(x, y, r * 0.8, 9, 1.25);
      inkPath(sd, o.id + 1, r * 0.14, true);
      ctx.save(); ctx.translate(r * 0.1, r * 0.1); wash('#4a3a2e', 0.95); ctx.restore();
      inkPath(sd, o.id, r * 0.14, true); stroke(2.2);
      for (var sp2 = 0; sp2 < 5; sp2++) {
        var sa = sp2 / 5 * 6.2832;
        inkPath([[x + Math.cos(sa) * r * 0.7, y + Math.sin(sa) * r * 0.85],
                 [x + Math.cos(sa) * r * 1.2, y + Math.sin(sa) * r * 1.4]], o.id + 30 + sp2, 0.7 * S);
        stroke(1.6, '#3a2a22');
      }
      inkPath([[x - r * 0.2, y - r * 0.2], [x + r * 0.1, y + r * 0.3]], o.id + 40, 0.6 * S);
      stroke(1.3, '#6b5a46');
      /* already sprouting — that is the warning */
      inkPath([[x, y - r * 0.7], [x + r * 0.1, y - r * 1.5]], o.id + 41, 0.7 * S);
      stroke(2.2, '#7fbf62');
      inkBlob(x + r * 0.42, y - r * 1.5, r * 0.3, o.id + 42, '#7fbf62', 0.95, 0.7, 1.5);
      inkBlob(x - r * 0.3, y - r * 1.68, r * 0.26, o.id + 43, '#9ad07a', 0.95, 0.7, 1.5);
      break;
    case T_DOME:
      glow(x, y, r * 2.6, '#bfe4ea', 0.4);
      var dm = circlePts(x, y - r * 0.2, r * 1.05, 16, 1);
      inkPath(dm.filter(function (q) { return q[1] <= y - r * 0.15; }), o.id, r * 0.08);
      stroke(2.4, '#d8f0f4');
      inkPath([[x - r * 1.15, y - r * 0.12], [x + r * 1.15, y - r * 0.12]], o.id + 2, 0.9 * S);
      stroke(2.4, CREAM);
      ctx.globalAlpha = 0.22; ctx.fillStyle = '#cfeaf0';
      ctx.beginPath(); ctx.arc(x, y - r * 0.2, r, Math.PI, 0); ctx.fill(); ctx.globalAlpha = 1;
      inkBlob(x, y - r * 0.45, r * 0.26, o.id + 5, RED, 0.9, 1, 1.4);
      break;
    case T_WATCH:
      glow(x, y, r * 2.4, GOLD, 0.35);
      inkBlob(x, y, r * 0.92, o.id, '#e8c878', 0.96, 1, 2.2);
      inkBlob(x, y, r * 0.68, o.id + 2, CREAM, 0.96, 1, 1.6);
      inkPath([[x, y], [x, y - r * 0.46]], o.id + 3, 0.5 * S); stroke(1.8, INK);
      inkPath([[x, y], [x + r * 0.34, y + r * 0.12]], o.id + 4, 0.5 * S); stroke(1.8, INK);
      inkPath([[x - r * 0.2, y - r * 0.95], [x + r * 0.2, y - r * 0.95]], o.id + 5, 0.6 * S);
      stroke(2.4, '#c8a858');
      break;
    case T_SUN:
      glow(x, y, r * 4.2, '#ffb470', 0.55);
      for (var ry2 = 0; ry2 < 9; ry2++) {
        var ra = ry2 / 9 * 6.2832 + t * 0.5;
        inkPath([[x + Math.cos(ra) * r * 1.1, y + Math.sin(ra) * r * 1.1],
                 [x + Math.cos(ra) * r * 1.7, y + Math.sin(ra) * r * 1.7]], o.id + 50 + ry2, 1 * S);
        stroke(2.2, '#f0a860');
      }
      inkBlob(x, y, r * 0.95, o.id, '#f6b26b', 0.96, 1, 2.2);
      inkBlob(x, y, r * 0.5, o.id + 3, '#ffd9a0', 0.95, 1, 0);
      break;
    case T_TRINKET:
      glow(x, y, r * 3, CREAM, 0.4);
      /* a little parachute, because it has to land safely */
      inkPath([[x - r * 1.2, y - r * 0.4], [x, y - r * 1.9], [x + r * 1.2, y - r * 0.4]], o.id, 1.4 * S);
      stroke(2.2, CREAM);
      inkPath([[x - r * 1.2, y - r * 0.4], [x, y + r * 0.2]], o.id + 1, 1 * S); stroke(1.5, CREAM);
      inkPath([[x + r * 1.2, y - r * 0.4], [x, y + r * 0.2]], o.id + 2, 1 * S); stroke(1.5, CREAM);
      ctx.save();
      ctx.translate(x, y + r * 0.95); ctx.scale(0.62, 0.62); ctx.translate(-x, -(y + r * 0.95));
      drawTrinket(o.kind, x, y + r * 1.4, 1, t);
      ctx.restore();
      break;
  }
  ctx.restore();
}

/* ============================ nights ===================================== */
/* each night changes how the game is played, not just how it looks */
var NIGHTS = [
  { key: 'starfall', name: 'The Starfall', sub: 'catch, then water her', dur: 42,
    tint: null, table: [[T_HEART, 54], [T_STAR, 22], [T_CATER, 8], [T_THORN, 11], [T_ROCK, 5]] },
  { key: 'lamp', name: 'The Lamplighter', sub: 'the light keeps going out', dur: 48,
    tint: '#101c2e', dark: true,
    table: [[T_HEART, 46], [T_STAR, 22], [T_CATER, 6], [T_SEED, 6], [T_THORN, 14], [T_ROCK, 6]] },
  { key: 'money', name: 'The Businessman', sub: 'he owns the stars now', dur: 48,
    tint: '#1a2b33', coins: true,
    table: [[T_HEART, 36], [T_STAR, 12], [T_COIN, 22], [T_CATER, 6], [T_SEED, 6], [T_THORN, 12], [T_ROCK, 6]] },
  { key: 'roses', name: 'Five Thousand Roses', sub: 'one of them is yours', dur: 48,
    tint: '#2a2130', roses: true,
    table: [[T_ROSE, 50], [T_HEART, 20], [T_STAR, 6], [T_CATER, 5], [T_SEED, 7], [T_THORN, 10], [T_ROCK, 5]] },
  { key: 'fox', name: 'The Fox', sub: 'stand still', dur: 34,
    tint: '#2b2a22', quiet: true, table: [[T_HEART, 100]] }
];

function pick(table) {
  var tot = 0, i;
  for (i = 0; i < table.length; i++) tot += table[i][1];
  var r = Math.random() * tot;
  for (i = 0; i < table.length; i++) { r -= table[i][1]; if (r <= 0) return table[i][0]; }
  return table[0][0];
}
function annivInfo() {
  var a = cfg('anniversary', null);
  if (!a) return null;
  var d = new Date(), m = d.getMonth() + 1;
  if (d.getDate() !== a.day) return null;
  var months = a.year ? ((d.getFullYear() - a.year) * 12 + (m - a.month)) : 0;
  if (m === a.month) return { kind: 'year', months: months, years: a.year ? d.getFullYear() - a.year : 0 };
  if (a.monthly && months > 0) return { kind: 'month', months: months };
  return null;
}
function isAnniversary() { return !!annivInfo(); }
function fragmentList() { var f = cfg('fragments', []); return (f && f.length) ? f : []; }

/* ============================ game state ================================= */
var G = {
  screen: 'menu',           /* menu play over finale planet sketch */
  mode: 'journey',
  t: 0, score: 0, water: 0, combo: 0, best: 0,
  nightIdx: 0, nightT: 0, nightDone: false, bannerT: 0, loop: 0,
  objs: [], parts: [], pops: [], rings: [], flyers: [], steps: [], baobabs: [], bid: 0, oid: 0,
  punch: 0, roseHit: 0, shield: 0, slowT: 0, sunsetT: 0, sunsets: 0,
  spawnT: 0, dark: 0, shake: 0, flash: 0, red: 0,
  prince: null, roseX: 0, bloom: 0, pour: null, fox: null,
  foxTamed: false, foxTimer: 0, stillT: 0,
  pending: [], hint: 0, roseSay: '', roseSayT: 0, over: null, lastHeart: null, sel: 0, lastScreen: '', noteStart: 0,
  finaleT: 0, caughtTrinkets: [], caughtFrags: [], audit: null
};

function newPrince() {
  var sc = [];
  for (var i = 0; i < 9; i++) sc.push({ x: W / 2, y: groundY(W / 2) - 40 * S });
  return { x: W / 2, vx: 0, target: W / 2, walk: 0, water: 0, scarf: sc, hurt: 0, locked: 0,
           squash: 0, canPop: 0 };
}

function startRun(mode) {
  audioInit();
  layoutGround();
  G.mode = mode;
  G.screen = 'play';
  G.t = 0; G.score = 0; G.water = 0; G.combo = 0; G.best = 0;
  G.nightIdx = 0; G.nightT = 0; G.loop = 0; G.nightDone = false;
  G.objs = []; G.parts = []; G.pops = []; G.rings = []; G.flyers = []; G.steps = []; G.baobabs = []; G.bid = 0;
  G.punch = 0; G.roseHit = 0; G.shield = 0; G.slowT = 0; G.sunsetT = 0; G.sunsets = 0;
  G.spawnT = 1.1; G.dark = 0; G.shake = 0; G.flash = 0; G.red = 0;
  G.prince = newPrince();
  G.roseX = W * 0.5;
  G.bloom = 0.12;
  G.pour = null; G.fox = null; G.foxTamed = false; G.foxTimer = 14 + Math.random() * 10;
  G.caughtTrinkets = []; G.caughtFrags = []; G.audit = null; G.lastHeart = null;
  G.bannerT = 2.6;
  G.hint = save.runs < 1 ? 7 : 0;
  G.anniv = isAnniversary(); G.annivDone = false;
  musicNight = 0; musicStep = 0;
  sfx.night();
  save.runs++; writeSave();
}

function night() {
  if (G.mode === 'journey') return NIGHTS[Math.min(G.nightIdx, NIGHTS.length - 1)];
  return NIGHTS[G.nightIdx % NIGHTS.length];
}
function difficulty() {
  var base = G.mode === 'journey' ? G.nightIdx : (G.nightIdx + G.loop * NIGHTS.length);
  return base + G.nightT / Math.max(1, night().dur);
}

/* ============================ feedback =================================== */
function pop(str, x, y, col, size) {
  var hw = textW(str, size || 15) / 2 + 12 * S;
  var minY = (G.bannerT > 0) ? H * 0.48 : 24 * S;
  G.pops.push({ s: str, x: clamp(x, hw, W - hw), y: Math.max(y, minY),
                c: col || CREAM, t: 0, life: 1.15, size: size || 15 });
}
function burst(x, y, col, n, spd, shape) {
  n = n || 10;
  for (var i = 0; i < n; i++) {
    var a = Math.random() * 6.2832, v = (spd || 110) * (0.4 + Math.random()) * S;
    G.parts.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 40 * S,
                   r: (1.4 + Math.random() * 2.6) * S, c: col, t: 0, life: 0.5 + Math.random() * 0.5,
                   g: 320, shape: shape || null, rot: Math.random() * 6.28, spin: (Math.random() - 0.5) * 9 });
  }
}
/* an expanding ink ring — the signature of a catch */
function ring(x, y, col, r0, r1, life, w) {
  G.rings.push({ x: x, y: y, c: col, r0: r0 * S, r1: r1 * S, t: 0, life: life || 0.42, w: (w || 2.6) * S });
}
/* a drop that flies from what she caught into the watering can */
function flyer(x, y, col, shape) {
  G.flyers.push({ sx: x, sy: y, x: x, y: y, c: col, shape: shape || 'drop',
                  t: 0, life: 0.42 + Math.random() * 0.1, arc: (Math.random() - 0.5) * 60 });
}
function canPoint() {
  var p = G.prince, u = 21 * S;
  return { x: p.x + u * 0.96, y: groundY(p.x) - u * 2.0 - u * 0.12 };
}
function punch(v) { G.punch = Math.min(1.4, G.punch + v); }

/* ============================ input ====================================== */
var ptr = { down: false, x: 0, anchor: 0, moved: 0, id: -1 };
var keys = {};
function cpos(e) {
  var r = canvas.getBoundingClientRect();
  return { x: e.clientX - r.left, y: e.clientY - r.top };
}
function onDown(e) {
  audioInit();
  var p = cpos(e);
  if (G.screen !== 'play') { uiTap(p.x, p.y); return; }
  if (hitSoundBtn(p.x, p.y)) return;
  ptr.down = true; ptr.id = e.pointerId; ptr.x = p.x; ptr.moved = 0;
  ptr.anchor = G.prince.x - p.x;
}
function onMove(e) {
  if (!ptr.down || (ptr.id !== -1 && e.pointerId !== ptr.id)) return;
  var p = cpos(e);
  ptr.moved += Math.abs(p.x - ptr.x);
  ptr.x = p.x;
  if (G.screen === 'play') G.prince.target = clamp(p.x + ptr.anchor, 0, W);
}
function onUp(e) {
  if (ptr.id !== -1 && e.pointerId !== ptr.id) return;
  /* a quick tap with no drag: walk to where she tapped */
  if (G.screen === 'play' && ptr.down && ptr.moved < 8 * S) G.prince.target = clamp(ptr.x, 0, W);
  ptr.down = false; ptr.id = -1;
}
canvas.addEventListener('pointerdown', onDown);
canvas.addEventListener('pointermove', onMove);
canvas.addEventListener('pointerup', onUp);
canvas.addEventListener('pointercancel', onUp);
canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });
document.addEventListener('gesturestart', function (e) { e.preventDefault(); });
var KEYNAV = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -1, ArrowDown: 1,
               a: -1, d: 1, A: -1, D: 1 };
var kb = false;                 /* a keyboard has been used at least once */
function moveSel(step) {
  if (!buttons.length) return;
  var n = buttons.length, i = G.sel;
  for (var k = 0; k < n; k++) {
    i = (i + step + n) % n;
    if (!buttons[i].dim) { G.sel = i; sfx.ui(); return; }
  }
}
window.addEventListener('keydown', function (e) {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  var k = e.key;
  if (KEYNAV[k] !== undefined || k === ' ' || k === 'Enter' || k === 'Escape') e.preventDefault();
  if (e.repeat && (k === ' ' || k === 'Enter')) return;
  if (!kb && (KEYNAV[k] !== undefined || k === ' ' || k === 'Enter')) { kb = true; audioInit(); }
  keys[k] = true;
  if (G.screen === 'play') return;
  if (k === 'Escape') {
    if (G.screen === 'planet' || G.screen === 'letter' || G.screen === 'over') {
      sfx.ui(); G.screen = 'menu'; musicOn = true; G.sel = 0;
    }
    return;
  }
  if (KEYNAV[k] !== undefined) { moveSel(KEYNAV[k]); return; }
  if (k === ' ' || k === 'Enter') uiTap(-1, -1);
});
window.addEventListener('keyup', function (e) { keys[e.key] = false; });
window.addEventListener('blur', function () { keys = {}; });
function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }

/* ============================ update ===================================== */
function grownCount() {
  var n = 0;
  for (var i = 0; i < G.baobabs.length; i++) if (G.baobabs[i].growth >= 1) n++;
  return n;
}
function sprout(x) {
  /* a missed heart becomes a seed, and a seed becomes a baobab */
  for (var i = 0; i < G.baobabs.length; i++) {
    if (Math.abs(G.baobabs[i].x - x) < 34 * S) {
      G.baobabs[i].growth = Math.min(1, G.baobabs[i].growth + 0.24);
      G.baobabs[i].pulse = 1;
      sfx.seed();
      if (G.baobabs[i].growth >= 1) pop('a baobab!', G.baobabs[i].x, groundY(x) - 110 * S, RED, 16);
      return;
    }
  }
  G.baobabs.push({ x: clamp(x, 26 * S, W - 26 * S), growth: 0.14, id: G.bid++, pulse: 1 });
  sfx.seed();
}

function updatePrince(dt) {
  var p = G.prince;
  /* arrows (or A/D) walk at full speed while held, and stop dead on release */
  var kdir = ((keys.ArrowLeft || keys.a || keys.A) ? -1 : 0) +
             ((keys.ArrowRight || keys.d || keys.D) ? 1 : 0);
  if (kdir) { p.target = clamp(p.x + kdir * 300 * S, 0, W); p.keyHeld = true; }
  else if (p.keyHeld) { p.keyHeld = false; p.target = p.x; }

  if (p.locked > 0) { p.locked -= dt; p.vx *= 0.8; }
  else {
    var dx = p.target - p.x;
    var want = clamp(dx * 9, -340 * S, 340 * S);
    /* saplings slow you down, grown baobabs are walls */
    var slow = 1, lo = 16 * S, hi = W - 16 * S, pad = 19 * S;
    for (var i = 0; i < G.baobabs.length; i++) {
      var b = G.baobabs[i], d = b.x - p.x;
      if (b.growth >= 1) {
        if (d > 0) hi = Math.min(hi, b.x - pad);
        else lo = Math.max(lo, b.x + pad);
      } else if (Math.abs(d) < 24 * S) slow = Math.min(slow, 1 - b.growth * 0.6);
    }
    if (lo > hi) { lo = 16 * S; hi = W - 16 * S; }     /* never trap her in nothing */
    p.vx += (want * slow - p.vx) * Math.min(1, dt * 12);
    var nx = clamp(p.x + p.vx * dt, 16 * S, W - 16 * S);
    var cx2 = clamp(nx, lo, hi);
    if (cx2 !== nx) p.vx *= 0.3;
    p.x = cx2;
  }
  p.walk += dt * (0.4 + Math.abs(p.vx) / (120 * S));
  if (p.hurt > 0) p.hurt -= dt;
  /* she leaves footprints, and they fade */
  p.stepT = (p.stepT || 0) - dt;
  if (Math.abs(p.vx) > 70 * S && p.stepT <= 0) {
    p.stepT = 0.2;
    G.steps.push({ x: p.x + (Math.random() - 0.5) * 6 * S, t: 0, d: Math.sign(p.vx) });
    if (G.steps.length > 22) G.steps.shift();
  }

  /* scarf follows with delay; its tip can catch */
  moveScarf(p, dt);
}

var SEG = 5.6;
function moveScarf(p, dt) {
  /* anchored at the neck, each link looser and heavier than the one before,
     so it curves instead of pointing */
  var hx = p.x - Math.sign(p.vx || 1) * 5 * S, hy = groundY(p.x) - 52 * S;
  p.scarf[0].x = hx; p.scarf[0].y = hy;
  for (var k = 1; k < p.scarf.length; k++) {
    var a = p.scarf[k], b = p.scarf[k - 1];
    var stiff = Math.max(3, 13 - k * 1.1);
    a.x += (b.x - a.x) * Math.min(1, dt * stiff) - p.vx * dt * 0.075;
    a.y += (b.y - a.y) * Math.min(1, dt * stiff * 0.62) + (16 + k * 7) * S * dt;
    var dx = a.x - b.x, dy = a.y - b.y, d = Math.sqrt(dx * dx + dy * dy) || 1;
    var max = SEG * S;
    if (d > max) { a.x = b.x + dx / d * max; a.y = b.y + dy / d * max; }
    if (a.y > groundY(a.x) - 4 * S) a.y = groundY(a.x) - 4 * S;
  }
}
/* drawn as a tapered ribbon with a ripple down its length */
function drawScarf(p, dt, dark) {
  var n = p.scarf.length, L = [], R = [];
  var wind = Math.min(1, Math.abs(p.vx) / (260 * S));
  for (var i = 0; i < n; i++) {
    var c = p.scarf[i];
    var a = p.scarf[Math.max(0, i - 1)], b = p.scarf[Math.min(n - 1, i + 1)];
    var dx = b.x - a.x, dy = b.y - a.y, d = Math.sqrt(dx * dx + dy * dy) || 1;
    var nx = -dy / d, ny = dx / d;
    var ripple = Math.sin(G.t * 7 - i * 0.95) * (1 + wind * 3.4) * S * (i / n);
    var hw = (4.6 - i * 0.44) * S;
    if (hw < 1.1 * S) hw = 1.1 * S;
    var cx = c.x + nx * ripple + jx(31, i, 0.8 * S);
    var cy = c.y + ny * ripple + jy(31, i, 0.8 * S);
    L.push([cx + nx * hw, cy + ny * hw]);
    R.push([cx - nx * hw, cy - ny * hw]);
  }
  var pts = L.concat(R.reverse());
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (var k = 1; k < pts.length - 1; k++) {
    ctx.quadraticCurveTo(pts[k][0], pts[k][1],
                         (pts[k][0] + pts[k + 1][0]) / 2, (pts[k][1] + pts[k + 1][1]) / 2);
  }
  ctx.closePath();
  ctx.fillStyle = dark ? 'rgba(160,62,82,0.6)' : '#b8475c';
  ctx.fill();
  ctx.lineWidth = 1.6 * S;
  ctx.strokeStyle = dark ? 'rgba(244,234,214,0.35)' : '#8e2b3e';
  ctx.stroke();
}
function catchPoints() {
  var p = G.prince;
  var gy = groundY(p.x);
  var pts = [{ x: p.x, y: gy - 48 * S, r: 37 * S, grace: false }];
  if (Math.abs(p.vx) > 150 * S) {
    var tip = p.scarf[p.scarf.length - 1];
    pts.push({ x: tip.x, y: tip.y, r: 19 * S, grace: true });
  }
  return pts;
}

function addWater(n) {
  var p = G.prince;
  var before = p.water;
  p.water = Math.min(CAN_MAX, p.water + n);
  var spilled = (before + n) - p.water;
  if (spilled > 0) G.score += Math.round(spilled * 4);
  return spilled;
}

function onCatch(o, grace) {
  var p = G.prince;
  G.combo++;
  if (G.combo > G.best) G.best = G.combo;
  var mult = multiplier();
  switch (o.type) {
    case T_HEART: case T_STAR:
      var sp = addWater(1);
      sfx.catch1(G.combo);
      var hc = o.type === T_HEART ? '#e5839a' : GOLD;
      ring(o.x, o.y, hc, 6, 34 + Math.min(14, G.combo), 0.4, 2.6);
      burst(o.x, o.y, hc, 7, 120, o.type === T_HEART ? 'heart' : 'star');
      burst(o.x, o.y, CREAM, 5, 70);
      if (sp === 0) flyer(o.x, o.y, '#6fb8c8');
      p.squash = 1; punch(0.3);
      if (sp > 0) pop('the can is full', o.x, o.y - 18 * S, BONE, 12);
      break;
    case T_NOTE:
      sfx.spark();
      ring(o.x, o.y, CREAM, 6, 58, 0.6, 3);
      ring(o.x, o.y, GOLD, 6, 38, 0.45, 2);
      burst(o.x, o.y, CREAM, 16, 150, 'star');
      burst(o.x, o.y, GOLD, 8, 90);
      flyer(o.x, o.y, '#6fb8c8');
      addWater(1);
      p.squash = 1; punch(0.7); G.flash = 0.2;
      collectFragment(o.frag);
      break;
    case T_REDROSE:
      sfx.spark(); sfx.pour();
      addWater(4);
      G.score += Math.round(120 * mult);
      pop('hers!  +' + Math.round(120 * mult), o.x, o.y - 20 * S, RED, 20);
      ring(o.x, o.y, RED, 8, 92, 0.65, 4);
      ring(o.x, o.y, '#e05a70', 8, 56, 0.45, 2.5);
      burst(o.x, o.y, RED, 22, 180, 'heart');
      burst(o.x, o.y, '#e5839a', 14, 110);
      for (var fq = 0; fq < 4; fq++) flyer(o.x, o.y, '#6fb8c8');
      p.squash = 1; punch(1.2); G.shake = 0.5;
      G.flash = 0.5;
      break;
    case T_GOLD:
      sfx.spark(); sfx.pour();
      addWater(CAN_MAX);
      G.score += 500;
      pop('happy anniversary  +500', o.x, o.y - 22 * S, GOLD, 20);
      ring(o.x, o.y, GOLD, 10, 130, 0.9, 5);
      ring(o.x, o.y, CREAM, 10, 86, 0.7, 3);
      ring(o.x, o.y, '#fff0c0', 10, 50, 0.5, 2);
      burst(o.x, o.y, GOLD, 34, 220, 'star');
      burst(o.x, o.y, CREAM, 18, 140);
      p.squash = 1; punch(1.4); G.shake = 0.7;
      G.flash = 0.8;
      break;
    case T_COIN:
      G.score += 30;
      if (p.water > 0) { p.water--; pop('+30  -1 water', o.x, o.y - 18 * S, GOLD, 13); }
      else pop('+30', o.x, o.y - 18 * S, GOLD, 13);
      if (G.audit) G.audit.coins++;
      sfx.catch1(2);
      ring(o.x, o.y, GOLD, 5, 26, 0.3, 2);
      burst(o.x, o.y, GOLD, 8);
      p.squash = 0.6; punch(0.2);
      break;
    case T_SHEEP:
      sfx.spark(); addWater(3);
      pop('a sheep', o.x, o.y - 20 * S, CREAM, 16);
      ring(o.x, o.y, CREAM, 6, 44, 0.5, 3);
      burst(o.x, o.y, CREAM, 14);
      for (var sq = 0; sq < 3; sq++) flyer(o.x, o.y, '#6fb8c8');
      p.squash = 1; punch(0.6);
      break;
    case T_TRINKET:
      sfx.spark();
      keepTrinket(o.kind);
      G.score += 60;
      ring(o.x, o.y, CREAM, 8, 76, 0.7, 3.4);
      ring(o.x, o.y, MINT, 8, 46, 0.5, 2);
      burst(o.x, o.y, CREAM, 24, 170, 'star');
      p.squash = 1; punch(0.9);
      break;
    case T_CATER:
      addWater(1); G.score += 6;
      sfx.catch1(G.combo);
      ring(o.x, o.y, '#92b35e', 5, 28, 0.35, 2);
      burst(o.x, o.y, '#92b35e', 6, 90);
      flyer(o.x, o.y, '#6fb8c8');
      p.squash = 0.8; punch(0.25);
      break;
    case T_FLY:
      addWater(3); G.score += Math.round(45 * mult);
      sfx.spark();
      ring(o.x, o.y, '#c98fc0', 6, 58, 0.55, 3);
      burst(o.x, o.y, '#c98fc0', 16, 150, 'star');
      for (var bq = 0; bq < 3; bq++) flyer(o.x, o.y, '#6fb8c8');
      pop('a butterfly  +' + Math.round(45 * mult), o.x, o.y - 22 * S, '#e2aed8', 16);
      p.squash = 1; punch(0.8);
      break;
    case T_SEED:
      G.score += 15;
      sfx.catch1(1);
      ring(o.x, o.y, '#6b5a46', 5, 30, 0.4, 2.4);
      burst(o.x, o.y, '#4a3a2e', 9, 110);
      pop('not today', o.x, o.y - 20 * S, MINT, 13);
      p.squash = 0.7; punch(0.3);
      break;
    case T_DOME:
      G.shield = 1;
      sfx.spark();
      ring(o.x, o.y, '#d8f0f4', 8, 80, 0.7, 3.4);
      burst(o.x, o.y, '#bfe4ea', 18, 150);
      pop('under glass', o.x, o.y - 24 * S, '#bfe4ea', 17);
      pop('one thorn cannot touch you', o.x, o.y - 44 * S, BONE, 11);
      p.squash = 1; punch(0.9); G.flash = 0.3;
      break;
    case T_WATCH:
      G.slowT = 6;
      sfx.spark();
      ring(o.x, o.y, GOLD, 8, 90, 0.8, 3.4);
      burst(o.x, o.y, GOLD, 18, 140, 'star');
      pop('the sky slows down', o.x, o.y - 24 * S, GOLD, 17);
      p.squash = 1; punch(0.9);
      if (AC && save.sound) { var tw = now(); [784, 659, 523, 392].forEach(function (f, i) {
        tone(f, tw + i * 0.13, 0.9, 'sine', 0.1); }); }
      break;
    case T_SUN:
      G.sunsetT = 6;
      G.sunsets = (G.sunsets || 0) + 1;
      G.score += Math.round(90 * mult);
      addWater(2);
      sfx.spark(); sfx.pour();
      ring(o.x, o.y, '#ffb470', 10, 130, 0.9, 4.5);
      ring(o.x, o.y, '#ffd9a0', 10, 80, 0.6, 2.6);
      burst(o.x, o.y, '#f6b26b', 26, 190);
      pop('sunset ' + G.sunsets + (G.sunsets === 44 ? ' — forty-four' : '') +
          '   +' + Math.round(90 * mult), o.x, o.y - 26 * S, '#ffc890', 18);
      p.squash = 1; punch(1.2); G.flash = 0.45;
      break;
    case T_ROSE:
      G.combo = Math.max(0, G.combo - 1);
      pop('not hers', o.x, o.y - 16 * S, BONE, 12);
      burst(o.x, o.y, BONE, 6);
      sfx.catch1(0);
      break;
  }
  if (G.combo > 0 && G.combo % 5 === 0 && GOOD[o.type]) {
    var pm = multiplier();
    ring(p.x, groundY(p.x) - 48 * S, MINT, 18, 104, 0.6, 3);
    pop(pm > 1 ? 'x' + pm : G.combo + ' in a row', p.x, groundY(p.x) - 104 * S, MINT, 19);
    burst(p.x, groundY(p.x) - 48 * S, MINT, 12, 130, 'star');
    punch(0.7);
    if (AC && save.sound) {
      var t0 = now();
      [660, 880, 1100].forEach(function (f, i) { tone(f, t0 + i * 0.06, 0.4, 'sine', 0.09); });
    }
  }
  if (grace && GOOD[o.type] && o.type !== T_TRINKET) {
    G.score += 15;
    pop('scarf!  +15', o.x, o.y - 34 * S, MINT, 13);
    burst(o.x, o.y, MINT, 6, 80);
  }
  if (G.audit && GOOD[o.type] && o.type !== T_COIN) G.audit.hearts++;
}

function onHit(o) {
  var p = G.prince;
  if (p.hurt > 0) return;
  if (G.shield) {
    G.shield = 0;
    p.hurt = 0.7;
    sfx.ui();
    ring(p.x, groundY(p.x) - 48 * S, '#d8f0f4', 20, 96, 0.6, 3.4);
    burst(o.x, o.y, '#bfe4ea', 20, 170);
    pop('the glass held', p.x, groundY(p.x) - 110 * S, '#bfe4ea', 15);
    punch(0.8);
    return;
  }
  p.hurt = 1.0;
  G.combo = 0;
  G.shake = 1;
  sfx.bad();
  var lost = Math.ceil(p.water / 2);
  p.water -= lost;
  burst(o.x, o.y, '#6b5a4a', 16, 150);
  if (lost > 0) {
    pop('-' + lost + ' water', p.x, groundY(p.x) - 86 * S, RED, 15);
    for (var i = 0; i < lost * 3; i++) burst(p.x, groundY(p.x) - 50 * S, '#6fb8c8', 1, 90);
  }
  sprout(p.x + (Math.random() - 0.5) * 40 * S);
  if (G.foxTamed) {
    G.foxTamed = false;
    if (G.fox) G.fox.leaving = true;
    pop('the fox ran', p.x, groundY(p.x) - 120 * S, FOXC, 14);
  }
}

function multiplier() {
  return Math.min(4, 1 + Math.floor(G.combo / 5) * 0.5);
}

function doPour() {
  var p = G.prince;
  var mult = multiplier();
  var gained = Math.round(p.water * 12 * mult);
  G.score += gained;
  G.bloom = Math.min(1, G.bloom + p.water * 0.035);
  pop('+' + gained + (mult > 1 ? '   x' + mult : ''), G.roseX, groundY(G.roseX) - 110 * S, CREAM, 22);
  var ry = groundY(G.roseX) - 66 * S;
  burst(G.roseX, ry, '#6fb8c8', 22, 150, 'drop');
  burst(G.roseX, groundY(G.roseX), '#6fb8c8', 14, 110);
  ring(G.roseX, ry, '#6fb8c8', 8, 70 + gained * 0.05, 0.6, 3.4);
  ring(G.roseX, ry, CREAM, 8, 44, 0.45, 2);
  if (mult > 1) ring(G.roseX, ry, RED, 8, 100, 0.8, 2.4);
  for (var pq = 0; pq < 6; pq++) {
    burst(G.roseX + (Math.random() - 0.5) * 40 * S, ry - 20 * S, RED, 1, 60, 'heart');
  }
  G.roseHit = 1; punch(0.9);
  /* watering the planet weeds it: the largest baobab goes */
  var worst = -1, wv = -1;
  for (var i = 0; i < G.baobabs.length; i++) if (G.baobabs[i].growth > wv) { wv = G.baobabs[i].growth; worst = i; }
  if (worst >= 0) {
    burst(G.baobabs[worst].x, groundY(G.baobabs[worst].x), '#4a3a2e', 14, 130);
    G.baobabs.splice(worst, 1);
    pop('weeded', G.roseX + 60 * S, groundY(G.roseX) - 70 * S, MINT, 14);
  }
  for (var q = 0; q < G.baobabs.length; q++) {
    G.baobabs[q].growth = Math.max(0.1, G.baobabs[q].growth - 0.12);
  }
  p.water = 0;
  sfx.pour();
  G.flash = 0.25;
  if (Math.random() < 0.45) {
    var rl = cfg('roseLines', []);
    if (rl.length) { G.roseSay = rl[Math.floor(Math.random() * rl.length)]; G.roseSayT = 2.6; }
  }
}

function updatePour(dt) {
  var p = G.prince;
  var near = Math.abs(p.x - G.roseX) < 34 * S;
  var still = Math.abs(p.vx) < 30 * S;
  if (G.pour) {
    G.pour.t += dt;
    if (G.pour.stage === 0) {
      if (!near || !still || p.water <= 0) { G.pour = null; return; }
      if (G.pour.t >= 0.3) {
        G.pour = { stage: 1, t: 0, from: p.x, to: G.roseX + (p.x < G.roseX ? -38 * S : 38 * S) };
        p.locked = 1.1;
        doPour();
      }
    } else {
      if (G.pour.to !== undefined) {
        var k = Math.min(1, G.pour.t / 0.3);
        p.x = G.pour.from + (G.pour.to - G.pour.from) * (k * k * (3 - 2 * k));
      }
      if (G.pour.t > 1.15) G.pour = null;
    }
  } else if (near && still && p.water > 0 && p.locked <= 0) {
    G.pour = { stage: 0, t: 0 };
  }
}

function collectFragment(i) {
  var list = fragmentList();
  if (G.mode === 'endless') {
    var l2 = cfg('letter2', []);
    if (save.letter2 < l2.length) {
      save.letter2++;
      writeSave();
      pop('a line of the letter', G.prince.x, groundY(G.prince.x) - 130 * S, CREAM, 16);
      G.caughtFrags.push({ endless: true, text: l2[save.letter2 - 1] });
    } else {
      G.score += 80;
      pop('+80', G.prince.x, groundY(G.prince.x) - 130 * S, CREAM, 16);
    }
    return;
  }
  if (!list.length) { G.score += 50; return; }
  if (save.fragments.indexOf(i) < 0) { save.fragments.push(i); writeSave(); }
  G.caughtFrags.push({ endless: false, text: list[i], i: i });
  G.score += 40;
  G.flash = 0.35;
  pop('a note', G.prince.x, groundY(G.prince.x) - 130 * S, CREAM, 15);
}

function keepTrinket(kind) {
  if (save.trinkets.indexOf(kind) < 0) { save.trinkets.push(kind); writeSave(); }
  G.caughtTrinkets.push(kind);
  pop(trinketName(kind), G.prince.x, groundY(G.prince.x) - 140 * S, CREAM, 16);
  pop('it stays on your planet', G.prince.x, groundY(G.prince.x) - 118 * S, BONE, 12);
  G.flash = 0.4;
}
function nextTrinket() {
  for (var i = 0; i < TRINKETS.length; i++) if (save.trinkets.indexOf(TRINKETS[i]) < 0) return TRINKETS[i];
  return null;
}

/* ============================ spawning =================================== */
function spawn() {
  var n = night();
  if (n.quiet) return;
  var d = difficulty();
  var type = pick(n.table);

  /* the anniversary rose, once per run, only on the day */
  if (G.anniv && !G.annivDone && G.nightT > 8 && Math.random() < 0.02) {
    G.annivDone = true; type = T_GOLD;
  }
  /* one red rose per wave in the garden */
  else if (n.roses && Math.random() < 0.09) type = T_REDROSE;
  /* a note in a star, carrying one line of the letter */
  else if (type === T_STAR && Math.random() < 0.3) {
    var fr = pickFragment();
    if (fr !== null) { type = T_NOTE; }
  }
  else if (Math.random() < 0.012) type = T_SHEEP;
  else if (Math.random() < 0.011 && !G.shield) type = T_DOME;
  else if (Math.random() < 0.010 && G.slowT <= 0) type = T_WATCH;
  else if (Math.random() < 0.009) type = T_SUN;

  var r = (type === T_REDROSE || type === T_GOLD || type === T_SUN) ? 17 * S
        : (type === T_ROCK ? 16 * S : (type === T_SHEEP || type === T_DOME ? 15 * S
        : (type === T_CATER ? 11 * S : (type === T_FLY ? 13 * S : 14 * S))));
  var ox = 26 * S + Math.random() * (W - 52 * S);
  var o = {
    id: G.oid++, type: type, kind: null, frag: null,
    x: ox, y: -30 * S, r: r,
    vy: (92 + Math.min(112, d * 17)) * S * (0.88 + Math.random() * 0.26),
    vx: 0, rot: 0, spin: (Math.random() - 0.5) * 1.6, sway: Math.random() * 6.28,
    swayAmp: (type === T_ROSE || type === T_HEART) ? (10 + Math.random() * 14) : 4
  };
  if (type === T_NOTE) o.frag = pickFragment();
  if (type === T_ROCK) { o.vy *= 1.3; o.swayAmp = 0; }
  if (type === T_GOLD || type === T_REDROSE) o.vy *= 0.75;
  if (type === T_SHEEP) { o.vy *= 0.6; o.swayAmp = 26; }
  if (type === T_CATER) { o.vy *= 0.62; o.swayAmp = 5; o.morph = 2.4 + Math.random() * 1.6; }
  if (type === T_SEED) { o.vy *= 1.22; o.swayAmp = 3; }
  if (type === T_DOME || type === T_WATCH) { o.vy *= 0.7; o.swayAmp = 12; }
  if (type === T_SUN) { o.vy *= 0.52; o.swayAmp = 8; }

  /* Reachability. A missed heart costs her a baobab, so a heart must never be
     thrown somewhere she physically cannot reach in the time it takes to fall.
     Work out when this one lands, compare with the last one, and pull it closer
     if the walk between them is impossible. A perfect run stays possible. */
  if (o.type === T_HEART) {
    var land = G.t + (groundY(o.x) - o.y) / o.vy;
    var reach = 290 * S;                      /* honest walking speed */
    var slack = 46 * S;                       /* plus her reach */
    if (G.lastHeart) {
      var dtl = Math.max(0.12, land - G.lastHeart.land);
      var canGo = reach * dtl + slack;
      var gap = o.x - G.lastHeart.x;
      if (Math.abs(gap) > canGo) {
        o.x = clamp(G.lastHeart.x + Math.sign(gap) * canGo, 26 * S, W - 26 * S);
        land = G.t + (groundY(o.x) - o.y) / o.vy;
      }
    }
    G.lastHeart = { x: o.x, land: land };
  }
  G.objs.push(o);
}
function pickFragment() {
  if (G.mode === 'endless') {
    return (save.letter2 < cfg('letter2', []).length) ? 0 : null;
  }
  var list = fragmentList(), pool = [];
  for (var i = 0; i < list.length; i++) if (save.fragments.indexOf(i) < 0) pool.push(i);
  if (!pool.length) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}
function spawnTrinket() {
  var k = nextTrinket();
  if (!k) return;
  G.objs.push({
    id: G.oid++, type: T_TRINKET, kind: k, frag: null,
    x: 60 * S + Math.random() * (W - 120 * S), y: -40 * S, r: 15 * S,
    vy: 52 * S, vx: 0, rot: 0, spin: 0, sway: Math.random() * 6.28, swayAmp: 16
  });
  pop('something is falling', W / 2, H * 0.3, CREAM, 16);
}

/* ============================ the fox ==================================== */
function updateFox(dt) {
  var n = night();
  if (!G.fox) {
    G.foxTimer -= dt;
    if (n.quiet && G.nightT > 2 && !G.foxTamed) G.foxTimer = Math.min(G.foxTimer, 0);
    if (G.foxTimer <= 0 && !G.foxTamed) {
      var side = Math.random() < 0.5 ? -1 : 1;
      G.fox = { x: side < 0 ? -30 * S : W + 30 * S, tx: W * (0.25 + Math.random() * 0.5),
                t: 0, tame: 0, leaving: false, follow: false, cd: 0 };
      G.foxTimer = 26 + Math.random() * 16;
    }
    if (!G.fox) return;
  }
  var f = G.fox;
  f.t += dt;
  if (f.leaving) {
    f.x += (f.x < W / 2 ? -1 : 1) * 190 * S * dt;
    if (f.x < -60 * S || f.x > W + 60 * S) G.fox = null;
    return;
  }
  if (G.foxTamed) {
    /* tamed: follows a few steps behind and catches for you */
    var want = G.prince.x - Math.sign(G.prince.vx || 1) * 52 * S;
    f.x += (want - f.x) * Math.min(1, dt * 2.6);
    f.cd -= dt;
    if (f.cd <= 0) {
      var best = null, bd = 1e9;
      for (var i = 0; i < G.objs.length; i++) {
        var o = G.objs[i];
        if (!GOOD[o.type] || o.type === T_TRINKET) continue;
        var d = Math.abs(o.x - f.x);
        if (d < 86 * S && o.y > H * 0.35 && d < bd) { bd = d; best = i; }
      }
      if (best !== null) {
        var ob = G.objs[best];
        pop('the fox!', f.x, groundY(f.x) - 54 * S, FOXC, 13);
        onCatch(ob, false);
        G.objs.splice(best, 1);
        f.cd = 3.6;
      }
    }
    return;
  }
  /* untamed: walks to its spot and waits for her to be still */
  f.x += (f.tx - f.x) * Math.min(1, dt * 1.6);
  var near = Math.abs(f.x - G.prince.x) < 130 * S;
  var still = Math.abs(G.prince.vx) < 24 * S;
  if (near && still) {
    f.tame += dt;
    f.tx = G.prince.x + (f.x < G.prince.x ? -1 : 1) * Math.max(30 * S, (1 - f.tame / 1.6) * 120 * S);
    if (f.tame >= 1.6) {
      G.foxTamed = true;
      sfx.fox();
      G.score += 100;
      G.flash = 0.5;
      pop('tamed  +100', f.x, groundY(f.x) - 70 * S, FOXC, 20);
      pop('now he is yours', f.x, groundY(f.x) - 46 * S, BONE, 13);
      burst(f.x, groundY(f.x) - 30 * S, FOXC, 22, 150);
      if (night().quiet) { var k = nextTrinket(); if (k) keepTrinket(k); }
    }
  } else {
    f.tame = Math.max(0, f.tame - dt * 0.7);
    if (!near) f.tx = clamp(G.prince.x + (Math.random() < 0.5 ? -1 : 1) * 170 * S, 40 * S, W - 40 * S);
  }
  if (f.t > 26 && !G.foxTamed && !night().quiet) f.leaving = true;
}

/* ============================ night flow ================================= */
function endNight() {
  var n = night();
  var bonus = 80 + G.nightIdx * 40;
  G.score += bonus;
  if (G.audit && G.audit.coins > G.audit.hearts) {
    var cut = Math.round(G.score * 0.12);
    G.score -= cut;
    pop('audited:  -' + cut, W / 2, H * 0.42, GOLD, 22);
  }
  G.audit = null;
  spawnTrinket();
  if (G.mode === 'journey' && G.nightIdx >= NIGHTS.length - 1) {
    startFinale();
    return;
  }
  G.nightIdx++;
  if (G.mode === 'endless' && G.nightIdx % NIGHTS.length === 0) G.loop++;
  if (G.nightIdx > save.bestNight) { save.bestNight = G.nightIdx; writeSave(); }
  G.nightT = 0;
  G.bannerT = 2.4;
  G.objs.length = 0;
  G.lastHeart = null;
  musicNight = G.nightIdx;
  sfx.night();
  pop('+' + bonus, W / 2, H * 0.3, CREAM, 20);
}

function startFinale() {
  G.screen = 'finale';
  G.finaleT = 0;
  G.objs.length = 0;
  G.prince.locked = 99;
  G.prince.vx = 0;
  /* step away from the rose: this is her moment, not his */
  G.finaleFrom = G.prince.x;
  G.finaleTo = G.roseX + (G.prince.x <= G.roseX ? -82 * S : 82 * S);
  save.finale = true;
  save.endless = true;
  if (G.score > save.high) save.high = G.score;
  writeSave();
  musicOn = false;
  sfx.pour();
}

function gameOver() {
  G.screen = 'over';
  G.over = { t: 0 };
  sfx.over();
  if (G.mode === 'endless') {
    if (G.score > save.highEndless) { save.highEndless = G.score; G.over.record = true; }
  } else {
    if (G.score > save.high) { save.high = G.score; G.over.record = true; }
  }
  writeSave();
}

/* ============================ main update ================================ */
function update(dt) {
  G.t += dt;
  boil = Math.floor(G.t * 3);
  if (G.shake > 0) G.shake = Math.max(0, G.shake - dt * 2.6);
  if (G.flash > 0) G.flash = Math.max(0, G.flash - dt * 2);
  if (G.bannerT > 0) G.bannerT -= dt;
  if (G.roseSayT > 0) G.roseSayT -= dt;
  if (G.hint > 0) G.hint -= dt;

  for (var i = G.parts.length - 1; i >= 0; i--) {
    var pa = G.parts[i];
    pa.t += dt;
    pa.x += pa.vx * dt; pa.y += pa.vy * dt; pa.vy += pa.g * S * dt;
    if (pa.t > pa.life) G.parts.splice(i, 1);
  }
  for (var si = G.steps.length - 1; si >= 0; si--) {
    G.steps[si].t += dt;
    if (G.steps[si].t > 2.6) G.steps.splice(si, 1);
  }
  for (var ri = G.rings.length - 1; ri >= 0; ri--) {
    var rg = G.rings[ri]; rg.t += dt;
    if (rg.t > rg.life) G.rings.splice(ri, 1);
  }
  var cp = canPoint();
  for (var fi = G.flyers.length - 1; fi >= 0; fi--) {
    var fl = G.flyers[fi]; fl.t += dt;
    var k = Math.min(1, fl.t / fl.life), e = k * k * (3 - 2 * k);
    fl.x = fl.sx + (cp.x - fl.sx) * e;
    fl.y = fl.sy + (cp.y - fl.sy) * e - Math.sin(k * Math.PI) * (40 * S + fl.arc * S);
    if (k >= 1) {
      G.flyers.splice(fi, 1);
      if (G.prince) G.prince.canPop = 1;
      if (AC && save.sound) tone(880 + Math.random() * 180, now(), 0.1, 'sine', 0.05);
      burst(cp.x, cp.y, '#6fb8c8', 3, 50);
    }
  }
  if (G.punch > 0) G.punch = Math.max(0, G.punch - dt * 4.2);
  if (G.roseHit > 0) G.roseHit = Math.max(0, G.roseHit - dt * 2.4);
  if (G.prince) {
    if (G.prince.squash > 0) G.prince.squash = Math.max(0, G.prince.squash - dt * 5);
    if (G.prince.canPop > 0) G.prince.canPop = Math.max(0, G.prince.canPop - dt * 5);
  }
  for (var j = G.pops.length - 1; j >= 0; j--) {
    var po = G.pops[j];
    po.t += dt; po.y -= 26 * S * dt;
    if (po.t > po.life) G.pops.splice(j, 1);
  }

  if (G.screen === 'finale') { updateFinale(dt); return; }
  if (G.screen !== 'play') { G.dark = 0; return; }

  var n = night();
  G.nightT += dt;
  musicTick();

  /* the lamplighter's planet: the light goes out */
  var wantDark = 0;
  if (n.dark) {
    var ph = (G.nightT % 6.5) / 6.5;
    wantDark = ph > 0.42 ? 1 : 0;
  }
  G.dark += (wantDark - G.dark) * Math.min(1, dt * 4);
  if (n.coins && !G.audit) G.audit = { coins: 0, hearts: 0 };

  if (G.slowT > 0) G.slowT = Math.max(0, G.slowT - dt);
  if (G.sunsetT > 0) G.sunsetT = Math.max(0, G.sunsetT - dt);
  var tf = G.slowT > 0 ? 0.5 : 1;         /* the pocket watch slows the sky */

  updatePrince(dt);
  updatePour(dt);
  updateFox(dt);

  /* spawn */
  if (!n.quiet) {
    G.spawnT -= dt * tf;
    if (G.spawnT <= 0) {
      spawn();
      var d = difficulty();
      G.spawnT = Math.max(0.47, 1.05 - d * 0.058) * (0.82 + Math.random() * 0.4);
    }
  }

  /* baobabs grow */
  for (var b = 0; b < G.baobabs.length; b++) {
    var bb = G.baobabs[b];
    if (bb.growth < 1) bb.growth = Math.min(1, bb.growth + dt * 0.008);
    if (bb.pulse > 0) bb.pulse -= dt * 2;
    if (bb.growth >= 1 && Math.random() < dt * 0.55) {
      var lh = (14 + 86) * S;
      G.parts.push({ x: bb.x + (Math.random() - 0.5) * 40 * S, y: groundY(bb.x) - lh,
                     vx: (Math.random() - 0.5) * 24 * S, vy: 12 * S, r: 2.4 * S,
                     c: '#3c6b4a', t: 0, life: 2.4, g: 26,
                     shape: 'drop', rot: Math.random() * 6.28, spin: 2.2 });
    }
  }

  /* falling things */
  var cps = catchPoints();
  for (var k = G.objs.length - 1; k >= 0; k--) {
    var o = G.objs[k];
    o.sway += dt * 1.7;
    /* "one must endure a few caterpillars if one wishes to know the butterflies" */
    if (o.type === T_CATER) {
      o.morph -= dt;
      if (o.morph <= 0 && o.y < groundY(o.x) - 140 * S) {
        o.type = T_FLY; o.r = 13 * S; o.vy *= 0.5; o.swayAmp = 54; o.spin = 0;
        ring(o.x, o.y, '#c98fc0', 4, 30, 0.5, 2);
        burst(o.x, o.y, '#e2aed8', 8, 70);
      }
    }
    if (o.type === T_FLY) o.y += Math.sin(G.t * 7 + o.id) * 24 * S * dt;
    o.y += o.vy * dt * tf;
    o.x += Math.sin(o.sway) * o.swayAmp * S * dt;
    o.rot += o.spin * dt;

    var caught = false;
    for (var c = 0; c < cps.length; c++) {
      var cp = cps[c];
      var dx = o.x - cp.x, dy = o.y - cp.y;
      if (dx * dx + dy * dy < (cp.r + o.r) * (cp.r + o.r)) {
        if (BAD[o.type]) { onHit(o); }
        else { onCatch(o, cp.grace); }
        G.objs.splice(k, 1);
        caught = true;
        break;
      }
    }
    if (caught) continue;

    if (o.y - o.r > groundY(o.x) + 4 * S) {
      if (o.type === T_SEED) {
        sprout(o.x);
        if (G.baobabs.length) G.baobabs[G.baobabs.length - 1].growth = Math.max(
          G.baobabs[G.baobabs.length - 1].growth, 0.42);
        pop('it took root', o.x, groundY(o.x) - 50 * S, RED, 13);
        burst(o.x, groundY(o.x), '#4a3a2e', 10, 90);
      } else if (o.type === T_HEART) {
        /* a heart is the only thing that costs her anything */
        G.combo = 0;
        sprout(o.x);
        burst(o.x, groundY(o.x), '#4a3a2e', 6, 70);
      } else if (o.type === T_STAR || o.type === T_NOTE || o.type === T_REDROSE) {
        G.combo = Math.max(0, G.combo - 1);
        burst(o.x, groundY(o.x), BONE, 5, 60);
      } else if (o.type === T_TRINKET) {
        pop('it fell away', o.x, groundY(o.x) - 40 * S, BONE, 13);
        burst(o.x, groundY(o.x), BONE, 8, 60);
      } else {
        burst(o.x, groundY(o.x), '#5a5248', 5, 60);
      }
      G.objs.splice(k, 1);
    }
  }

  if (grownCount() >= 3) { gameOver(); return; }
  if (G.nightT >= n.dur) endNight();
}

/* ============================ finale ===================================== */
var finaleLines = [];
function updateFinale(dt) {
  G.finaleT += dt;
  var t = G.finaleT;
  if (G.finaleTo !== undefined) {
    var k = Math.min(1, t / 1.8);
    G.prince.x = G.finaleFrom + (G.finaleTo - G.finaleFrom) * (k * k * (3 - 2 * k));
    G.prince.walk += dt * (k < 1 ? 2.4 : 0.4);
    moveScarf(G.prince, dt);
  }
  G.bloom = Math.min(1, 0.12 + t / 6);
  if (t > 6) G.red = Math.min(1, (t - 6) / 3.5);
  if (t > 3 && t < 3.1) sfx.spark();
  if (t > 6 && t < 6.1) { sfx.pour(); G.flash = 1; }
  var L = cfg('letter1', []);
  var shown = Math.floor(Math.max(0, t - 9) / 1.5);
  finaleLines = L.slice(0, Math.min(L.length, shown));
  if (Math.random() < dt * 6) {
    burst(W / 2 + (Math.random() - 0.5) * W * 0.6, H * 0.5 + (Math.random() - 0.5) * H * 0.4,
          t > 6 ? RED : GOLD, 2, 50);
  }
}

/* ============================ render ===================================== */
function lerpCol(a, b, t) {
  /* accepts '#rrggbb' and the 'rgb(r,g,b)' this function itself returns, so
     tints can be layered on tints */
  function rgb(c) {
    if (c.charAt(0) === '#') {
      return [parseInt(c.substr(1, 2), 16), parseInt(c.substr(3, 2), 16), parseInt(c.substr(5, 2), 16)];
    }
    var m = c.match(/-?\d+(\.\d+)?/g);
    return m ? [+m[0] | 0, +m[1] | 0, +m[2] | 0] : [0, 0, 0];
  }
  var A = rgb(a), B = rgb(b);
  return 'rgb(' + Math.round(A[0] + (B[0] - A[0]) * t) + ',' + Math.round(A[1] + (B[1] - A[1]) * t) + ',' +
         Math.round(A[2] + (B[2] - A[2]) * t) + ')';
}
/* sky + stars are baked together and only rebuilt when the colour changes */
var skyTex = null, skyKey = '';
function buildSky(top, bot) {
  var c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(W * DPR)); c.height = Math.max(1, Math.round(H * DPR));
  var g = c.getContext('2d');
  g.setTransform(DPR, 0, 0, DPR, 0, 0);
  var lg = g.createLinearGradient(0, 0, 0, H);
  lg.addColorStop(0, top); lg.addColorStop(0.62, lerpCol(top, bot, 0.72)); lg.addColorStop(1, bot);
  g.fillStyle = lg; g.fillRect(0, 0, W, H);

  /* a band of far-off dust across the sky, three washes crossed */
  g.save();
  g.translate(W * 0.52, H * 0.34); g.rotate(-0.42);
  var neb = [['rgba(120,170,190,0.17)', 1], ['rgba(170,140,200,0.13)', 0.62], ['rgba(230,190,150,0.1)', 0.34]];
  for (var n = 0; n < neb.length; n++) {
    var rg = g.createRadialGradient(0, 0, 0, 0, 0, W * 0.62 * neb[n][1]);
    rg.addColorStop(0, neb[n][0]); rg.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = rg;
    g.save(); g.scale(1, 0.26 + n * 0.08);
    g.beginPath(); g.arc(0, 0, W * 0.62 * neb[n][1], 0, 6.2832); g.fill();
    g.restore();
  }
  g.restore();

  /* denser stars inside the band */
  for (var i = 0; i < 90; i++) {
    var t2 = (hash(i, 61) - 0.5) * W * 1.25;
    var u2 = (hash(i, 62) - 0.5) * H * 0.3;
    var px = W * 0.52 + t2 * Math.cos(-0.42) - u2 * Math.sin(-0.42);
    var py = H * 0.34 + t2 * Math.sin(-0.42) + u2 * Math.cos(-0.42);
    g.globalAlpha = 0.2 + hash(i, 63) * 0.5;
    g.fillStyle = hash(i, 64) < 0.2 ? GOLD : CREAM;
    g.beginPath(); g.arc(px, py, (0.5 + hash(i, 65) * 1.1) * S, 0, 6.2832); g.fill();
  }
  g.globalAlpha = 1;
  if (starfield) { g.globalAlpha = 0.85; g.drawImage(starfield, 0, 0, W, H); g.globalAlpha = 1; }

  /* the planet's own air, glowing where it meets the sky */
  var hg = g.createLinearGradient(0, gr.base - H * 0.3, 0, gr.base + 10 * S);
  hg.addColorStop(0, 'rgba(0,0,0,0)');
  hg.addColorStop(1, 'rgba(150,210,195,0.2)');
  g.fillStyle = hg; g.fillRect(0, gr.base - H * 0.3, W, H * 0.3 + 10 * S);
  skyTex = c;
}
function drawSky() {
  var n = (G.screen === 'play') ? night() : null;
  var top = SKY_T, bot = SKY_B;
  if (n && n.tint) { top = lerpCol(SKY_T, n.tint, 0.7); bot = lerpCol(SKY_B, n.tint, 0.45); }
  var rq = Math.round(G.red * 12) / 12;
  if (rq > 0) { top = lerpCol(top, '#5e1024', rq * 0.85); bot = lerpCol(bot, '#a8283c', rq * 0.8); }
  var key = top + bot + W + 'x' + H;
  if (key !== skyKey) { buildSky(top, bot); skyKey = key; }
  ctx.drawImage(skyTex, 0, 0, W, H);
  /* the moon */
  var mx = W * 0.3, my = H * 0.15;
  glow(mx, my, 54 * S, 'rgba(255,248,224,0.6)', 0.22);
  inkBlob(mx, my, 17 * S, 404, '#f2ead2', 0.95, 1, 1.6);
  ctx.globalAlpha = 0.35;
  inkBlob(mx + 6 * S, my - 4 * S, 4.4 * S, 405, '#d8cfb4', 0.9, 1, 0);
  inkBlob(mx - 5 * S, my + 5 * S, 3 * S, 406, '#d8cfb4', 0.9, 1, 0);
  ctx.globalAlpha = 1;

  /* stars that cannot keep still */
  for (var tw = 0; tw < 14; tw++) {
    var tx2 = hash(tw, 71) * W, ty2 = hash(tw, 72) * H * 0.6;
    var a3 = 0.25 + Math.abs(Math.sin(t * (0.8 + hash(tw, 73)) + tw)) * 0.75;
    ctx.globalAlpha = a3 * 0.9;
    ctx.fillStyle = hash(tw, 74) < 0.3 ? GOLD : CREAM;
    var tr = (1 + hash(tw, 75) * 1.6) * S * (0.6 + a3 * 0.6);
    ctx.beginPath(); ctx.arc(tx2, ty2, tr, 0, 6.2832); ctx.fill();
    ctx.globalAlpha = 1;
  }

  /* the migrating birds he left with */
  var bc = 31, bph = ((t + 9) % bc) / bc;
  if (bph < 0.42) {
    var bk = bph / 0.42;
    var bx = -70 * S + bk * (W + 140 * S);
    var byy = H * 0.17 + Math.sin(bk * 3.4) * H * 0.045;
    ctx.globalAlpha = 0.5;
    for (var bi = 0; bi < 6; bi++) {
      var ox2 = bx - (bi % 3) * 26 * S - (bi > 2 ? 14 * S : 0);
      var oy2 = byy + (bi > 2 ? 15 * S : 0) + (bi % 3) * 7 * S;
      var wv = Math.sin(t * 7 + bi * 0.8) * 3.4 * S;
      inkPath([[ox2 - 7 * S, oy2 + wv], [ox2, oy2 - 2.5 * S], [ox2 + 7 * S, oy2 + wv]], 420 + bi, 0.8 * S);
      stroke(1.7, CREAM);
    }
    ctx.globalAlpha = 1;
  }

  /* little worlds, each drifting at its own distance */
  var t = G.t;
  var worlds = [
    [0.17, 0.30, 20, 'rgba(158,200,176,0.3)', 0.0045, 0],
    [0.78, 0.22, 12, 'rgba(224,184,120,0.3)', 0.0030, 1],
    [0.46, 0.11, 8,  'rgba(200,170,190,0.26)', 0.0065, 0],
    [0.90, 0.46, 6,  'rgba(158,200,176,0.22)', 0.0021, 0],
    [0.06, 0.50, 5,  'rgba(224,184,120,0.2)',  0.0016, 0]
  ];
  for (var wi = 0; wi < worlds.length; wi++) {
    var wd = worlds[wi];
    var wx = ((wd[0] + t * wd[4]) % 1.16 - 0.08) * W;
    var wy = H * wd[1] + Math.sin(t * 0.3 + wi) * 3 * S;
    inkBlob(wx, wy, wd[2] * S, 400 + wi, wd[3], 1, 1, 1.3);
    if (wd[5]) {
      inkPath(circlePts(wx, wy, wd[2] * 1.7 * S, 14, 0.3), 460 + wi, 1.5 * S, true);
      stroke(1.3, 'rgba(244,234,214,0.25)');
    }
  }
  /* dust drifting up off the surface */
  for (var dm = 0; dm < 16; dm++) {
    var dph = (t * (0.05 + hash(dm, 81) * 0.06) + hash(dm, 82)) % 1;
    var dx2 = (hash(dm, 83) * 1.1 - 0.05) * W + Math.sin(t * 0.5 + dm) * 14 * S;
    var dy2 = gr.base - dph * H * 0.5;
    ctx.globalAlpha = Math.sin(dph * Math.PI) * 0.3;
    ctx.fillStyle = CREAM;
    ctx.beginPath(); ctx.arc(dx2, dy2, (0.9 + hash(dm, 84) * 1.4) * S, 0, 6.2832); ctx.fill();
  }
  ctx.globalAlpha = 1;
  if (G.sunsetT > 0) {
    var sa = Math.min(1, G.sunsetT / 1.2) * 0.5;
    var sg = ctx.createLinearGradient(0, H * 0.25, 0, H);
    sg.addColorStop(0, 'rgba(255,150,80,0)');
    sg.addColorStop(0.55, 'rgba(255,150,80,' + (sa * 0.55) + ')');
    sg.addColorStop(1, 'rgba(255,196,120,' + sa + ')');
    ctx.fillStyle = sg; ctx.fillRect(0, 0, W, H);
  }

  /* a star falls now and then, on its own schedule */
  for (var sh = 0; sh < 2; sh++) {
    var cyc = 13 + sh * 7, ph = ((t + sh * 6.5) % cyc) / cyc;
    if (ph < 0.09) {
      var k2 = ph / 0.09;
      var sx = W * (0.1 + sh * 0.45) + k2 * W * 0.42;
      var sy = H * (0.08 + sh * 0.12) + k2 * H * 0.2;
      var al = Math.sin(k2 * Math.PI) * 0.75;
      var gd = ctx.createLinearGradient(sx - 70 * S, sy - 33 * S, sx, sy);
      gd.addColorStop(0, 'rgba(244,234,214,0)'); gd.addColorStop(1, 'rgba(255,248,224,' + al + ')');
      ctx.strokeStyle = gd; ctx.lineWidth = 2.2 * S; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(sx - 70 * S, sy - 33 * S); ctx.lineTo(sx, sy); ctx.stroke();
      glow(sx, sy, 11 * S, GOLD, al * 0.8);
    }
  }

  /* washes of cloud — soft, never solid */
  for (var i = 0; i < 4; i++) {
    var cx = ((t * (3 + i * 2.2) * S + i * W * 0.33) % (W + 420 * S)) - 210 * S;
    var cy2 = H * (0.2 + i * 0.09), cr = (52 + i * 18) * S;
    for (var q = 0; q < 3; q++) {
      glow(cx + (q - 1) * cr * 0.7, cy2 + (q === 1 ? -cr * 0.16 : 0),
           cr * (q === 1 ? 1.15 : 0.85), 'rgba(244,234,214,0.5)', 0.1);
    }
  }
}
/* a volcano. live ones breathe smoke; the dead one just sits there. */
function drawVolcano(x, sc, seed) {
  var y = groundY(x), u = 20 * S * sc, dead = (seed === 1);
  inkPath([[x - u * 1.25, y], [x - u * 0.42, y - u * 1.0],
           [x + u * 0.42, y - u * 1.0], [x + u * 1.25, y]], 560 + seed, 1.6 * S, true);
  ctx.save(); ctx.translate(1.4 * S, 0);
  wash(dead ? '#4a4b46' : '#5c4336', 0.92);
  ctx.restore();
  inkPath([[x - u * 1.25, y], [x - u * 0.42, y - u * 1.0],
           [x + u * 0.42, y - u * 1.0], [x + u * 1.25, y]], 562 + seed, 1.6 * S, true);
  stroke(2.2);
  inkPath([[x - u * 0.42, y - u * 1.0], [x, y - u * 0.86], [x + u * 0.42, y - u * 1.0]], 564 + seed, 1.2 * S);
  stroke(2, dead ? '#6b6c66' : '#7a5442');
  if (!dead) {
    glow(x, y - u * 1.05, u * 0.9, '#e08a50', 0.3 + Math.sin(G.t * 1.7 + seed) * 0.08);
    for (var i = 0; i < 3; i++) {
      var ph = ((G.t * 0.2 + i / 3 + seed * 0.37) % 1);
      glow(x + Math.sin(ph * 4 + seed) * u * 0.55, y - u * 1.15 - ph * u * 2.6,
           u * (0.5 + ph * 1.1), 'rgba(226,216,196,0.9)', Math.sin(ph * Math.PI) * 0.17);
    }
  }
}
var planetTex = null;
function buildPlanet() {
  var c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(W * DPR)); c.height = Math.max(1, Math.round(H * DPR));
  var g = c.getContext('2d');
  g.setTransform(DPR, 0, 0, DPR, 0, 0);
  g.beginPath();
  g.moveTo(-20, groundY(-20));
  for (var x = -20; x <= W + 20; x += Math.max(14, W / 48)) g.lineTo(x, groundY(x));
  g.lineTo(W + 20, H + 30); g.lineTo(-20, H + 30); g.closePath();
  var lg = g.createLinearGradient(0, gr.base - 20 * S, 0, H);
  lg.addColorStop(0, '#39635a');
  lg.addColorStop(0.3, PLANET);
  lg.addColorStop(1, PLANET2);
  g.fillStyle = lg; g.fill();
  g.save(); g.clip();

  /* rolling ground: bands that follow the curve of the world */
  for (var bd = 1; bd <= 3; bd++) {
    var off = bd * (H - gr.base) * 0.26;
    g.beginPath();
    g.moveTo(-20, groundY(-20) + off);
    for (var bx = -20; bx <= W + 20; bx += Math.max(16, W / 40)) {
      g.lineTo(bx, groundY(bx) + off + Math.sin(bx * 0.004 + bd) * 5 * S);
    }
    g.lineTo(W + 20, H + 30); g.lineTo(-20, H + 30); g.closePath();
    g.globalAlpha = 0.09;
    g.fillStyle = bd === 2 ? '#15332f' : '#1b3c36';
    g.fill();
    g.globalAlpha = 0.14;
    g.strokeStyle = 'rgba(190,230,210,0.5)';
    g.lineWidth = 1.2 * S;
    g.stroke();
  }

  /* craters and worn patches */
  for (var i = 0; i < 16; i++) {
    g.globalAlpha = 0.05 + hash(i, 15) * 0.04;
    g.fillStyle = hash(i, 16) < 0.45 ? '#ffffff' : '#0d241f';
    g.beginPath();
    g.ellipse(hash(i, 11) * W, gr.base + hash(i, 12) * (H - gr.base) * 1.1,
              (10 + hash(i, 13) * 30) * S, (3 + hash(i, 14) * 8) * S, 0, 0, 6.2832);
    g.fill();
  }
  /* small stones */
  for (var st = 0; st < 22; st++) {
    g.globalAlpha = 0.13;
    g.fillStyle = '#9ec8b0';
    g.beginPath();
    g.ellipse(hash(st, 21) * W, gr.base + 6 * S + hash(st, 22) * (H - gr.base) * 0.9,
              (1.4 + hash(st, 23) * 2.6) * S, (1 + hash(st, 24) * 1.6) * S, 0, 0, 6.2832);
    g.fill();
  }
  g.globalAlpha = 1;
  g.restore();
  planetTex = c;
}
function drawPlanetBody() {
  var pts = [];
  for (var x = -20; x <= W + 20; x += Math.max(14, W / 48)) pts.push([x, groundY(x)]);
  pts.push([W + 20, H + 30]); pts.push([-20, H + 30]);
  ctx.beginPath();
  for (var i = 0; i < pts.length; i++) {
    var p = pts[i];
    var o = i < pts.length - 2 ? jy(500, i, 2.2 * S) : 0;
    if (i === 0) ctx.moveTo(p[0], p[1] + o); else ctx.lineTo(p[0], p[1] + o);
  }
  ctx.closePath();
  if (planetTex) ctx.drawImage(planetTex, 0, 0, W, H);
  if (G.red > 0) {
    ctx.save(); ctx.clip();
    ctx.globalAlpha = G.red * 0.75; ctx.fillStyle = '#7e1c2e';
    ctx.fillRect(0, gr.base - 40 * S, W, H); ctx.globalAlpha = 1; ctx.restore();
  }
  /* the horizon line */
  var lp = [];
  for (var x2 = -20; x2 <= W + 20; x2 += Math.max(14, W / 48)) lp.push([x2, groundY(x2)]);
  inkPath(lp, 501, 2.4 * S);
  stroke(2.6, (G.screen === 'play' && G.dark > 0.5) ? 'rgba(244,234,214,0.55)' : INK);
  ctx.save(); ctx.translate(0, -2.6 * S);
  inkPath(lp, 502, 2 * S);
  stroke(1.5, 'rgba(244,234,214,0.3)');
  ctx.restore();
  /* his three volcanoes: two that still work, one that went out.
     Kept at the very edges so they never crowd the catching. */
  drawVolcano(W * 0.072, 1, 0);
  drawVolcano(W * 0.132, 0.7, 1);
  drawVolcano(W * 0.935, 0.86, 2);

  /* grass, and the occasional small flower */
  for (var k = 0; k < 30; k++) {
    var gx = (k / 30) * W + hash(k, 1) * 22 * S;
    var gy = groundY(gx) + 1.5 * S;
    var gh = (3 + hash(k, 3) * 6) * S;
    inkPath([[gx, gy], [gx + (hash(k, 2) - 0.5) * 5 * S, gy - gh]], 510 + k, 0.8 * S);
    stroke(1.6, 'rgba(120,170,130,0.55)');
    if (hash(k, 4) < 0.22) {
      var fx = gx + (hash(k, 5) - 0.5) * 4 * S, fy = gy - gh - 1.6 * S;
      ctx.globalAlpha = 0.65;
      ctx.fillStyle = hash(k, 6) < 0.5 ? '#e0b878' : '#bfd9c8';
      ctx.beginPath(); ctx.arc(fx, fy, 1.7 * S, 0, 6.2832); ctx.fill();
      ctx.globalAlpha = 1;
    }
  }
}
function drawKeptTrinkets() {
  var list = save.trinkets;
  for (var i = 0; i < list.length; i++) {
    var f = (i + 1) / (list.length + 1);
    var x = W * (0.16 + f * 0.74);
    /* keep them clear of the rose */
    if (Math.abs(x - G.roseX) < 54 * S) x += 70 * S * (x < G.roseX ? -1 : 1);
    ctx.globalAlpha = 0.9;
    drawTrinket(list[i], clamp(x, 24 * S, W - 24 * S), groundY(clamp(x, 24 * S, W - 24 * S)), 0.72, G.t);
    ctx.globalAlpha = 1;
  }
}
function drawDarkPass() {
  if (G.dark <= 0.01) return;
  ctx.globalAlpha = G.dark * 0.97;
  ctx.fillStyle = '#060e18';
  ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = 1;
  /* in the dark only the trails are left */
  for (var i = 0; i < G.objs.length; i++) {
    var o = G.objs[i];
    var col = BAD[o.type] ? 'rgba(200,50,74,' : 'rgba(240,196,106,';
    var g = ctx.createLinearGradient(o.x, o.y - 56 * S, o.x, o.y + o.r);
    g.addColorStop(0, col + '0)'); g.addColorStop(1, col + (0.85 * G.dark) + ')');
    ctx.strokeStyle = g;
    ctx.lineWidth = o.r * 0.9;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(o.x, o.y - 56 * S); ctx.lineTo(o.x, o.y);
    ctx.stroke();
    ctx.globalAlpha = G.dark;
    if (BAD[o.type]) {
      inkPath([[o.x, o.y - o.r], [o.x + o.r * 0.8, o.y + o.r * 0.7], [o.x - o.r * 0.8, o.y + o.r * 0.7]], o.id, o.r * 0.12, true);
      wash('#e04a62', 0.95); stroke(1.8, '#ffd8de');
    } else {
      inkPath(starPts(o.x, o.y, o.r * 0.95), o.id, o.r * 0.1, true);
      wash(GOLD, 0.95); stroke(1.8, '#fff4d8');
    }
    ctx.globalAlpha = 1;
  }
  ctx.globalAlpha = G.dark;
  for (var bb = 0; bb < G.baobabs.length; bb++) {
    var b2 = G.baobabs[bb];
    glow(b2.x, groundY(b2.x) - (14 + b2.growth * 86) * S * 0.5, (30 + b2.growth * 60) * S, 'rgba(90,70,50,0.9)', 0.5);
  }
  drawPrince(G.prince, true);
  glow(G.roseX, groundY(G.roseX) - 60 * S, 46 * S, RED, 0.35);
  drawRose(G.roseX, G.bloom, G.t, true, 1.18);
  ctx.globalAlpha = 1;
}
function drawParts() {
  for (var i = 0; i < G.parts.length; i++) {
    var p = G.parts[i];
    var a = Math.max(0, 1 - p.t / p.life);
    ctx.globalAlpha = a * 0.95;
    ctx.fillStyle = p.c;
    if (p.shape && p.r > 1.2 * S) {
      var r = p.r * 2.4 * (0.5 + a * 0.5);
      ctx.save();
      ctx.translate(p.x, p.y); ctx.rotate(p.rot + p.spin * p.t); ctx.translate(-p.x, -p.y);
      ctx.beginPath();
      var pts = p.shape === 'heart' ? heartPts(p.x, p.y, r)
              : p.shape === 'star' ? starPts(p.x, p.y, r)
              : circlePts(p.x, p.y, r * 0.7, 8, 1.5);
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (var q = 1; q < pts.length; q++) ctx.lineTo(pts[q][0], pts[q][1]);
      ctx.closePath(); ctx.fill();
      ctx.restore();
    } else {
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.2832); ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}
function drawSteps() {
  for (var i = 0; i < G.steps.length; i++) {
    var st = G.steps[i], gy = groundY(st.x);
    ctx.globalAlpha = Math.max(0, 1 - st.t / 2.6) * 0.3;
    inkPath([[st.x - 3 * S, gy + 2 * S], [st.x + 3 * S, gy + 2 * S]], 940 + i, 0.8 * S);
    stroke(1.8, INK);
    ctx.globalAlpha = 1;
  }
}
function drawRings() {
  for (var i = 0; i < G.rings.length; i++) {
    var r = G.rings[i];
    var k = r.t / r.life, e = 1 - Math.pow(1 - k, 2.4);
    var rr = r.r0 + (r.r1 - r.r0) * e;
    ctx.globalAlpha = (1 - k) * 0.85;
    var seg = Math.max(14, Math.min(40, Math.round(rr / (2.6 * S))));
    inkPath(circlePts(r.x, r.y, rr, seg), 900 + i, rr * 0.05, true);
    stroke(r.w * (1 - k * 0.7) / S, r.c);
    ctx.globalAlpha = 1;
  }
}
function drawFlyers() {
  for (var i = 0; i < G.flyers.length; i++) {
    var f = G.flyers[i];
    var k = Math.min(1, f.t / f.life);
    glow(f.x, f.y, 13 * S * (1 - k * 0.4), f.c, 0.5);
    ctx.fillStyle = f.c;
    ctx.globalAlpha = 0.95;
    ctx.beginPath();
    ctx.ellipse(f.x, f.y, 3.4 * S, 4.6 * S, 0, 0, 6.2832);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}
function drawPops() {
  for (var i = 0; i < G.pops.length; i++) {
    var p = G.pops[i];
    var a = Math.min(1, (1 - p.t / p.life) * 1.6);
    ctx.save();
    ctx.globalAlpha = a;
    text(p.s, p.x, p.y, p.size, INK, 'center', false, a * 0.35);
    text(p.s, p.x - 1.2 * S, p.y - 1.4 * S, p.size, p.c, 'center', false, a);
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}

/* ============================ HUD ======================================== */
var soundBtn = { x: 0, y: 0, r: 0 };
function hitSoundBtn(x, y) {
  var dx = x - soundBtn.x, dy = y - soundBtn.y;
  if (dx * dx + dy * dy < soundBtn.r * soundBtn.r * 1.7) { setSound(!save.sound); sfx.ui(); return true; }
  return false;
}
function drawSoundBtn() {
  var r = 14 * S;
  soundBtn.x = W - 24 * S; soundBtn.y = H - 20 * S; soundBtn.r = r;
  ctx.globalAlpha = 0.65;
  inkBlob(soundBtn.x, soundBtn.y, r, 600, 'rgba(244,234,214,0.12)', 1, 1, 1.6);
  ctx.globalAlpha = 1;
  inkPath([[soundBtn.x - r * 0.5, soundBtn.y - r * 0.2], [soundBtn.x - r * 0.15, soundBtn.y - r * 0.2],
           [soundBtn.x + r * 0.2, soundBtn.y - r * 0.55], [soundBtn.x + r * 0.2, soundBtn.y + r * 0.55],
           [soundBtn.x - r * 0.15, soundBtn.y + r * 0.2], [soundBtn.x - r * 0.5, soundBtn.y + r * 0.2]], 601, 0.9 * S, true);
  stroke(1.8, CREAM);
  if (!save.sound) { inkPath([[soundBtn.x - r * 0.6, soundBtn.y + r * 0.7], [soundBtn.x + r * 0.7, soundBtn.y - r * 0.7]], 602, 1 * S); stroke(2, RED); }
}
function drawHUD() {
  var p = G.prince, n = night();
  /* score */
  text(String(G.score), 18 * S, 32 * S, 26, CREAM, 'left');
  var hi = G.mode === 'endless' ? save.highEndless : save.high;
  text('best  ' + hi, 18 * S, 50 * S, 12, BONE, 'left', true, 0.8);

  /* water pips */
  var wx = 18 * S, wy = 66 * S;
  for (var i = 0; i < CAN_MAX; i++) {
    ctx.beginPath();
    ctx.arc(wx + i * 11 * S, wy, 3.6 * S, 0, 6.2832);
    ctx.fillStyle = i < p.water ? '#6fb8c8' : 'rgba(244,234,214,0.18)';
    ctx.fill();
  }
  if (p.water >= CAN_MAX) text('full — water her', wx, wy + 18 * S, 11, GOLD, 'left', true, 0.9);

  /* combo */
  if (G.combo >= 3) {
    var m = multiplier();
    text(G.combo + ' in a row', W / 2, 30 * S, 15, CREAM, 'center', true, 0.9);
    if (m > 1) text('x' + m, W / 2, 50 * S, 20, GOLD, 'center');
  }

  /* what is protecting her, and what is slowed */
  var badgeY = 92 * S;
  if (G.shield) {
    text('under glass', 18 * S, badgeY, 12, '#bfe4ea', 'left', true, 0.95);
    badgeY += 17 * S;
  }
  if (G.slowT > 0) {
    text('slow  ' + G.slowT.toFixed(1) + 's', 18 * S, badgeY, 12, GOLD, 'left', true, 0.95);
    badgeY += 17 * S;
  }
  if (G.sunsets > 0) {
    text(G.sunsets === 1 ? 'one sunset' : G.sunsets + ' sunsets', 18 * S, badgeY, 12, '#ffc890', 'left', true, 0.8);
  }

  /* night + time */
  if (G.mode === 'journey') text('night ' + (G.nightIdx + 1) + ' of ' + NIGHTS.length, W - 34 * S, 24 * S, 11, BONE, 'right', true, 0.75);
  else text('night ' + (G.nightIdx + 1), W - 34 * S, 24 * S, 11, BONE, 'right', true, 0.75);
  var bw = 96 * S, bx = W - 34 * S - bw, by = 32 * S;
  ctx.fillStyle = 'rgba(244,234,214,0.16)'; ctx.fillRect(bx, by, bw, 4 * S);
  ctx.fillStyle = CREAM; ctx.fillRect(bx, by, bw * Math.min(1, G.nightT / n.dur), 4 * S);

  /* baobab danger */
  var gc = grownCount();
  for (var b = 0; b < 3; b++) {
    var tx = W - 34 * S - b * 17 * S, ty = 62 * S;
    ctx.globalAlpha = b < gc ? 1 : 0.22;
    inkPath([[tx - 3 * S, ty + 6 * S], [tx, ty - 6 * S], [tx + 3 * S, ty + 6 * S]], 620 + b, 0.8 * S, true);
    wash(b < gc ? RED : CREAM, 0.9);
    ctx.globalAlpha = 1;
  }
  if (gc >= 2) text('the baobabs!', W - 34 * S, 86 * S, 12, RED, 'right', true, 0.9);

  /* pour ring */
  if (G.pour && G.pour.stage === 0) {
    var rx = G.roseX, ry = groundY(G.roseX) - 30 * S;
    ctx.beginPath();
    ctx.arc(rx, ry, 26 * S, -Math.PI / 2, -Math.PI / 2 + 6.2832 * (G.pour.t / 0.3));
    ctx.lineWidth = 3.4 * S; ctx.strokeStyle = '#6fb8c8'; ctx.lineCap = 'round';
    ctx.stroke();
  }
  if (!G.pour && G.prince.water > 0 && Math.abs(G.prince.x - G.roseX) < 120 * S && G.prince.locked <= 0) {
    text('stop here to water her', G.roseX, groundY(G.roseX) - 94 * S, 12, BONE, 'center', true, 0.55);
  }

  /* the rose talks */
  if (G.roseSayT > 0 && G.roseSay) {
    var a = Math.min(1, G.roseSayT);
    text('"' + G.roseSay + '"', G.roseX, groundY(G.roseX) - 112 * S, 14, CREAM, 'center', true, a * 0.95);
  }

  /* taming meter */
  if (G.fox && !G.foxTamed && G.fox.tame > 0.05) {
    var fx = G.fox.x, fy = groundY(G.fox.x) - 52 * S;
    ctx.fillStyle = 'rgba(244,234,214,0.2)'; ctx.fillRect(fx - 20 * S, fy, 40 * S, 4 * S);
    ctx.fillStyle = FOXC; ctx.fillRect(fx - 20 * S, fy, 40 * S * (G.fox.tame / 1.6), 4 * S);
    text('be still', fx, fy - 8 * S, 11, FOXC, 'center', true, 0.9);
  }

  /* first-run hint */
  if (G.hint > 0) {
    var ha = Math.min(1, G.hint / 2);
    text(kb ? 'arrow keys, or drag anywhere, to walk' : 'drag anywhere to walk',
         W / 2, H * 0.52, 16, CREAM, 'center', true, ha * 0.85);
    text('catch the hearts, then stop on the rose to pour', W / 2, H * 0.52 + 22 * S, 13, BONE, 'center', true, ha * 0.8);
  }

  /* night banner */
  if (G.bannerT > 0) {
    var ba = Math.min(1, G.bannerT / 0.6);
    var nn = night();
    ctx.globalAlpha = ba;
    text(nn.name, W / 2, H * 0.36, 34, CREAM);
    text(nn.sub, W / 2, H * 0.36 + 26 * S, 15, BONE, 'center', true);
    ctx.globalAlpha = 1;
  }
}

/* ============================ buttons ==================================== */
var buttons = [];
function button(label, x, y, w, h, fn, dim) {
  var idx = buttons.length;
  buttons.push({ x: x - w / 2, y: y - h / 2, w: w, h: h, fn: fn, dim: dim });
  var on = kb && idx === G.sel && !dim;
  var pts = [[x - w / 2, y - h / 2], [x + w / 2, y - h / 2], [x + w / 2, y + h / 2], [x - w / 2, y + h / 2]];
  ctx.globalAlpha = dim ? 0.35 : 1;
  inkPath(pts, 700 + idx, 2 * S, true);
  wash(on ? 'rgba(244,234,214,0.22)' : 'rgba(244,234,214,0.1)', 1);
  inkPath(pts, 710 + idx, 2 * S, true);
  stroke(on ? 3.2 : 2.2, CREAM);
  text(label, x, y + h * 0.17, h * 0.42 / S, CREAM);
  if (on) {
    var px = x - w / 2 - 16 * S, py = y + h * 0.02;
    inkPath(starPts(px, py, 6 * S), 720 + idx, 0.8 * S, true);
    wash(GOLD, 0.95); stroke(1.4, CREAM);
  }
  ctx.globalAlpha = 1;
}
function uiTap(x, y) {
  if (x < 0) {
    var b0 = buttons[G.sel] && !buttons[G.sel].dim ? buttons[G.sel] : null;
    if (!b0) for (var q = 0; q < buttons.length; q++) if (!buttons[q].dim) { b0 = buttons[q]; break; }
    if (b0) { sfx.ui(); b0.fn(); }
    return;
  }
  if (hitSoundBtn(x, y)) return;
  for (var i = 0; i < buttons.length; i++) {
    var b = buttons[i];
    if (!b.dim && x >= b.x - 8 * S && x <= b.x + b.w + 8 * S && y >= b.y - 8 * S && y <= b.y + b.h + 8 * S) {
      sfx.ui(); G.sel = i; b.fn(); return;
    }
  }
}

/* ============================ ambient scene ============================== */
var amb = null;
function updateAmbient(dt) {
  if (!amb) { amb = newPrince(); amb.x = W * 0.16; amb.target = W * 0.2; amb.wait = 1; }
  amb.wait -= dt;
  if (amb.wait <= 0) { amb.target = W * (0.08 + Math.random() * 0.22); amb.wait = 2 + Math.random() * 3; }
  var dx = amb.target - amb.x;
  amb.vx += (clamp(dx * 3, -70 * S, 70 * S) - amb.vx) * Math.min(1, dt * 6);
  amb.x = clamp(amb.x + amb.vx * dt, 20 * S, W - 20 * S);
  amb.walk += dt * (0.4 + Math.abs(amb.vx) / (120 * S));
  moveScarf(amb, dt);
}

/* ============================ screens ==================================== */
function screenMenu() {
  var cy = H * 0.26;
  text('Catch My Love', W / 2 + 2 * S, cy + 2 * S, 46, 'rgba(0,0,0,0.35)');
  text('Catch My Love', W / 2, cy, 46, CREAM);
  var ai = annivInfo();
  var tag = cfg('tagline', 'for ' + HER);
  if (ai && ai.kind === 'year') tag = 'happy anniversary, ' + HER;
  else if (ai) tag = cfg('monthLine', 'another month of you');
  text(tag, W / 2, cy + 28 * S, 15, SAND, 'center', true, 0.95);
  if (ai) {
    var sub = (ai.kind === 'year')
      ? (ai.years === 1 ? 'one year' : ai.years + ' years')
      : ai.months + ' months';
    text(sub + ' — something golden falls tonight', W / 2, cy + 48 * S, 12, GOLD, 'center', true, 0.85);
  }

  var bw = Math.min(200 * S, W * 0.3), bh = 42 * S, by = H * 0.52;
  button('play', W / 2 - bw * 0.56, by, bw, bh, function () { startRun('journey'); });
  button(save.endless ? 'endless' : 'endless ✦', W / 2 + bw * 0.56, by,
         bw, bh, function () { if (save.endless) startRun('endless'); }, !save.endless);
  if (!save.endless) text('finish the five nights', W / 2 + bw * 0.56, by + bh * 0.95, 11, BONE, 'center', true, 0.6);

  var sw = Math.min(150 * S, W * 0.22);
  button('her planet', W / 2 - sw * 0.56, by + bh * 1.7, sw, 30 * S, function () { G.screen = 'planet'; });
  button('the letter', W / 2 + sw * 0.56, by + bh * 1.7, sw, 30 * S,
         function () { G.screen = 'letter'; }, !save.finale && save.letter2 === 0);

  var line = save.high > 0 ? 'best  ' + save.high : 'drag anywhere to walk';
  text(line, W / 2, H - 26 * S, 13, BONE, 'center', true, 0.7);
  text(kb ? 'arrow keys  ·  enter' : 'a keyboard works too',
       W / 2, H - 11 * S, 10, BONE, 'center', true, 0.4);
}

function screenOver() {
  ctx.globalAlpha = 0.74; ctx.fillStyle = '#0a1a22'; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1;
  var cy = H * 0.24;
  text('the baobabs took the planet', W / 2, cy, 26, CREAM);
  text('she will need you again tomorrow', W / 2, cy + 22 * S, 13, BONE, 'center', true, 0.85);
  text(String(G.score), W / 2, cy + 68 * S, 44, GOLD);
  if (G.over && G.over.record) text('a new best', W / 2, cy + 90 * S, 14, RED, 'center', true);
  else text('best  ' + (G.mode === 'endless' ? save.highEndless : save.high), W / 2, cy + 90 * S, 13, BONE, 'center', true, 0.8);

  var bits = [];
  if (G.best >= 3) bits.push('longest run of catches: ' + G.best);
  if (G.caughtTrinkets.length) bits.push('you kept ' + G.caughtTrinkets.length + (G.caughtTrinkets.length === 1 ? ' thing' : ' things'));
  if (G.caughtFrags.length) bits.push('you found ' + G.caughtFrags.length + (G.caughtFrags.length === 1 ? ' note' : ' notes'));
  for (var i = 0; i < bits.length; i++) text(bits[i], W / 2, cy + 112 * S + i * 17 * S, 12, MINT, 'center', true, 0.9);

  var bw = Math.min(170 * S, W * 0.26), by = H * 0.83;
  button('again', W / 2 - bw * 0.58, by, bw, 38 * S, function () { startRun(G.mode); });
  button('home', W / 2 + bw * 0.58, by, bw, 38 * S, function () { G.screen = 'menu'; musicOn = true; });
}

function screenFinale() {
  var t = G.finaleT;
  ctx.globalAlpha = Math.min(0.55, Math.max(0, (t - 8) / 3)); ctx.fillStyle = '#2a0810';
  ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1;
  if (t > 3.2 && t < 9) {
    var a = Math.min(1, (t - 3.2) / 1.2) * Math.min(1, (9 - t) / 1.2);
    text('you won my heart', W / 2, H * 0.22, 38, CREAM, 'center', false, a);
  }
  if (t > 9) {
    var maxW = W * 0.72;
    var y = H * 0.17;
    text('a letter, for ' + HER, W / 2, y, 17, SAND, 'center', true, 0.9);
    y += 28 * S;
    for (var i = 0; i < finaleLines.length; i++) {
      if (!finaleLines[i]) { y += 11 * S; continue; }
      var ls = wrap(finaleLines[i], 16, maxW);
      for (var j = 0; j < ls.length; j++) { text(ls[j], W / 2, y, 16, CREAM); y += 21 * S; }
    }
    var L = cfg('letter1', []);
    if (finaleLines.length >= L.length) {
      y += 10 * S;
      text(cfg('signature', ''), W / 2, y, 16, RED, 'center', true);
      var bw = Math.min(180 * S, W * 0.26);
      button('keep playing', W / 2, Math.min(H - 34 * S, y + 44 * S), bw, 34 * S, function () {
        G.screen = 'menu'; musicOn = true; musicStep = 0;
      });
      text('endless is open now — the stars there carry a longer letter', W / 2, H - 12 * S, 11, BONE, 'center', true, 0.6);
    }
  }
}

/* A sheet of paper, laid down slightly crooked. Leaves its transform applied —
   the caller draws the contents and must call ctx.restore() when done. */
function paperCard(x, y, w, h, rot, seed) {
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2); ctx.rotate(rot); ctx.translate(-(x + w / 2), -(y + h / 2));
  var pts = [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
  ctx.save(); ctx.translate(5 * S, 6 * S);
  inkPath(pts, seed, 2 * S, true); wash('rgba(0,0,0,0.3)', 1);
  ctx.restore();
  inkPath(pts, seed + 1, 2.2 * S, true); wash(CREAM, 0.97);
  if (paperTex) {
    ctx.save(); inkPath(pts, seed + 1, 2.2 * S, true); ctx.clip();
    ctx.globalAlpha = 0.6; ctx.drawImage(paperTex, 0, 0, W, H); ctx.globalAlpha = 1;
    ctx.restore();
  }
  inkPath(pts, seed + 2, 2.2 * S, true); stroke(2.4, INK);
  /* binding rings down the left edge */
  for (var i = 0; i < 7; i++) {
    var ry = y + h * (0.1 + i * 0.133);
    ctx.globalAlpha = 0.5;
    inkPath(circlePts(x + 11 * S, ry, 3.4 * S, 9), seed + 10 + i, 0.6 * S, true);
    stroke(1.5, INK);
    ctx.globalAlpha = 1;
  }
}

/* a very small rose, for the top of the little world */
function miniRose(x, y, sc, t) {
  inkPath([[x, y], [x - 1.5 * sc, y - 9 * sc], [x, y - 17 * sc]], 620, 0.8 * S);
  stroke(2.2, '#5e8a6a');
  inkPath([[x, y - 8 * sc], [x + 7 * sc, y - 12 * sc], [x + 2 * sc, y - 6 * sc]], 621, 0.9 * S, true);
  wash('#6f9c74', 0.92); stroke(1.5, INK);
  for (var i = 0; i < 5; i++) {
    var a = i / 5 * 6.2832 + t * 0.2;
    inkBlob(x + Math.cos(a) * 3.4 * sc, y - 17 * sc + Math.sin(a) * 3.2 * sc,
            3.6 * sc, 624 + i, '#b02b42', 0.95, 1, 1.4);
  }
  inkBlob(x, y - 17 * sc, 2.4 * sc, 630, RED, 0.96, 1, 1.3);
}

function screenPlanet() {
  var t = G.t;
  ctx.globalAlpha = 0.84; ctx.fillStyle = '#0a1a22'; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1;

  text('her planet', W / 2, 40 * S, 28, CREAM);
  var sub = save.high > 0 ? 'best  ' + save.high : 'nothing kept yet';
  if (save.highEndless > 0) sub += '   ·   endless  ' + save.highEndless;
  text(sub, W / 2, 59 * S, 12, BONE, 'center', true, 0.7);

  /* ---------------------------------------------- the little world itself */
  var cx = W * 0.25, cy = H * 0.47, R = Math.min(W * 0.115, H * 0.165);
  var rot = t * 0.1;

  glow(cx, cy, R * 2.1, 'rgba(150,210,195,0.5)', 0.16);
  /* the body */
  inkPath(circlePts(cx, cy, R, 30), 600, R * 0.035, true);
  var lg = ctx.createLinearGradient(cx, cy - R, cx, cy + R);
  lg.addColorStop(0, '#3d6a60'); lg.addColorStop(1, PLANET2);
  ctx.fillStyle = lg; ctx.fill();
  ctx.save();
  inkPath(circlePts(cx, cy, R, 30), 600, R * 0.035, true); ctx.clip();
  for (var k = 0; k < 10; k++) {
    ctx.globalAlpha = 0.07;
    ctx.fillStyle = hash(k, 31) < 0.5 ? '#ffffff' : '#0d241f';
    ctx.beginPath();
    ctx.ellipse(cx + (hash(k, 32) - 0.5) * R * 1.8, cy + (hash(k, 33) - 0.5) * R * 1.8,
                R * (0.1 + hash(k, 34) * 0.3), R * 0.08, hash(k, 35) * 3, 0, 6.2832);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.restore();
  inkPath(circlePts(cx, cy, R, 30), 601, R * 0.035, true);
  stroke(2.6, INK);

  /* everything she has ever kept, standing on it */
  var n = TRINKETS.length;
  for (var i = 0; i < n; i++) {
    var a = rot + (i / n) * 6.2832 - Math.PI / 2;
    var px = cx + Math.cos(a) * R, py = cy + Math.sin(a) * R;
    var has = save.trinkets.indexOf(TRINKETS[i]) >= 0;
    ctx.save();
    ctx.translate(px, py); ctx.rotate(a + Math.PI / 2); ctx.translate(-px, -py);
    if (has) {
      /* Herbert is drawn large in the world; on the globe that would make him
         twice his neighbours, so he is scaled back to about a third again */
      drawTrinket(TRINKETS[i], px, py, TRINKETS[i] === 'rabbit' ? 0.22 : 0.4, t);
    } else {
      ctx.globalAlpha = 0.22;
      ctx.setLineDash([3 * S, 3 * S]);
      inkPath([[px - 4 * S, py], [px - 4 * S, py - 11 * S], [px + 4 * S, py - 11 * S], [px + 4 * S, py]], 640 + i, 0.6 * S);
      stroke(1.6, CREAM);
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }
  /* and the rose on top, always */
  miniRose(cx, cy - R + 1 * S, S * 1.15, t);

  text('things you kept', cx, cy + R + 34 * S, 14, SAND, 'center', true);
  text(save.trinkets.length + ' of ' + n, cx, cy + R + 56 * S, 22, CREAM);
  var latest = save.trinkets.length ? trinketName(save.trinkets[save.trinkets.length - 1]) : 'catch one and it stays here';
  text(latest, cx, cy + R + 76 * S, 11, BONE, 'center', true, 0.75);

  /* ---------------------------------------------------- the notes, on paper */
  var frags = fragmentList();
  var px0 = W * 0.495, py0 = H * 0.155, pw = W * 0.44, ph = H * 0.605;
  paperCard(px0, py0, pw, ph, -0.014, 660);
  var tx = px0 + pw * 0.55, inner = pw - 46 * S;
  text('the notes', tx, py0 + 30 * S, 17, INK);
  text(save.fragments.length + ' of ' + frags.length + ' found',
       tx, py0 + 48 * S, 11, '#7a6354', 'center', true);
  inkPath([[px0 + 30 * S, py0 + 58 * S], [px0 + pw - 18 * S, py0 + 58 * S]], 670, 1.2 * S);
  stroke(1.4, 'rgba(58,42,34,0.35)');

  /* only what she has actually found is written out; the rest is one line at
     the end, so the page grows into a collection instead of a checklist */
  var found = [];
  for (var f = 0; f < frags.length; f++) if (save.fragments.indexOf(f) >= 0) found.push(frags[f]);
  var missing = frags.length - found.length;
  var y = py0 + 78 * S, lineH = 14.5 * S, bottom = py0 + ph - 30 * S;

  if (G.noteStart >= found.length) G.noteStart = 0;
  var i = G.noteStart;
  while (i < found.length) {
    var ls = wrap(found[i], 11.5, inner);
    var need = ls.length * lineH + 7 * S;
    if (y + need > bottom) break;
    for (var j = 0; j < ls.length; j++) { text(ls[j], tx, y, 11.5, INK, 'center', false, 0.95); y += lineH; }
    y += 7 * S;
    i++;
  }
  var nextStart = (i < found.length) ? i : 0;
  var paged = (G.noteStart > 0 || i < found.length);

  if (!found.length) {
    text('none found yet', tx, y + 6 * S, 12, INK, 'center', true, 0.55);
    text('they are hidden inside the stars', tx, y + 26 * S, 11, INK, 'center', true, 0.4);
    y += 48 * S;
  }
  if (i >= found.length && missing > 0 && y + lineH * 1.6 < bottom) {
    ctx.globalAlpha = 0.3;
    ctx.setLineDash([5 * S, 5 * S]);
    inkPath([[tx - inner * 0.34, y + 2 * S], [tx + inner * 0.34, y + 2 * S]], 690, 0.8 * S);
    stroke(1.6, INK);
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
    text(missing === 1 ? 'one more, out there somewhere' : missing + ' more, out there somewhere',
         tx, y + 24 * S, 11, INK, 'center', true, 0.5);
  }
  if (paged) text('· · ·', tx, py0 + ph - 14 * S, 12, INK, 'center', false, 0.45);
  ctx.restore();                 /* the card's transform ends here */

  var l2 = cfg('letter2', []);
  if (save.letter2 > 0) {
    text('the long letter — ' + save.letter2 + ' of ' + l2.length + ' lines',
         cx, H - 24 * S, 11, SAND, 'center', true, 0.8);
  }

  var bw = Math.min(150 * S, W * 0.2);
  var showLetter = save.finale || save.letter2 > 0;
  var by2 = H - 26 * S, bx2 = W * 0.64;
  if (paged) {
    button('more notes', px0 + pw - bw * 0.5, py0 + ph + 28 * S, bw, 28 * S, function () {
      G.noteStart = nextStart;
    });
  }
  if (showLetter) {
    button('back', bx2 - bw * 0.58, by2, bw, 30 * S, function () { G.screen = 'menu'; });
    button('the letter', bx2 + bw * 0.58, by2, bw, 30 * S, function () { G.screen = 'letter'; });
  } else {
    button('back', bx2, by2, bw, 30 * S, function () { G.screen = 'menu'; });
  }
}

function screenLetter() {
  ctx.globalAlpha = 0.72; ctx.fillStyle = '#17060c'; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1;
  var maxW = W * 0.74, y = 44 * S;
  if (save.finale) {
    var L = cfg('letter1', []);
    for (var i = 0; i < L.length; i++) {
      if (y > H - 80 * S) break;
      if (!L[i]) { y += 9 * S; continue; }
      var ls = wrap(L[i], 13, maxW);
      for (var j = 0; j < ls.length; j++) { text(ls[j], W / 2, y, 13, CREAM, 'center', false, 0.95); y += 17 * S; }
    }
    text(cfg('signature', ''), W / 2, y + 8 * S, 13, RED, 'center', true);
    y += 30 * S;
  }
  var L2 = cfg('letter2', []);
  if (save.letter2 > 0) {
    text('and the longer one — ' + save.letter2 + '/' + L2.length + ' lines found', W / 2, y, 12, SAND, 'center', true, 0.9);
    y += 22 * S;
    for (var k = 0; k < save.letter2 && k < L2.length; k++) {
      if (y > H - 56 * S) { text('…', W / 2, y, 13, BONE); break; }
      var ls2 = wrap(L2[k], 13, maxW);
      for (var m = 0; m < ls2.length; m++) { text(ls2[m], W / 2, y, 13, CREAM, 'center', false, 0.95); y += 17 * S; }
    }
  } else if (save.finale) {
    text('there is a longer letter hidden in the endless stars', W / 2, y, 12, BONE, 'center', true, 0.7);
  }
  button('back', W / 2, H - 26 * S, Math.min(150 * S, W * 0.22), 30 * S, function () { G.screen = 'menu'; });
}

/* ============================ frame ====================================== */
function frame() {
  /* start every frame from a known transform, whatever happened in the last one */
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  if (G.screen !== G.lastScreen) { G.lastScreen = G.screen; G.sel = 0; G.noteStart = 0; }
  buttons.length = 0;
  ctx.save();
  if (G.shake > 0) {
    var m = G.shake * G.shake * 9 * S;
    ctx.translate((Math.random() - 0.5) * m, (Math.random() - 0.5) * m);
  }
  if (G.punch > 0.01) {
    var z = 1 + Math.min(0.016, G.punch * 0.012);
    ctx.translate(W / 2, H * 0.62); ctx.scale(z, z); ctx.translate(-W / 2, -H * 0.62);
  }
  drawSky();
  drawPlanetBody();
  drawKeptTrinkets();

  if (G.screen === 'play' || G.screen === 'over' || G.screen === 'finale') {
    drawSteps();
    for (var i = 0; i < G.baobabs.length; i++) drawBaobab(G.baobabs[i]);
    drawRose(G.roseX, G.bloom, G.t, false, 1.18);
    if (G.fox) drawFox(G.fox, G.t);
    drawLandings();
    for (var k = 0; k < G.objs.length; k++) drawFalling(G.objs[k], G.t, false);
    drawPrince(G.prince, false);
    if (G.shield) {
      var sx2 = G.prince.x, sy2 = groundY(sx2) - 30 * S, sr = 50 * S;
      ctx.globalAlpha = 0.17 + Math.sin(G.t * 2.4) * 0.05;
      ctx.fillStyle = '#bfe4ea';
      ctx.beginPath(); ctx.arc(sx2, sy2, sr, Math.PI, 0); ctx.fill();
      ctx.globalAlpha = 1;
      var dp = circlePts(sx2, sy2, sr, 20, 1).filter(function (q) { return q[1] <= sy2 + 1; });
      inkPath(dp, 880, 1.4 * S);
      stroke(2.2, 'rgba(216,240,244,0.8)');
      inkPath([[sx2 - sr, sy2], [sx2 + sr, sy2]], 881, 1 * S);
      stroke(2, 'rgba(216,240,244,0.6)');
    }
    drawParts();
    drawRings();
    drawFlyers();
    drawDarkPass();
    drawPops();
  } else if (G.screen === 'menu') {
    drawRose(W * 0.80, save.finale ? 1 : 0.4, G.t, false, 1.18);
    if (amb) drawPrince(amb, false);
    drawParts(); drawRings(); drawPops();
  } else {
    drawParts(); drawRings(); drawPops();
  }
  ctx.restore();

  if (vignette) ctx.drawImage(vignette, 0, 0, W, H);
  drawPaper();

  if (G.flash > 0) {
    ctx.globalAlpha = G.flash * 0.5;
    ctx.fillStyle = G.red > 0 ? RED : CREAM;
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1;
  }

  if (G.screen === 'play') drawHUD();
  else if (G.screen === 'menu') screenMenu();
  else if (G.screen === 'over') screenOver();
  else if (G.screen === 'finale') screenFinale();
  else if (G.screen === 'planet') screenPlanet();
  else if (G.screen === 'letter') screenLetter();
  drawSoundBtn();
}

/* ============================ loop ======================================= */
var last = 0, slowFrames = 0, warmup = 0;
function tick(ts) {
  if (!last) last = ts;
  var dt = Math.min(0.05, (ts - last) / 1000);
  last = ts;
  /* if the device is struggling, quietly turn the grain off and render softer */
  if (quality && warmup++ > 120) {
    if (dt > 0.027) { if (++slowFrames > 90) { quality = 0; resize(); } }
    else slowFrames = Math.max(0, slowFrames - 1);
  }
  if (G.screen !== 'play' && G.screen !== 'finale') { updateAmbient(dt); }
  update(dt);
  if (G.screen !== 'play' && G.screen !== 'finale' && G.screen !== 'over') musicTick();
  frame();
  requestAnimationFrame(tick);
}

/* ============================ boot ======================================= */
/* some hosts re-wrap the document and drop the head tags; put them back, so
   Add to Home Screen still gives a fullscreen app */
(function ensureHead() {
  var want = [
    ['meta', { name: 'apple-mobile-web-app-capable', content: 'yes' }],
    ['meta', { name: 'mobile-web-app-capable', content: 'yes' }],
    ['meta', { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' }],
    ['meta', { name: 'apple-mobile-web-app-title', content: 'Catch My Love' }],
    ['meta', { name: 'theme-color', content: '#0f2c38' }],
    ['meta', { name: 'viewport', content: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover' }],
    ['link', { rel: 'apple-touch-icon', href: 'icons/icon-180.png' }],
    ['link', { rel: 'manifest', href: 'manifest.webmanifest' }]
  ];
  for (var i = 0; i < want.length; i++) {
    var tag = want[i][0], at = want[i][1];
    var sel = tag + (at.name ? '[name="' + at.name + '"]' : '[rel="' + at.rel + '"]');
    var el = document.head.querySelector(sel);
    if (!el) { el = document.createElement(tag); document.head.appendChild(el); }
    for (var k in at) el.setAttribute(k, at[k]);
  }
  if (!document.title) document.title = 'Catch My Love';
})();

resize();
G.roseX = W * 0.5;
G.prince = newPrince();
G.screen = 'menu';
requestAnimationFrame(tick);


/* test hook — only with ?debug in the url */
if (location.search.indexOf('debug') >= 0) {
  window.__CML = { G: G, save: save, NIGHTS: NIGHTS, startRun: startRun,
                   startFinale: startFinale, spawnTrinket: spawnTrinket, write: writeSave };
}

if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0) {
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('sw.js').catch(function () {});
  });
}
})();
