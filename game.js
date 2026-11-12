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
  var hh = 20 * S;                                /* head radius-ish unit */
  var bob = Math.sin(p.walk * 7) * 1.6 * S * Math.min(1, Math.abs(p.vx) / 120);
  var bodyTop = y - hh * 2.05 + bob;
  var headY = bodyTop - hh * 0.72;
  var seed = 11;
  var ic = dark ? 'rgba(244,234,214,0.85)' : INK;

  /* scarf — trails behind, and its tip can catch things */
  ctx.save();
  for (var i = p.scarf.length - 1; i > 0; i--) {
    var a = p.scarf[i], b = p.scarf[i - 1];
    ctx.beginPath();
    ctx.moveTo(a.x + jx(31, i, 1.2 * S), a.y + jy(31, i, 1.2 * S));
    ctx.lineTo(b.x, b.y);
    ctx.lineWidth = (7.0 - i * 0.55) * S;
    ctx.strokeStyle = dark ? 'rgba(200,50,74,0.55)' : '#b8475c';
    ctx.lineCap = 'round';
    ctx.stroke();
  }
  ctx.restore();

  /* legs */
  var sw = Math.sin(p.walk * 7) * 7 * S * Math.min(1, Math.abs(p.vx) / 110);
  inkPath([[x - 3 * S, y - hh * 0.75], [x - 4 * S + sw, y]], seed + 2, 1.3 * S);
  stroke(2.4, ic);
  inkPath([[x + 3 * S, y - hh * 0.75], [x + 4 * S - sw, y]], seed + 3, 1.3 * S);
  stroke(2.4, ic);

  /* coat */
  var coat = [[x - hh * 0.62, y - hh * 0.72], [x - hh * 0.44, bodyTop],
              [x + hh * 0.44, bodyTop], [x + hh * 0.62, y - hh * 0.72]];
  inkPath(coat, seed + 4, 1.7 * S, true);
  ctx.save(); ctx.translate(1.2 * S, 1.4 * S); wash(dark ? '#2e5b63' : MINT, 0.9); ctx.restore();
  inkPath(coat, seed + 5, 1.7 * S, true);
  stroke(2.3, ic);

  /* arms — reaching up, holding the can */
  inkPath([[x - hh * 0.5, bodyTop + hh * 0.3], [x - hh * 0.95, bodyTop - hh * 0.25]], seed + 6, 1.4 * S);
  stroke(2.3, ic);
  inkPath([[x + hh * 0.5, bodyTop + hh * 0.3], [x + hh * 0.95, bodyTop - hh * 0.2]], seed + 7, 1.4 * S);
  stroke(2.3, ic);

  /* the watering can, fills up as she catches */
  var canX = x + hh * 1.08, canY = bodyTop - hh * 0.1;
  var cw = hh * 0.84, ch = hh * 0.68;
  var canPts = [[canX - cw / 2, canY - ch / 2], [canX + cw / 2, canY - ch / 2],
                [canX + cw / 2, canY + ch / 2], [canX - cw / 2, canY + ch / 2]];
  inkPath(canPts, 71, 1.3 * S, true);
  wash(dark ? '#3a5f66' : BONE, 0.92);
  if (p.water > 0) {
    var fr = Math.min(1, p.water / CAN_MAX);
    ctx.save();
    ctx.beginPath();
    ctx.rect(canX - cw / 2, canY + ch / 2 - ch * fr, cw, ch * fr);
    ctx.clip();
    inkPath(canPts, 71, 1.3 * S, true);
    wash('#6fb8c8', 0.95);
    ctx.restore();
  }
  inkPath(canPts, 71, 1.3 * S, true);
  stroke(2.2, ic);
  /* spout */
  inkPath([[canX + cw * 0.5, canY - ch * 0.1], [canX + cw * 1.05, canY - ch * 0.5],
           [canX + cw * 1.25, canY - ch * 0.34]], 72, 1.1 * S);
  stroke(2.4, ic);
  /* handle */
  inkPath([[canX - cw * 0.34, canY - ch * 0.5], [canX, canY - ch * 1.05], [canX + cw * 0.34, canY - ch * 0.5]], 73, 1.1 * S);
  stroke(2, ic);

  /* head */
  inkBlob(x, headY, hh * 0.72, seed + 8, dark ? '#e8dcc0' : '#f6e7c8', 0.95, 1, 2.2);
  /* hair tufts */
  for (var k = 0; k < 6; k++) {
    var ang = -Math.PI * 0.95 + k / 5 * Math.PI * 0.9;
    var r0 = hh * 0.6, r1 = hh * (0.84 + (k % 2) * 0.1);
    inkPath([[x + Math.cos(ang) * r0 * 0.9, headY + Math.sin(ang) * r0 * 0.9],
             [x + Math.cos(ang - 0.22) * r1, headY + Math.sin(ang - 0.22) * r1]], 90 + k, 1.2 * S);
    stroke(3.4, dark ? 'rgba(240,196,106,0.8)' : GOLD);
  }
  /* face — two dots and a line */
  var look = Math.max(-1, Math.min(1, p.vx / 200));
  ctx.fillStyle = ic;
  ctx.beginPath(); ctx.arc(x - hh * 0.22 + look * 2 * S, headY - hh * 0.04, 1.9 * S, 0, 6.2832); ctx.fill();
  ctx.beginPath(); ctx.arc(x + hh * 0.22 + look * 2 * S, headY - hh * 0.04, 1.9 * S, 0, 6.2832); ctx.fill();
  inkPath([[x - hh * 0.13 + look * 2 * S, headY + hh * 0.3], [x + hh * 0.13 + look * 2 * S, headY + hh * 0.3]], 99, 1 * S);
  stroke(1.7, ic);
}

/* ============================ the rose =================================== */
function drawRose(x, bloom, t, dark, scale) {
  var sc = (scale || 1) * S;
  var y = groundY(x);
  /* stem */
  var h = 54 * sc;
  inkPath([[x, y], [x - 2 * sc, y - h * 0.45], [x + 1.5 * sc, y - h * 0.8], [x, y - h]], 140, 1.5 * S);
  stroke(2.6, dark ? 'rgba(158,200,176,0.8)' : '#5e8a6a');
  /* leaves */
  for (var s = -1; s <= 1; s += 2) {
    inkPath([[x, y - h * 0.5], [x + s * 15 * sc, y - h * 0.62], [x + s * 6 * sc, y - h * 0.38]], 141 + s, 1.6 * S, true);
    wash('#6f9c74', 0.9);
    stroke(2, dark ? 'rgba(58,42,34,0.7)' : INK);
  }
  /* the bloom. petals open with bloom 0..1 */
  var by = y - h, br = (7 + bloom * 13) * sc;
  var pet = 6;
  for (var i = 0; i < pet; i++) {
    var a = -Math.PI / 2 + i / pet * Math.PI * 2 + t * 0.12;
    var open = 0.3 + bloom * 0.85;
    var px = x + Math.cos(a) * br * open * 0.72;
    var py = by + Math.sin(a) * br * open * 0.72;
    inkBlob(px, py, br * 0.62, 150 + i, RED, 0.9, 1, 1.9);
  }
  inkBlob(x, by, br * 0.48, 160, bloom > 0.6 ? '#e05a70' : '#a8283c', 0.95, 1, 1.9);
  if (bloom > 0.99) {
    glow(x, by, br * 3.2, RED, 0.4 + Math.sin(t * 2) * 0.12);
  }
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
  var cn = Math.min(5, 1 + Math.floor(g * 5));
  for (var i = 0; i < cn; i++) {
    var a = -Math.PI / 2 + (i - (cn - 1) / 2) * 0.55;
    var rr = (5 + g * 17) * S;
    inkBlob(x + Math.cos(a) * w * 1.5, y - h - Math.abs(Math.sin(a)) * 4 * S - rr * 0.3,
            rr, 210 + b.id * 7 + i, g > 0.99 ? '#3c6b4a' : '#55835c', 0.9, 0.85, 2.1);
  }
  if (g > 0.99) {
    ctx.globalAlpha = 0.5; text('!', x, y - h - 28 * S, 20, RED); ctx.globalAlpha = 1;
  }
}

/* ============================ trinkets =================================== */
/* the things that stay on her planet once caught */
var TRINKETS = ['lamp','bench','scope','jar','dome','sheep','volcano','vane','boat','swing','cup','cage'];
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
    T_TRINKET = 'trinket', T_GOLD = 'goldrose';
var GOOD = { heart: 1, star: 1, note: 1, redrose: 1, sheep: 1, trinket: 1, goldrose: 1 };
var BAD  = { thorn: 1, rock: 1 };

function drawFalling(o, t, dark) {
  var x = o.x, y = o.y, r = o.r;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(o.rot);
  ctx.translate(-x, -y);
  if (GOOD[o.type] && !dark) glow(x, y, r * 2.4, GOLD, 0.3);
  switch (o.type) {
    case T_HEART:
      inkPath(heartPts(x, y, r), o.id + 1, r * 0.13, true);
      ctx.save(); ctx.translate(r * 0.1, r * 0.12); wash('#d4607a', 0.9); ctx.restore();
      inkPath(heartPts(x, y, r), o.id, r * 0.13, true); stroke(2);
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
    tint: null, table: [[T_HEART, 58], [T_STAR, 24], [T_THORN, 13], [T_ROCK, 5]] },
  { key: 'lamp', name: 'The Lamplighter', sub: 'the light keeps going out', dur: 48,
    tint: '#101c2e', dark: true, table: [[T_HEART, 50], [T_STAR, 24], [T_THORN, 17], [T_ROCK, 9]] },
  { key: 'money', name: 'The Businessman', sub: 'he owns the stars now', dur: 48,
    tint: '#1a2b33', coins: true, table: [[T_HEART, 40], [T_STAR, 14], [T_COIN, 24], [T_THORN, 14], [T_ROCK, 8]] },
  { key: 'roses', name: 'Five Thousand Roses', sub: 'one of them is yours', dur: 48,
    tint: '#2a2130', roses: true, table: [[T_ROSE, 54], [T_HEART, 22], [T_STAR, 6], [T_THORN, 12], [T_ROCK, 6]] },
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
function isAnniversary() {
  var a = cfg('anniversary', null);
  if (!a) return false;
  var d = new Date();
  return (d.getMonth() + 1) === a.month && d.getDate() === a.day;
}
function fragmentList() { var f = cfg('fragments', []); return (f && f.length) ? f : []; }

/* ============================ game state ================================= */
var G = {
  screen: 'menu',           /* menu play over finale planet sketch */
  mode: 'journey',
  t: 0, score: 0, water: 0, combo: 0, best: 0,
  nightIdx: 0, nightT: 0, nightDone: false, bannerT: 0, loop: 0,
  objs: [], parts: [], pops: [], baobabs: [], bid: 0, oid: 0,
  spawnT: 0, dark: 0, shake: 0, flash: 0, red: 0,
  prince: null, roseX: 0, bloom: 0, pour: null, fox: null,
  foxTamed: false, foxTimer: 0, stillT: 0,
  pending: [], hint: 0, roseSay: '', roseSayT: 0, over: null,
  finaleT: 0, caughtTrinkets: [], caughtFrags: [], audit: null
};

function newPrince() {
  var sc = [];
  for (var i = 0; i < 9; i++) sc.push({ x: W / 2, y: groundY(W / 2) - 40 * S });
  return { x: W / 2, vx: 0, target: W / 2, walk: 0, water: 0, scarf: sc, hurt: 0, locked: 0 };
}

function startRun(mode) {
  audioInit();
  layoutGround();
  G.mode = mode;
  G.screen = 'play';
  G.t = 0; G.score = 0; G.water = 0; G.combo = 0; G.best = 0;
  G.nightIdx = 0; G.nightT = 0; G.loop = 0; G.nightDone = false;
  G.objs = []; G.parts = []; G.pops = []; G.baobabs = []; G.bid = 0;
  G.spawnT = 1.1; G.dark = 0; G.shake = 0; G.flash = 0; G.red = 0;
  G.prince = newPrince();
  G.roseX = W * 0.5;
  G.bloom = 0.12;
  G.pour = null; G.fox = null; G.foxTamed = false; G.foxTimer = 14 + Math.random() * 10;
  G.caughtTrinkets = []; G.caughtFrags = []; G.audit = null;
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
  G.pops.push({ s: str, x: clamp(x, hw, W - hw), y: Math.max(y, 24 * S),
                c: col || CREAM, t: 0, life: 1.15, size: size || 15 });
}
function burst(x, y, col, n, spd) {
  n = n || 10;
  for (var i = 0; i < n; i++) {
    var a = Math.random() * 6.2832, v = (spd || 110) * (0.4 + Math.random()) * S;
    G.parts.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 40 * S,
                   r: (1.4 + Math.random() * 2.6) * S, c: col, t: 0, life: 0.5 + Math.random() * 0.5, g: 320 });
  }
}

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
window.addEventListener('keydown', function (e) {
  keys[e.key] = true;
  if (e.key === ' ' || e.key === 'Enter') { if (G.screen !== 'play') uiTap(-1, -1); }
});
window.addEventListener('keyup', function (e) { keys[e.key] = false; });
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
      G.baobabs[i].growth = Math.min(1, G.baobabs[i].growth + 0.34);
      G.baobabs[i].pulse = 1;
      sfx.seed();
      if (G.baobabs[i].growth >= 1) pop('a baobab!', G.baobabs[i].x, groundY(x) - 110 * S, RED, 16);
      return;
    }
  }
  G.baobabs.push({ x: clamp(x, 26 * S, W - 26 * S), growth: 0.2, id: G.bid++, pulse: 1 });
  sfx.seed();
}

function updatePrince(dt) {
  var p = G.prince;
  if (keys.ArrowLeft) p.target = clamp(p.x - 260 * S * dt, 0, W);
  if (keys.ArrowRight) p.target = clamp(p.x + 260 * S * dt, 0, W);

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

  /* scarf follows with delay; its tip can catch */
  moveScarf(p, dt);
}

var SEG = 7.0;
function moveScarf(p, dt) {
  var hx = p.x - Math.sign(p.vx || 1) * 7 * S, hy = groundY(p.x) - 44 * S;
  p.scarf[0].x = hx; p.scarf[0].y = hy;
  for (var k = 1; k < p.scarf.length; k++) {
    var a = p.scarf[k], b = p.scarf[k - 1];
    a.x += (b.x - a.x) * Math.min(1, dt * 11) - p.vx * dt * 0.055;
    a.y += (b.y - a.y) * Math.min(1, dt * 9) + 26 * S * dt;        /* it sags */
    /* keep the links a fixed length so it can never stretch into a plank */
    var dx = a.x - b.x, dy = a.y - b.y, d = Math.sqrt(dx * dx + dy * dy) || 1;
    var max = SEG * S;
    if (d > max) { a.x = b.x + dx / d * max; a.y = b.y + dy / d * max; }
    if (a.y > groundY(a.x) - 3 * S) a.y = groundY(a.x) - 3 * S;
  }
}
function catchPoints() {
  var p = G.prince;
  var gy = groundY(p.x);
  var pts = [{ x: p.x, y: gy - 46 * S, r: 30 * S, grace: false }];
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
      burst(o.x, o.y, o.type === T_HEART ? '#d4607a' : GOLD, 8);
      if (sp > 0) pop('the can is full', o.x, o.y - 18 * S, BONE, 12);
      break;
    case T_NOTE:
      sfx.spark();
      burst(o.x, o.y, CREAM, 18, 150);
      addWater(1);
      collectFragment(o.frag);
      break;
    case T_REDROSE:
      sfx.spark(); sfx.pour();
      addWater(4);
      G.score += Math.round(120 * mult);
      pop('hers!  +' + Math.round(120 * mult), o.x, o.y - 20 * S, RED, 20);
      burst(o.x, o.y, RED, 26, 180);
      G.flash = 0.5;
      break;
    case T_GOLD:
      sfx.spark(); sfx.pour();
      addWater(CAN_MAX);
      G.score += 500;
      pop('happy anniversary  +500', o.x, o.y - 22 * S, GOLD, 20);
      burst(o.x, o.y, GOLD, 40, 220);
      G.flash = 0.8;
      break;
    case T_COIN:
      G.score += 30;
      if (p.water > 0) { p.water--; pop('+30  -1 water', o.x, o.y - 18 * S, GOLD, 13); }
      else pop('+30', o.x, o.y - 18 * S, GOLD, 13);
      if (G.audit) G.audit.coins++;
      sfx.catch1(2);
      burst(o.x, o.y, GOLD, 8);
      break;
    case T_SHEEP:
      sfx.spark(); addWater(3);
      pop('a sheep', o.x, o.y - 20 * S, CREAM, 16);
      burst(o.x, o.y, CREAM, 14);
      break;
    case T_TRINKET:
      sfx.spark();
      keepTrinket(o.kind);
      G.score += 60;
      burst(o.x, o.y, CREAM, 24, 170);
      break;
    case T_ROSE:
      G.combo = Math.max(0, G.combo - 1);
      pop('not hers', o.x, o.y - 16 * S, BONE, 12);
      burst(o.x, o.y, BONE, 6);
      sfx.catch1(0);
      break;
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
  burst(G.roseX, groundY(G.roseX) - 60 * S, '#6fb8c8', 20, 140);
  /* watering the planet weeds it: the largest baobab goes */
  var worst = -1, wv = -1;
  for (var i = 0; i < G.baobabs.length; i++) if (G.baobabs[i].growth > wv) { wv = G.baobabs[i].growth; worst = i; }
  if (worst >= 0 && p.water >= 3) {
    burst(G.baobabs[worst].x, groundY(G.baobabs[worst].x), '#4a3a2e', 14, 130);
    G.baobabs.splice(worst, 1);
    pop('weeded', G.roseX + 60 * S, groundY(G.roseX) - 70 * S, MINT, 14);
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
      if (G.pour.t >= 0.3) { G.pour = { stage: 1, t: 0 }; p.locked = 1.1; doPour(); }
    } else if (G.pour.t > 1.15) G.pour = null;
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

  var r = (type === T_REDROSE || type === T_GOLD) ? 17 * S
        : (type === T_ROCK ? 16 * S : (type === T_SHEEP ? 15 * S : 14 * S));
  var o = {
    id: G.oid++, type: type, kind: null, frag: null,
    x: 26 * S + Math.random() * (W - 52 * S), y: -30 * S, r: r,
    vy: (96 + Math.min(150, d * 23)) * S * (0.86 + Math.random() * 0.3),
    vx: 0, rot: 0, spin: (Math.random() - 0.5) * 1.6, sway: Math.random() * 6.28,
    swayAmp: (type === T_ROSE || type === T_HEART) ? (10 + Math.random() * 14) : 4
  };
  if (type === T_NOTE) o.frag = pickFragment();
  if (type === T_ROCK) { o.vy *= 1.3; o.swayAmp = 0; }
  if (type === T_GOLD || type === T_REDROSE) o.vy *= 0.75;
  if (type === T_SHEEP) { o.vy *= 0.6; o.swayAmp = 26; }
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
  musicNight = G.nightIdx;
  sfx.night();
  pop('+' + bonus, W / 2, H * 0.3, CREAM, 20);
}

function startFinale() {
  G.screen = 'finale';
  G.finaleT = 0;
  G.objs.length = 0;
  G.prince.locked = 99;
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

  updatePrince(dt);
  updatePour(dt);
  updateFox(dt);

  /* spawn */
  if (!n.quiet) {
    G.spawnT -= dt;
    if (G.spawnT <= 0) {
      spawn();
      var d = difficulty();
      G.spawnT = Math.max(0.3, 0.95 - d * 0.075) * (0.75 + Math.random() * 0.5);
      if (d > 2.2 && Math.random() < 0.18) spawn();
    }
  }

  /* baobabs grow */
  for (var b = 0; b < G.baobabs.length; b++) {
    var bb = G.baobabs[b];
    if (bb.growth < 1) bb.growth = Math.min(1, bb.growth + dt * 0.016);
    if (bb.pulse > 0) bb.pulse -= dt * 2;
  }

  /* falling things */
  var cps = catchPoints();
  for (var k = G.objs.length - 1; k >= 0; k--) {
    var o = G.objs[k];
    o.sway += dt * 1.7;
    o.y += o.vy * dt;
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
      if (GOOD[o.type] && o.type !== T_TRINKET && o.type !== T_SHEEP) {
        G.combo = 0;
        sprout(o.x);
        burst(o.x, groundY(o.x), '#4a3a2e', 6, 70);
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
  function hex(c) { return [parseInt(c.substr(1, 2), 16), parseInt(c.substr(3, 2), 16), parseInt(c.substr(5, 2), 16)]; }
  var A = hex(a), B = hex(b);
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
  lg.addColorStop(0, top); lg.addColorStop(1, bot);
  g.fillStyle = lg; g.fillRect(0, 0, W, H);
  if (starfield) { g.globalAlpha = 0.85; g.drawImage(starfield, 0, 0, W, H); g.globalAlpha = 1; }
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
  /* a couple of little worlds, far off */
  var t = G.t;
  inkBlob(W * 0.17, H * 0.30 + Math.sin(t * 0.3) * 3 * S, 20 * S, 400, 'rgba(158,200,176,0.3)', 1, 1, 1.3);
  inkBlob(W * 0.78, H * 0.22 + Math.cos(t * 0.24) * 3 * S, 12 * S, 401, 'rgba(224,184,120,0.3)', 1, 1, 1.3);
  inkPath(circlePts(W * 0.78, H * 0.22, 20 * S, 14, 0.3), 402, 1.5 * S, true);
  stroke(1.3, 'rgba(244,234,214,0.25)');
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
  lg.addColorStop(0, PLANET); lg.addColorStop(1, PLANET2);
  g.fillStyle = lg; g.fill();
  g.save(); g.clip();
  for (var i = 0; i < 10; i++) {
    g.globalAlpha = 0.06;
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.ellipse(hash(i, 11) * W, gr.base + hash(i, 12) * (H - gr.base) * 1.1,
              (12 + hash(i, 13) * 28) * S, (4 + hash(i, 14) * 8) * S, 0, 0, 6.2832);
    g.fill();
  }
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
  /* little tufts of grass */
  for (var k = 0; k < 18; k++) {
    var gx = (k / 18) * W + hash(k, 1) * 20 * S;
    var gy = groundY(gx);
    inkPath([[gx, gy], [gx + (hash(k, 2) - 0.5) * 8 * S, gy - (4 + hash(k, 3) * 7) * S]], 510 + k, 1 * S);
    stroke(1.5, 'rgba(158,200,176,0.5)');
  }
}
function drawKeptTrinkets() {
  var list = save.trinkets;
  for (var i = 0; i < list.length; i++) {
    var f = (i + 1) / (list.length + 1);
    var x = W * (0.06 + f * 0.88);
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
    ctx.globalAlpha = Math.max(0, 1 - p.t / p.life) * 0.95;
    ctx.fillStyle = p.c;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.2832); ctx.fill();
  }
  ctx.globalAlpha = 1;
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
    text('drag anywhere to walk', W / 2, H * 0.52, 16, CREAM, 'center', true, ha * 0.85);
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
  buttons.push({ x: x - w / 2, y: y - h / 2, w: w, h: h, fn: fn, dim: dim });
  var pts = [[x - w / 2, y - h / 2], [x + w / 2, y - h / 2], [x + w / 2, y + h / 2], [x - w / 2, y + h / 2]];
  ctx.globalAlpha = dim ? 0.35 : 1;
  inkPath(pts, 700 + buttons.length, 2 * S, true);
  wash('rgba(244,234,214,0.1)', 1);
  inkPath(pts, 710 + buttons.length, 2 * S, true);
  stroke(2.2, CREAM);
  text(label, x, y + h * 0.17, h * 0.42 / S, CREAM);
  ctx.globalAlpha = 1;
}
function uiTap(x, y) {
  if (x < 0) { if (buttons.length && !buttons[0].dim) { sfx.ui(); buttons[0].fn(); } return; }
  if (hitSoundBtn(x, y)) return;
  for (var i = 0; i < buttons.length; i++) {
    var b = buttons[i];
    if (!b.dim && x >= b.x - 8 * S && x <= b.x + b.w + 8 * S && y >= b.y - 8 * S && y <= b.y + b.h + 8 * S) {
      sfx.ui(); b.fn(); return;
    }
  }
}

/* ============================ ambient scene ============================== */
var amb = null;
function updateAmbient(dt) {
  if (!amb) { amb = newPrince(); amb.x = W * 0.22; amb.target = W * 0.3; amb.wait = 1; }
  amb.wait -= dt;
  if (amb.wait <= 0) { amb.target = W * (0.12 + Math.random() * 0.5); amb.wait = 2 + Math.random() * 3; }
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
  var tag = isAnniversary() ? 'happy anniversary, ' + HER : cfg('tagline', 'for ' + HER);
  text(tag, W / 2, cy + 28 * S, 15, SAND, 'center', true, 0.95);
  if (isAnniversary()) text('something golden falls tonight', W / 2, cy + 48 * S, 12, GOLD, 'center', true, 0.8);

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

function screenPlanet() {
  ctx.globalAlpha = 0.6; ctx.fillStyle = '#0a1a22'; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1;
  text('her planet', W / 2, 40 * S, 28, CREAM);
  var lx = W * 0.27, rx = W * 0.73, y0 = 76 * S;

  text('things you kept  ' + save.trinkets.length + '/' + TRINKETS.length, lx, y0, 14, SAND, 'center', true);
  for (var i = 0; i < TRINKETS.length; i++) {
    var has = save.trinkets.indexOf(TRINKETS[i]) >= 0;
    var yy = y0 + 22 * S + i * 15.5 * S;
    if (yy > H - 60 * S) break;
    text(has ? trinketName(TRINKETS[i]) : '· · ·', lx, yy, 12, has ? CREAM : BONE, 'center', true, has ? 0.95 : 0.3);
  }

  var frags = fragmentList();
  text('notes you found  ' + save.fragments.length + '/' + frags.length, rx, y0, 14, SAND, 'center', true);
  var yy2 = y0 + 22 * S;
  for (var k = 0; k < frags.length; k++) {
    var got = save.fragments.indexOf(k) >= 0;
    if (yy2 > H - 60 * S) break;
    if (got) {
      var ls = wrap(frags[k], 12, W * 0.42);
      for (var j = 0; j < ls.length; j++) { text(ls[j], rx, yy2, 12, CREAM, 'center', true, 0.95); yy2 += 15 * S; }
      yy2 += 4 * S;
    } else { text('· · ·', rx, yy2, 12, BONE, 'center', true, 0.3); yy2 += 15 * S; }
  }
  button('back', W / 2, H - 30 * S, Math.min(150 * S, W * 0.22), 32 * S, function () { G.screen = 'menu'; });
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
  buttons.length = 0;
  ctx.save();
  if (G.shake > 0) {
    var m = G.shake * G.shake * 9 * S;
    ctx.translate((Math.random() - 0.5) * m, (Math.random() - 0.5) * m);
  }
  drawSky();
  drawPlanetBody();
  drawKeptTrinkets();

  if (G.screen === 'play' || G.screen === 'over' || G.screen === 'finale') {
    for (var i = 0; i < G.baobabs.length; i++) drawBaobab(G.baobabs[i]);
    drawRose(G.roseX, G.bloom, G.t, false, 1.18);
    if (G.fox) drawFox(G.fox, G.t);
    for (var k = 0; k < G.objs.length; k++) drawFalling(G.objs[k], G.t, false);
    drawPrince(G.prince, false);
    drawParts();
    drawDarkPass();
    drawPops();
  } else {
    drawRose(W * 0.80, save.finale ? 1 : 0.4, G.t, false, 1.18);
    if (amb) drawPrince(amb, false);
    drawParts(); drawPops();
  }
  ctx.restore();

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
