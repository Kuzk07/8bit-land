/* =========================================================
   8BIT☆LAND — 主逻辑
   ========================================================= */
(function () {
  'use strict';

  /* ---------------- 基础工具 ---------------- */
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.prototype.slice.call((r || document).querySelectorAll(s));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const rnd = (a, b) => a + Math.random() * (b - a);
  const rndInt = (a, b) => Math.floor(rnd(a, b + 1));
  const pick = (arr) => arr[(Math.random() * arr.length) | 0];
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const noteName = (m) => NOTE_NAMES[m % 12] + (Math.floor(m / 12) - 1);

  /* =========================================================
     主题（DOM 用 CSS 变量控制，画布用这里的调色板）
     ========================================================= */
  const PALETTES = {
    vapor: {
      roll: {
        rowBlack: 'rgba(14,11,26,.55)',
        rowWhite: 'rgba(78,60,124,.30)',
        keyBlack: '#2b2242',
        keyWhite: '#ece4f6',
        keyText: '#8f7fbc',
        vBar: 'rgba(231,158,196,.50)',
        vBeat: 'rgba(255,255,255,.18)',
        vLine: 'rgba(255,255,255,.07)',
        hLine: 'rgba(255,255,255,.06)',
        hover: 'rgba(147,220,228,.22)',
        font: '12px "Fusion Pixel 12px Proportional Simplified Chinese", monospace',
        noteSat: 62, noteLight: 74,
        noteEdge: 'hsla(0,0%,100%,.55)',
        head0: 'rgba(166,227,200,0)',
        head1: 'rgba(166,227,200,.30)',
        headLine: 'rgba(200,245,226,.8)'
      },
      noteHues: [330, 12, 46, 90, 150, 190, 220, 265],
      waveOrig: '#93dce4',
      waveCut: '#e79ec4',
      waveAxis: 'rgba(255,255,255,.14)',
      fx: ['#e79ec4', '#f3c6dd', '#93dce4', '#a6e3c8', '#f0dda6', '#a99ae0', '#f0b39a', '#ffffff'],
      mascot: {
        body0: '#ffc4ec', body1: '#e976aa',
        hi: '#fff4fb', eye: '#2a0a3d', eyeOpen: '#ff9be0',
        blush: '#ff6a9e', mouth: '#2a0a3d'
      }
    },
    win98: {
      roll: {
        rowBlack: '#e9e6f7',
        rowWhite: '#ffffff',
        keyBlack: '#b3aed2',
        keyWhite: '#ffffff',
        keyText: '#5b5680',
        vBar: '#9fb2ea',
        vBeat: '#c8cff0',
        vLine: '#e6e4f4',
        hLine: '#e6e4f4',
        hover: 'rgba(224,105,159,.16)',
        font: '12px "Fusion Pixel 12px Proportional Simplified Chinese", monospace',
        noteSat: 62, noteLight: 76,
        noteEdge: 'rgba(27,23,48,.55)',
        head0: 'rgba(224,105,159,0)',
        head1: 'rgba(224,105,159,.22)',
        headLine: '#e0699f'
      },
      noteHues: [336, 12, 46, 100, 168, 210, 268, 300],
      waveOrig: '#5b73c8',
      waveCut: '#e0699f',
      waveAxis: 'rgba(27,23,48,.18)',
      fx: ['#e0699f', '#f7a9d3', '#7fa8f0', '#7bd6a0', '#f2d16d', '#a98be8', '#ffb08f', '#ffffff'],
      mascot: {
        body0: '#ffc4ec', body1: '#e976aa',
        hi: '#fff4fb', eye: '#2a0a3d', eyeOpen: '#ff9be0',
        blush: '#ff6a9e', mouth: '#2a0a3d'
      }
    }
  };

  const THEME_NAMES = ['vapor', 'win98'];
  let THEME = document.documentElement.getAttribute('data-theme');
  if (THEME === 'xp' || THEME === 'handheld') THEME = 'vapor';
  if (THEME_NAMES.indexOf(THEME) < 0) THEME = 'vapor';
  let PAL = PALETTES[THEME];
  let canRecolor = false;
  let mascotPaint = null;

  function setTheme(name) {
    if (!PALETTES[name] || name === THEME) {
      if (PALETTES[name]) syncThemeButtons(name);
      return;
    }
    THEME = name;
    PAL = PALETTES[name];
    document.documentElement.setAttribute('data-theme', name);
    try { localStorage.setItem('8bit-land-theme', name); } catch (e) { /* 隐身模式忽略 */ }
    syncThemeButtons(name);
    refreshCanvases();
  }

  function syncThemeButtons(name) {
    $$('.theme-opt').forEach((b) => b.classList.toggle('is-on', b.dataset.themeSet === name));
  }

  $$('.theme-opt').forEach((b) => {
    b.addEventListener('click', () => setTheme(b.dataset.themeSet));
  });
  syncThemeButtons(THEME);

  /* =========================================================
     音频引擎
     ========================================================= */
  let AC = null;          // AudioContext
  let MASTER = null;      // 主输出
  let DELAY = null;       // 延迟（模块三用）
  const pulseCache = new WeakMap();
  const noiseCache = new WeakMap();

  function ac() {
    if (!AC) {
      const C = window.AudioContext || window.webkitAudioContext;
      if (!C) {
        alert('你的浏览器不支持 Web Audio，建议用 Chrome / Edge 打开。');
        return null;
      }
      AC = new C();

      MASTER = AC.createGain();
      MASTER.gain.value = 0.85;

      const comp = AC.createDynamicsCompressor();
      comp.threshold.value = -16;
      comp.knee.value = 22;
      comp.ratio.value = 3.2;
      comp.attack.value = 0.004;
      comp.release.value = 0.22;

      MASTER.connect(comp);
      comp.connect(AC.destination);

      // 反馈延迟
      DELAY = AC.createDelay(1.2);
      DELAY.delayTime.value = 0.185;
      const fb = AC.createGain(); fb.gain.value = 0.3;
      const wet = AC.createGain(); wet.gain.value = 0.34;
      const hp = AC.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 320;
      DELAY.connect(hp); hp.connect(fb); fb.connect(DELAY);
      DELAY.connect(wet); wet.connect(MASTER);
    }
    if (AC.state === 'suspended') AC.resume();
    return AC;
  }

  function pulseWave(c) {
    if (pulseCache.has(c)) return pulseCache.get(c);
    const n = 28;
    const real = new Float32Array(n);
    const imag = new Float32Array(n);
    const duty = 0.25;
    for (let i = 1; i < n; i++) imag[i] = (2 / (i * Math.PI)) * Math.sin(Math.PI * i * duty);
    const w = c.createPeriodicWave(real, imag, { disableNormalization: false });
    pulseCache.set(c, w);
    return w;
  }

  function noiseBuffer(c) {
    if (noiseCache.has(c)) return noiseCache.get(c);
    const len = Math.floor(c.sampleRate * 0.4);
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    noiseCache.set(c, buf);
    return buf;
  }

  /**
   * 播放一个芯片音符
   * @param {BaseAudioContext} c
   * @param {AudioNode} dest
   * @param {number} midi
   * @param {number} when 起始时间
   * @param {number} dur 时长（秒）
   * @param {object} o  { type, gain, send, sendNode, slide }
   */
  function playNote(c, dest, midi, when, dur, o) {
    o = o || {};
    const type = o.type || 'square';
    const vol = o.gain == null ? 0.18 : o.gain;
    const start = Math.max(when, 0);
    const durReal = Math.max(0.12, dur);
    const rel = start + durReal;
    const atk = 0.008;
    const dec = Math.min(0.09, durReal * 0.4);

    const osc = c.createOscillator();
    if (type === 'pulse') osc.setPeriodicWave(pulseWave(c));
    else osc.type = type;

    const f = mtof(midi);
    osc.frequency.setValueAtTime(f, start);
    if (o.slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, f * o.slide), rel);

    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(vol, start + atk);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol * 0.72), start + atk + dec);
    g.gain.setValueAtTime(Math.max(0.0002, vol * 0.72), rel);
    g.gain.exponentialRampToValueAtTime(0.0001, rel + 0.09);

    osc.connect(g);
    g.connect(dest);

    if (o.send && o.sendNode) {
      const s = c.createGain();
      s.gain.value = o.send;
      g.connect(s);
      s.connect(o.sendNode);
    }

    osc.start(start);
    osc.stop(rel + 0.14);
  }

  function kick(c, dest, when) {
    const t = Math.max(when, 0);
    const osc = c.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(155, t);
    osc.frequency.exponentialRampToValueAtTime(46, t + 0.13);
    const g = c.createGain();
    g.gain.setValueAtTime(0.5, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.19);
    osc.connect(g); g.connect(dest);
    osc.start(t); osc.stop(t + 0.22);
  }

  function hat(c, dest, when) {
    const t = Math.max(when, 0);
    const src = c.createBufferSource();
    src.buffer = noiseBuffer(c);
    const hp = c.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 7200;
    const g = c.createGain();
    g.gain.setValueAtTime(0.09, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    src.connect(hp); hp.connect(g); g.connect(dest);
    src.start(t); src.stop(t + 0.08);
  }

  /* =========================================================
     WAV 编码
     ========================================================= */
  function encodeWav(samples, sampleRate) {
    const n = samples.length;
    const ab = new ArrayBuffer(44 + n * 2);
    const v = new DataView(ab);
    const str = (off, s) => { for (let i = 0; i < s.length; i++) v.setUint8(off + i, s.charCodeAt(i)); };

    str(0, 'RIFF');
    v.setUint32(4, 36 + n * 2, true);
    str(8, 'WAVE');
    str(12, 'fmt ');
    v.setUint32(16, 16, true);
    v.setUint16(20, 1, true);
    v.setUint16(22, 1, true);
    v.setUint32(24, sampleRate, true);
    v.setUint32(28, sampleRate * 2, true);
    v.setUint16(32, 2, true);
    v.setUint16(34, 16, true);
    str(36, 'data');
    v.setUint32(40, n * 2, true);

    let off = 44;
    for (let i = 0; i < n; i++) {
      let s = samples[i];
      s = s < -1 ? -1 : s > 1 ? 1 : s;
      v.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      off += 2;
    }
    return new Blob([ab], { type: 'audio/wav' });
  }

  function download(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 6000);
  }

  /* =========================================================
     启动页 / 时钟 / 星空 / 标签切换
     ========================================================= */
  const boot = $('#boot');
  let booted = false;
  function startUp() {
    if (booted) return;
    booted = true;
    ac();
    boot.classList.add('is-off');
    setTimeout(() => { boot.hidden = true; }, 900);
    if (currentPanel === 2) layoutRoll();
    if (currentPanel === 3) startLucky();
  }
  boot.addEventListener('click', startUp);
  boot.addEventListener('keydown', startUp);

  function tickClock() {
    const d = new Date();
    const p = (x) => String(x).padStart(2, '0');
    $('#clock').textContent = p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds());

    /* 任务栏时钟（糖果主题） */
    const tb = $('#tbClock');
    if (tb) {
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      tb.innerHTML = '<b>' + p(d.getHours()) + ':' + p(d.getMinutes()) + '</b>' +
        '<i>' + days[d.getDay()] + '.' + p(d.getDate()) + '/' + p(d.getMonth() + 1) + '</i>';
    }
  }
  tickClock();
  setInterval(tickClock, 1000);

  (function starField() {
    const box = $('#starField');
    let html = '';
    for (let i = 0; i < 26; i++) {
      const big = Math.random() < 0.2;
      html += `<i class="${big ? 'big' : ''}" style="left:${rnd(0, 100).toFixed(2)}%;top:${rnd(0, 66).toFixed(2)}%;animation-delay:${rnd(0, 5).toFixed(2)}s;animation-duration:${rnd(4, 8).toFixed(2)}s"></i>`;
    }
    box.innerHTML = html;
  })();

  let currentPanel = 3;
  const tabs = $$('.tab');
  tabs.forEach((btn) => {
    btn.addEventListener('click', () => {
      const n = Number(btn.dataset.panel);
      if (n === currentPanel) return;
      switchPanel(n);
    });
  });

  function switchPanel(n) {
    currentPanel = n;
    tabs.forEach((b) => b.classList.toggle('is-active', Number(b.dataset.panel) === n));
    $$('.panel').forEach((p) => p.classList.toggle('is-active', p.id === 'panel-' + n));

    if (n === 2) {
      layoutRoll();
      requestAnimationFrame(() => { layoutRoll(); });
    } else {
      stopSeq();
    }

    if (n === 3) startLucky();
    else stopLucky();
  }

  /* =========================================================
     模块一：8BIT 转换器
     ========================================================= */
  const M1 = {
    file: null,
    buffer: null,
    mono: null,
    outSamples: null,
    outRate: 0,
    blob: null,
    busy: false
  };
  canRecolor = true;

  const dropEl = $('#drop');
  const fileInput = $('#fileInput');
  const convertBtn = $('#convertBtn');
  const bitsEl = $('#bits');
  const rateEl = $('#rate');
  const gainEl = $('#gain');
  const driveEl = $('#drive');
  const progressEl = $('#progress');
  const progressBar = $('#progressBar');
  const progressTxt = $('#progressTxt');
  const previewBox = $('#previewBox');
  const audioPreview = $('#audioPreview');

  function fmtTime(sec) {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return m + ':' + String(s).padStart(2, '0');
  }
  function fmtSize(b) {
    if (b < 1024 * 1024) return (b / 1024).toFixed(0) + ' KB';
    return (b / 1024 / 1024).toFixed(2) + ' MB';
  }

  /* 拖拽 */
  ['dragenter', 'dragover'].forEach((ev) => {
    dropEl.addEventListener(ev, (e) => { e.preventDefault(); dropEl.classList.add('is-over'); });
  });
  ['dragleave', 'drop'].forEach((ev) => {
    dropEl.addEventListener(ev, (e) => { e.preventDefault(); dropEl.classList.remove('is-over'); });
  });
  dropEl.addEventListener('drop', (e) => {
    const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (f) handleFile(f);
  });
  fileInput.addEventListener('change', () => {
    const f = fileInput.files && fileInput.files[0];
    if (f) handleFile(f);
    fileInput.value = '';
  });

  async function handleFile(file) {
    if (!/^audio\//.test(file.type) && !/\.(mp3|wav|ogg|m4a|flac|aac|webm)$/i.test(file.name)) {
      alert('这不是音频文件哦，换一个 MP3 / WAV / OGG 试试。');
      return;
    }
    const c = ac();
    if (!c) return;

    M1.file = file;
    M1.buffer = null;
    M1.mono = null;
    M1.outSamples = null;
    previewBox.hidden = true;
    convertBtn.disabled = true;
    convertBtn.textContent = '解码中…';

    const card = $('#fileCard');
    card.hidden = false;
    $('#fileName').textContent = '♪ ' + file.name;
    $('#fileMeta').textContent = fmtSize(file.size) + '‧解码中…';

    try {
      const ab = await file.arrayBuffer();
      const buf = await c.decodeAudioData(ab);
      M1.buffer = buf;

      // 混成单声道
      const chs = buf.numberOfChannels;
      const n = buf.length;
      const mono = new Float32Array(n);
      for (let ch = 0; ch < chs; ch++) {
        const d = buf.getChannelData(ch);
        for (let i = 0; i < n; i++) mono[i] += d[i];
      }
      if (chs > 1) for (let i = 0; i < n; i++) mono[i] /= chs;
      M1.mono = mono;

      $('#fileMeta').textContent =
        fmtSize(file.size) + '‧' + fmtTime(buf.duration) + '‧' +
        buf.numberOfChannels + 'ch‧' + (buf.sampleRate / 1000).toFixed(1) + 'kHz';

      drawWave($('#waveOrig'), mono, 'orig', false);
      drawWave($('#wave8'), mono, 'cut', true);
      $('#waveEmpty').hidden = true;

      convertBtn.disabled = false;
      convertBtn.textContent = '→ 开始转换';
      $('#convTip').textContent = '准备好了，点上面的大按钮开始。';
    } catch (err) {
      console.error(err);
      $('#fileMeta').textContent = '解码失败';
      convertBtn.textContent = '→ 开始转换';
      alert('这个文件解不出来…可能格式不受支持，试试转成 MP3 或 WAV 再来。');
    }
  }

  /* 波形绘制 which: 'orig' | 'cut' */
  function drawWave(canvas, data, which, crushed) {
    const color = which === 'cut' ? PAL.waveCut : PAL.waveOrig;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = canvas.clientWidth || 360;
    const h = canvas.clientHeight || 90;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    const g = canvas.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, w, h);

    const mid = h / 2;
    const step = Math.max(1, Math.floor(data.length / w));
    const bucket = crushed ? 3 : 1;

    for (let x = 0; x < w; x += bucket) {
      let peak = 0;
      const s0 = x * step;
      const s1 = Math.min(data.length, s0 + step);
      const stride = Math.max(1, Math.floor((s1 - s0) / 48));
      for (let i = s0; i < s1; i += stride) {
        const v = Math.abs(data[i]);
        if (v > peak) peak = v;
      }
      if (crushed) peak = Math.round(peak * 5) / 5; // 视觉上做量化，看起来更"芯片"
      const hh = Math.max(1, peak * (h - 6) * 0.92);
      g.fillStyle = color;
      g.globalAlpha = 0.9;
      g.fillRect(x, mid - hh / 2, bucket, hh);
    }
    g.globalAlpha = 1;
    g.fillStyle = PAL.waveAxis;
    g.fillRect(0, mid, w, 1);
  }

  /* 换主题后把已经画过的画布重新着色 */
  function refreshCanvases() {
    if (mascotPaint) mascotPaint();
    if (!canRecolor) return;
    if (M1.mono) {
      drawWave($('#waveOrig'), M1.mono, 'orig', false);
      drawWave($('#wave8'), M1.outSamples || M1.mono, 'cut', true);
    }
    drawRoll();
  }

  /* 8bit 处理核心：位深量化 + 采样率抽降 + 一阶低通 + 过载 */
  async function processBuffer(buffer, opt, onProgress) {
    const sr = buffer.sampleRate;
    const n = buffer.length;
    const mono = M1.mono;

    const outRate = Math.min(opt.rate, sr);
    const hold = Math.max(1, Math.round(sr / outRate));
    const outLen = Math.max(1, Math.floor(n / hold));

    // 抗混叠低通（一阶）
    const cutoff = clamp(outRate * 0.45, 800, sr * 0.49);
    const a = Math.exp((-2 * Math.PI * cutoff) / sr);

    const levels = Math.pow(2, opt.bits);
    const half = levels / 2;
    const gain = opt.gain;
    const drive = opt.drive ? 2.8 : 1;

    const lpBuf = new Float32Array(n);
    const CHUNK = 400000;
    let lp = 0;

    // 第一遍：低通
    for (let s = 0; s < n; s += CHUNK) {
      const e = Math.min(n, s + CHUNK);
      for (let i = s; i < e; i++) {
        lp = mono[i] * (1 - a) + lp * a;
        lpBuf[i] = lp;
      }
      onProgress(((e / n) * 0.45));
      await new Promise((r) => setTimeout(r, 0));
    }

    // 第二遍：采样抽降 + 量化
    const out = new Float32Array(outLen);
    for (let s = 0; s < outLen; s += CHUNK) {
      const e = Math.min(outLen, s + CHUNK);
      for (let o = s; o < e; o++) {
        let v = lpBuf[o * hold] * gain;
        if (drive > 1) v = Math.tanh(v * drive) * 0.92;
        v = Math.round(v * half) / half;
        out[o] = v < -1 ? -1 : v > 1 ? 1 : v;
      }
      onProgress(0.45 + ((e / outLen) * 0.55));
      await new Promise((r) => setTimeout(r, 0));
    }

    return { samples: out, sampleRate: sr / hold };
  }

  function readOpts() {
    return {
      bits: Number(bitsEl.value),
      rate: Number(rateEl.value),
      gain: Number(gainEl.value) / 100,
      drive: driveEl.checked
    };
  }

  function syncLabels() {
    $('#bitsVal').textContent = bitsEl.value + ' bit';
    $('#rateVal').textContent = Number(rateEl.value).toLocaleString('en-US') + ' Hz';
    $('#gainVal').textContent = gainEl.value + '%';
  }
  [bitsEl, rateEl, gainEl].forEach((el) => el.addEventListener('input', syncLabels));
  syncLabels();

  $$('.chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      $$('.chip').forEach((c) => c.classList.remove('is-on'));
      chip.classList.add('is-on');
      const p = chip.dataset.preset;
      if (p === 'soft') { bitsEl.value = 6; rateEl.value = 22050; driveEl.checked = false; }
      if (p === 'normal') { bitsEl.value = 4; rateEl.value = 11025; driveEl.checked = true; }
      if (p === 'hard') { bitsEl.value = 3; rateEl.value = 8000; driveEl.checked = true; }
      syncLabels();
    });
  });

  convertBtn.addEventListener('click', async () => {
    if (M1.busy || !M1.buffer) return;
    M1.busy = true;
    convertBtn.disabled = true;
    convertBtn.textContent = '处理中…';
    progressEl.hidden = false;
    progressBar.style.width = '0%';
    progressTxt.textContent = '0%';
    previewBox.hidden = true;

    try {
      const opt = readOpts();
      const res = await processBuffer(M1.buffer, opt, (p) => {
        const pct = clamp(Math.round(p * 100), 0, 100);
        progressBar.style.width = pct + '%';
        progressTxt.textContent = pct + '%';
      });

      M1.outSamples = res.samples;
      M1.outRate = res.sampleRate;

      const blob = encodeWav(res.samples, Math.round(res.sampleRate));
      M1.blob = blob;

      if (audioPreview.dataset.url) URL.revokeObjectURL(audioPreview.dataset.url);
      const url = URL.createObjectURL(blob);
      audioPreview.dataset.url = url;
      audioPreview.src = url;

      drawWave($('#wave8'), res.samples, 'cut', true);

      $('#previewMeta').innerHTML =
        opt.bits + 'BIT‧' + Math.round(res.sampleRate) + 'HZ‧MONO‧' +
        fmtTime(res.samples.length / res.sampleRate) + '‧' + fmtSize(blob.size) + '<br>' +
        '<span style="color:#f3c6dd">↑ 先点上面的播放键听一遍，确认后再导出</span>';

      progressEl.hidden = true;
      previewBox.hidden = false;
      convertBtn.textContent = '重新转换';
      convertBtn.disabled = false;
      $('#convTip').textContent = '转换完成！在下面试听，不满意可以改参数再转。';
      setTimeout(() => previewBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 120);
    } catch (err) {
      console.error(err);
      progressEl.hidden = true;
      convertBtn.disabled = false;
      convertBtn.textContent = '→ 开始转换';
      alert('转换出错了：' + err.message);
    } finally {
      M1.busy = false;
    }
  });

  $('#reConvert').addEventListener('click', () => {
    previewBox.hidden = true;
    audioPreview.pause();
    convertBtn.textContent = '→ 开始转换';
    convertBtn.disabled = false;
    dropEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

  $('#exportBtn').addEventListener('click', () => {
    if (!M1.blob) return;
    const base = (M1.file && M1.file.name ? M1.file.name : 'audio').replace(/\.[^.]+$/, '');
    download(M1.blob, base + '_8bit.wav');
    const btn = $('#exportBtn');
    const old = btn.textContent;
    btn.textContent = '√ 已开始下载';
    setTimeout(() => { btn.textContent = old; }, 1800);
  });

  /* =========================================================
     模块二：像素作曲机
     ========================================================= */
  const SEQ = {
    notes: [],
    steps: 32,
    rows: 21,
    base: 60,
    bpm: 120,
    stepDur: 0.125,
    playing: false,
    startTime: 0,
    nextTime: 0,
    nextStep: 0,
    timer: null,
    held: new Map(),
    hover: null
  };

  const rollCv = $('#roll');
  const rctx = rollCv.getContext('2d');
  const L = { w: 0, h: 0, keyW: 46, gridW: 0, stepW: 0, rowH: 0 };

  // 首次进入先放一段示例旋律，按下播放立刻就有声音
  [[72, 0, 2], [76, 2, 2], [79, 4, 2], [76, 6, 2], [74, 8, 2], [72, 10, 2], [69, 12, 4],
    [67, 16, 2], [69, 18, 2], [72, 20, 2], [76, 22, 2], [74, 24, 4], [72, 26, 2], [69, 28, 4]]
    .forEach((n) => SEQ.notes.push({ midi: n[0], step: n[1], len: n[2] }));

  const KEYMAP = [
    ['a', 0], ['w', 1], ['s', 2], ['e', 3], ['d', 4], ['f', 5], ['t', 6],
    ['g', 7], ['y', 8], ['h', 9], ['u', 10], ['j', 11], ['k', 12],
    ['o', 13], ['l', 14], ['p', 15], [';', 16]
  ];
  const charToMidi = {};
  KEYMAP.forEach(([ch, semi]) => { charToMidi[ch] = SEQ.base + semi; });
  const BLACK = [1, 3, 6, 8, 10];
  const isBlackMidi = (m) => BLACK.indexOf(((m % 12) + 12) % 12) >= 0;

  /* 键盘 UI（按真实钢琴的黑白键位置排布） */
  (function buildPiano() {
    const box = $('#piano');
    const items = KEYMAP.map(([ch, semi]) => {
      const midi = SEQ.base + semi;
      return { ch: ch, midi: midi, black: isBlackMidi(midi) };
    });
    const whites = items.filter((k) => !k.black);
    const ww = 100 / whites.length;
    const bw = ww * 0.62;
    let wi = 0;
    let whiteHtml = '';
    let blackHtml = '';

    items.forEach((k) => {
      if (k.black) return;
      whiteHtml += '<div class="key" style="left:' + (wi * ww).toFixed(3) + '%;width:' + ww.toFixed(3) +
        '%" data-midi="' + k.midi + '" data-ch="' + k.ch + '"><span>' + noteName(k.midi) + '</span></div>';
      wi++;
    });
    items.forEach((k) => {
      if (!k.black) return;
      const below = items.filter((x) => !x.black && x.midi < k.midi).length;
      blackHtml += '<div class="key black" style="left:' + (below * ww - bw / 2).toFixed(3) + '%;width:' + bw.toFixed(3) +
        '%" data-midi="' + k.midi + '" data-ch="' + k.ch + '"><span>' + noteName(k.midi) + '</span></div>';
    });
    box.innerHTML = whiteHtml + blackHtml;

    box.addEventListener('pointerdown', (e) => {
      const k = e.target.closest('.key');
      if (!k) return;
      e.preventDefault();
      const midi = Number(k.dataset.midi);
      seqNoteOn(midi, true);
      const up = () => { seqNoteOff(midi); window.removeEventListener('pointerup', up); };
      window.addEventListener('pointerup', up);
    });
  })();

  function flashKey(midi, on) {
    const el = document.querySelector('.key[data-midi="' + midi + '"]');
    if (el) el.classList.toggle('on', !!on);
  }

  /* 画布布局 */
  function layoutRoll() {
    const rect = rollCv.getBoundingClientRect();
    if (!rect.width) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    L.w = rect.width;
    L.h = rect.height;
    rollCv.width = Math.round(rect.width * dpr);
    rollCv.height = Math.round(rect.height * dpr);
    rctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    L.keyW = rect.width < 560 ? 34 : 48;
    L.gridW = L.w - L.keyW;
    L.stepW = L.gridW / SEQ.steps;
    L.rowH = L.h / SEQ.rows;
    drawRoll();
  }
  window.addEventListener('resize', () => { layoutRoll(); });
  if (window.ResizeObserver) new ResizeObserver(layoutRoll).observe(rollCv);

  function drawRoll() {
    if (!L.w || !L.h) return;
    const g = rctx;
    g.clearRect(0, 0, L.w, L.h);

    // 行
    const R = PAL.roll;
    for (let r = 0; r < SEQ.rows; r++) {
      const midi = SEQ.base + (SEQ.rows - 1 - r);
      const black = isBlackMidi(midi);
      const y = r * L.rowH;
      g.fillStyle = black ? R.rowBlack : R.rowWhite;
      g.fillRect(L.keyW, y, L.gridW, L.rowH);
      g.fillStyle = black ? R.keyBlack : R.keyWhite;
      g.fillRect(0, y, L.keyW - 2, Math.max(1, L.rowH - 1));
      if (midi % 12 === 0) {
        g.fillStyle = R.keyText;
        g.font = R.font;
        g.fillText('C' + (Math.floor(midi / 12) - 1), 5, Math.round(y + L.rowH * 0.5 + 4));
      }
    }

    // 竖线
    for (let s = 0; s <= SEQ.steps; s++) {
      const x = L.keyW + s * L.stepW;
      g.fillStyle = s % 16 === 0 ? R.vBar
        : s % 4 === 0 ? R.vBeat
          : R.vLine;
      g.fillRect(x, 0, s % 4 === 0 ? 2 : 1, L.h);
    }
    // 横线
    for (let r = 0; r <= SEQ.rows; r++) {
      const y = Math.round(r * L.rowH);
      g.fillStyle = R.hLine;
      g.fillRect(L.keyW, y, L.gridW, 1);
    }

    // hover
    if (SEQ.hover) {
      const hx = L.keyW + SEQ.hover.step * L.stepW;
      const hy = SEQ.hover.row * L.rowH;
      g.fillStyle = R.hover;
      g.fillRect(hx + 1, hy + 1, L.stepW - 2, L.rowH - 2);
    }

    // 音符块
    for (let i = 0; i < SEQ.notes.length; i++) {
      const n = SEQ.notes[i];
      const row = SEQ.rows - 1 - (n.midi - SEQ.base);
      if (row < 0 || row >= SEQ.rows) continue;
      const x = L.keyW + n.step * L.stepW + 1.5;
      const y = row * L.rowH + 1.5;
      const w = Math.max(6, n.len * L.stepW - 3);
      const h = Math.max(5, L.rowH - 3);
      const hue = PAL.noteHues[n.midi % PAL.noteHues.length];
      const sat = R.noteSat;
      const lig = R.noteLight;

      // 方块音符 + 2px 像素倒角（不做圆角，保住像素味）
      g.fillStyle = 'hsla(' + hue + ',' + sat + '%,' + lig + '%,.96)';
      g.fillRect(x, y, w, h);
      g.fillStyle = R.noteEdge;
      g.fillRect(x, y, w, 2);
      g.fillRect(x, y, 2, h);
      g.fillStyle = 'hsla(' + hue + ',' + sat + '%,' + Math.max(16, lig - 24) + '%,.60)';
      g.fillRect(x, y + h - 2, w, 2);
      g.fillRect(x + w - 2, y, 2, h);
    }

    // 播放头
    if (SEQ.playing && AC) {
      let pos = (AC.currentTime - SEQ.startTime) / SEQ.stepDur;
      if (pos >= 0) {
        pos = pos % SEQ.steps;
        const px = L.keyW + pos * L.stepW;
        const grad = g.createLinearGradient(px - 12, 0, px + 12, 0);
        grad.addColorStop(0, R.head0);
        grad.addColorStop(0.5, R.head1);
        grad.addColorStop(1, R.head0);
        g.fillStyle = grad;
        g.fillRect(px - 12, 0, 24, L.h);
        g.fillStyle = R.headLine;
        g.fillRect(Math.round(px) - 1, 0, 2, L.h);
      }
    }
  }

  (function loop() {
    drawRoll();
    requestAnimationFrame(loop);
  })();

  /* 画布交互 */
  function cellAt(evt) {
    const rect = rollCv.getBoundingClientRect();
    const x = evt.clientX - rect.left;
    const y = evt.clientY - rect.top;
    if (x < L.keyW) return null;
    const step = Math.floor((x - L.keyW) / L.stepW);
    const row = Math.floor(y / L.rowH);
    if (step < 0 || step >= SEQ.steps || row < 0 || row >= SEQ.rows) return null;
    const midi = SEQ.base + (SEQ.rows - 1 - row);
    return { step, row, midi };
  }

  rollCv.addEventListener('pointermove', (e) => {
    const c = cellAt(e);
    SEQ.hover = c ? { step: c.step, row: c.row } : null;
  });
  rollCv.addEventListener('pointerleave', () => { SEQ.hover = null; });

  rollCv.addEventListener('pointerdown', (e) => {
    const c = cellAt(e);
    if (!c) return;
    e.preventDefault();
    toggleCell(c.midi, c.step);
  });
  rollCv.addEventListener('contextmenu', (e) => e.preventDefault());

  function toggleCell(midi, step) {
    const idx = SEQ.notes.findIndex((n) => n.midi === midi && n.step === step);
    if (idx >= 0) {
      SEQ.notes.splice(idx, 1);
    } else {
      SEQ.notes.push({ midi: midi, step: step, len: 2 });
      const c = ac();
      if (c) playNote(c, MASTER, midi, c.currentTime, 0.2, { type: $('#voice').value, gain: 0.16 });
    }
  }

  /* 走带 */
  function seqStepDur() { return 60 / SEQ.bpm / 4; }

  function scheduleStep(step, when) {
    const c = AC;
    if (!c) return;
    const type = $('#voice').value;
    for (let i = 0; i < SEQ.notes.length; i++) {
      const n = SEQ.notes[i];
      if (n.step !== step) continue;
      playNote(c, MASTER, n.midi, when, n.len * SEQ.stepDur * 0.92, { type: type, gain: 0.17 });
    }
    if ($('#drum').checked) {
      if (step % 8 === 0) kick(c, MASTER, when);
      if (step % 8 === 4) kick(c, MASTER, when);
      if (step % 4 === 2) hat(c, MASTER, when);
      if (step % 2 === 1 && step % 4 !== 2) hat(c, MASTER, when);
    }
  }

  function scheduler() {
    if (!AC) return;
    const horizon = AC.currentTime + 0.16;
    let guard = 0;
    while (SEQ.nextTime < horizon && guard++ < 200) {
      scheduleStep(SEQ.nextStep % SEQ.steps, SEQ.nextTime);
      SEQ.nextTime += SEQ.stepDur;
      SEQ.nextStep++;
    }
  }

  function startSeq() {
    const c = ac();
    if (!c) return;
    SEQ.stepDur = seqStepDur();
    SEQ.startTime = c.currentTime + 0.12;
    SEQ.nextTime = SEQ.startTime;
    SEQ.nextStep = 0;
    SEQ.playing = true;
    if (SEQ.timer) clearInterval(SEQ.timer);
    SEQ.timer = setInterval(scheduler, 25);
    scheduler();
    $('#playIcon').classList.add('is-pause');
    $('#playTxt').textContent = '暂停';
    $('#playBtn').classList.add('is-on');
    $('#rollTip').classList.add('hide');
  }

  function stopSeq() {
    SEQ.playing = false;
    if (SEQ.timer) { clearInterval(SEQ.timer); SEQ.timer = null; }
    SEQ.held.clear();
    $('#playIcon').classList.remove('is-pause');
    $('#playTxt').textContent = '播放';
    $('#playBtn').classList.remove('is-on');
    $$('.key').forEach((k) => k.classList.remove('on'));
  }

  $('#playBtn').addEventListener('click', () => {
    if (SEQ.playing) stopSeq(); else startSeq();
  });

  $('#bpm').addEventListener('input', () => {
    SEQ.bpm = Number($('#bpm').value);
    $('#bpmVal').textContent = SEQ.bpm;
    SEQ.stepDur = seqStepDur();
    if (SEQ.playing) { stopSeq(); startSeq(); }
  });

  $('#clearBtn').addEventListener('click', () => {
    SEQ.notes = [];
    flashTip('谱子清空啦，重新来一段 ♪');
  });

  $('#voice').addEventListener('change', () => {
    const c = ac();
    if (c) playNote(c, MASTER, 72, c.currentTime, 0.35, { type: $('#voice').value, gain: 0.16 });
  });

  function flashTip(text) {
    const tip = $('#rollTip');
    tip.textContent = text;
    tip.classList.remove('hide');
    clearTimeout(flashTip._t);
    flashTip._t = setTimeout(() => tip.classList.add('hide'), 2200);
  }

  /* 演奏 / 录制 */
  function seqNoteOn(midi, fromMouse) {
    const c = ac();
    if (!c) return;
    flashKey(midi, true);

    if (SEQ.playing) {
      const pos = (c.currentTime - SEQ.startTime) / SEQ.stepDur;
      if (pos < 0) return;
      const step = Math.floor(pos) % SEQ.steps;
      if (SEQ.held.has(midi)) return;
      SEQ.held.set(midi, { step: step, t0: c.currentTime });
    }
    playNote(c, MASTER, midi, c.currentTime, 0.16, {
      type: $('#voice').value,
      gain: 0.18,
      send: 0.12,
      sendNode: DELAY
    });
  }

  function seqNoteOff(midi) {
    flashKey(midi, false);
    const h = SEQ.held.get(midi);
    if (!h) return;
    SEQ.held.delete(midi);
    const c = AC;
    if (!c) return;
    let len = Math.round((c.currentTime - h.t0) / SEQ.stepDur);
    len = clamp(len, 1, SEQ.steps - h.step);
    addNote(midi, h.step, len);
  }

  function addNote(midi, step, len) {
    const ex = SEQ.notes.find((n) => n.midi === midi && n.step === step);
    if (ex) { ex.len = Math.max(ex.len, len); return; }
    SEQ.notes.push({ midi: midi, step: step, len: len });
  }

  /* 键盘事件 */
  const isTyping = (e) => {
    const t = e.target;
    return t && (t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
  };

  window.addEventListener('keydown', (e) => {
    if (isTyping(e)) return;
    if (e.key === 'Escape') { startUp(); return; }

    if (currentPanel === 2) {
      const ch = e.key.toLowerCase();
      const midi = charToMidi[ch];
      if (midi == null) return;
      if (e.repeat) return;
      e.preventDefault();
      seqNoteOn(midi, false);
    } else if (currentPanel === 3) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'Shift' || e.key === 'Control' || e.key === 'Alt' || e.key === 'Meta'
        || e.key === 'Tab' || e.key === 'CapsLock' || e.key.startsWith('Arrow')
        || e.key === 'F5' || e.key === 'F12' || e.key === 'Escape') return;
      if (e.repeat) return;
      e.preventDefault();
      luckyHit(e.shiftKey);
    }
  });

  window.addEventListener('keyup', (e) => {
    if (isTyping(e)) return;
    if (currentPanel !== 2) return;
    const midi = charToMidi[e.key.toLowerCase()];
    if (midi == null) return;
    seqNoteOff(midi);
  });

  /* 导出成 WAV */
  $('#exportSong').addEventListener('click', async () => {
    if (!SEQ.notes.length) { flashTip('先写几个音符再导出呀 ♪'); return; }
    const btn = $('#exportSong');
    btn.textContent = '渲染中…';
    btn.disabled = true;
    try {
      const dur = SEQ.steps * SEQ.stepDur + 0.8;
      const sr = 44100;
      const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
      const off = new OAC(1, Math.ceil(dur * sr), sr);
      const dest = off.createGain();
      dest.gain.value = 0.85;
      dest.connect(off.destination);

      const type = $('#voice').value;
      SEQ.notes.forEach((n) => {
        playNote(off, dest, n.midi, n.step * SEQ.stepDur, n.len * SEQ.stepDur * 0.92, { type: type, gain: 0.17 });
      });
      if ($('#drum').checked) {
        for (let s = 0; s < SEQ.steps; s++) {
          const t = s * SEQ.stepDur;
          if (s % 8 === 0 || s % 8 === 4) kick(off, dest, t);
          if (s % 4 === 2 || (s % 2 === 1 && s % 4 !== 2)) hat(off, dest, t);
        }
      }

      const buf = await off.startRendering();
      const blob = encodeWav(buf.getChannelData(0), sr);
      download(blob, '8bit_land_track.wav');
      btn.textContent = '√ 已下载';
    } catch (err) {
      console.error(err);
      alert('导出失败：' + err.message);
    } finally {
      setTimeout(() => { btn.textContent = '↓ 存成 WAV'; btn.disabled = false; }, 1500);
    }
  });

  /* =========================================================
     模块三：随心和声 + 像素粒子
     ========================================================= */
  /* ---------------------------------------------------------
     调式表
     tones / avoid 都用「级数」（0 = 主音），和声与旋律共用一套级数，
     所以旋律音永远不会和和弦打起来。
     8 小节 = 两句话：前 4 小节收在属和弦上（半开放终止），
     后 4 小节收在主音上（真正的终止）—— 终止式由弱到强。
     --------------------------------------------------------- */
  const MODES = {
    major: {
      name: '大调‧明亮',
      semis: [0, 2, 4, 5, 7, 9, 11],
      lo: 2, hi: 11, apex: 9,
      contour: [4, 6, 7, 6, 6, 9, 8, 7],
      cad4: 1, cad8: 0,
      bars: [
        { name: 'C', tones: [0, 2, 4], avoid: [3] },
        { name: 'Am', tones: [5, 0, 2], avoid: [6] },
        { name: 'F', tones: [3, 5, 0], avoid: [6] },
        { name: 'G', tones: [4, 6, 1], avoid: [3] },
        { name: 'C', tones: [0, 2, 4], avoid: [3] },
        { name: 'Em', tones: [2, 4, 6], avoid: [3] },
        { name: 'F', tones: [3, 5, 0], avoid: [6] },
        { name: 'G7', tones: [4, 6, 1, 3], avoid: [] }
      ]
    },
    minor: {
      name: '小调‧温柔',
      semis: [0, 2, 3, 5, 7, 8, 10],
      lo: 2, hi: 10, apex: 8,
      contour: [4, 6, 7, 6, 6, 8, 7, 7],
      cad4: 1, cad8: 0,
      bars: [
        { name: 'Cm', tones: [0, 2, 4], avoid: [5] },
        { name: 'Ab', tones: [5, 0, 2], avoid: [1] },
        { name: 'Eb', tones: [2, 4, 6], avoid: [1] },
        { name: 'B♭', tones: [6, 1, 3], avoid: [] },
        { name: 'Ab', tones: [5, 0, 2], avoid: [1] },
        { name: 'Fm', tones: [3, 5, 0], avoid: [1] },
        { name: 'Gm', tones: [4, 6, 1], avoid: [] },
        { name: 'Cm', tones: [0, 2, 4], avoid: [5] }
      ]
    },
    dorian: {
      name: '多利亚‧慵懒',
      semis: [0, 2, 3, 5, 7, 9, 10],
      lo: 2, hi: 10, apex: 9,
      contour: [4, 6, 7, 6, 6, 9, 7, 7],
      cad4: 5, cad8: 0,
      bars: [
        { name: 'Cm7', tones: [0, 2, 4, 6], avoid: [] },
        { name: 'F', tones: [3, 5, 0], avoid: [6] },
        { name: 'B♭', tones: [6, 1, 3], avoid: [] },
        { name: 'F', tones: [3, 5, 0], avoid: [6] },
        { name: 'Cm7', tones: [0, 2, 4, 6], avoid: [] },
        { name: 'Gm', tones: [4, 6, 1], avoid: [] },
        { name: 'F', tones: [3, 5, 0], avoid: [6] },
        { name: 'Cm7', tones: [0, 2, 4, 6], avoid: [] }
      ]
    },
    hira: {
      name: '都节‧和风',
      semis: [0, 2, 3, 7, 8],
      lo: 1, hi: 8, apex: 6,
      contour: [3, 4, 5, 4, 4, 6, 5, 5],
      cad4: 4, cad8: 0,
      bars: [
        { name: 'Cm', tones: [0, 2, 3], avoid: [] },
        { name: 'Cm', tones: [0, 2, 3], avoid: [] },
        { name: 'A♭', tones: [4, 0, 2], avoid: [] },
        { name: 'A♭', tones: [4, 0, 2], avoid: [] },
        { name: 'Cm', tones: [0, 2, 3], avoid: [] },
        { name: 'A♭', tones: [4, 0, 2], avoid: [] },
        { name: 'Cm', tones: [0, 2, 3], avoid: [] },
        { name: 'Cm', tones: [0, 2, 3], avoid: [] }
      ]
    }
  };

  const MEL = { notes: [], i: 0, bar: 0, count: 0, mode: 'major' };
  const BAR_COUNT = 8;
  const NOTES_PER_BAR = 4;

  const curMode = () => MODES[MEL.mode] || MODES.major;
  const clsOf = (m, d) => { const L = m.semis.length; return ((d % L) + L) % L; };
  function degToMidi(m, d) {
    const L = m.semis.length;
    const oct = Math.floor(d / L);
    return 60 + oct * 12 + m.semis[((d % L) + L) % L];
  }
  function nearestCls(m, center, cls) {
    let best = null, bd = 1e9;
    for (let d = m.lo; d <= m.hi; d++) {
      if (clsOf(m, d) !== cls) continue;
      const dist = Math.abs(d - center);
      if (dist < bd) { bd = dist; best = d; }
    }
    if (best == null) {                     // 音域里没有这个级数就放宽一档
      for (let d = m.lo - 7; d <= m.hi + 7; d++) {
        if (clsOf(m, d) !== cls) continue;
        const dist = Math.abs(d - center);
        if (dist < bd) { bd = dist; best = d; }
      }
    }
    return best == null ? clamp(Math.round(center), m.lo, m.hi) : best;
  }

  /* 在约束下挑一个音级：
     强拍只允许和弦音（硬约束）→ 级进优先 → 大跳后反向级进
     → 跨度不超过六度 → 避开三全音与避用音 → 往旋律轮廓靠 */
  const STEP_W = [-5, 18, 11, 2, -6, -13, -20];
  function pickDegree(m, ctx) {
    const prevMidi = degToMidi(m, ctx.prev);

    function build(strict) {
      const list = [];
      for (let d = m.lo; d <= m.hi; d++) {
        const cls = clsOf(m, d);
        const ivl = Math.abs(d - ctx.prev);
        const tone = ctx.chord.tones.indexOf(cls) >= 0;
        const semis = Math.abs(degToMidi(m, d) - prevMidi);

        if (strict) {
          if (ctx.strong && !tone) continue;   // 强拍必须是和弦音
          if (ivl > 5) continue;               // 不超过六度
          if (semis > 9) continue;
        }

        let s = 0;
        // 弱拍允许经过音 / 辅助音
        s += tone ? (ctx.strong ? 30 : 10) : (ctx.strong ? -24 : 4);
        // 避用音（比如 C 和弦上的 F）
        if (ctx.chord.avoid.indexOf(cls) >= 0) s -= ctx.strong ? 32 : 10;
        // 级进优先
        s += STEP_W[ivl] == null ? -26 : STEP_W[ivl];
        // 大跳之后必须反向级进
        if (ctx.afterLeap) {
          if (ivl !== 1) s -= 22;
          if ((d > ctx.prev ? 1 : -1) !== -ctx.leapDir) s -= 16;
        }
        // 旋律里的三全音要躲开
        if (semis === 6) s -= 18;
        // 朝当前时刻的旋律轮廓靠（目标逐音移动，旋律才会真的往上走）
        s -= Math.abs(d - ctx.center) * 4.6;
        // 别越过整首的高潮
        s -= Math.max(0, d - m.apex) * 6;
        // 不要在相邻两个音之间来回摆
        if (d === ctx.prev2) s -= 15;
        // 上上下下都摸到，不要留洞
        if (!ctx.used.has(cls) && ivl <= 2) s += 5;
        // 同音不要连着超过两次
        if (d === ctx.prev) s -= ctx.same >= 1 ? 22 : 8;

        list.push({ d: d, s: s });
      }
      return list;
    }

    let cands = build(true);
    if (!cands.length) cands = build(false);
    if (!cands.length) return ctx.prev;

    let max = -Infinity, sum = 0;
    for (let i = 0; i < cands.length; i++) if (cands[i].s > max) max = cands[i].s;
    for (let i = 0; i < cands.length; i++) { cands[i].w = Math.exp((cands[i].s - max) / 5); sum += cands[i].w; }
    let r = Math.random() * sum;
    for (let i = 0; i < cands.length; i++) { r -= cands[i].w; if (r <= 0) return cands[i].d; }
    return cands[cands.length - 1].d;
  }

  /* 生成 8 小节 × 4 拍的旋律线（音级数组） */
  function genMelody(m) {
    const L = m.semis.length;
    const total = BAR_COUNT * NOTES_PER_BAR;
    const out = [];
    const used = new Set();
    let prev = m.contour[0] - 1;
    let prev2 = prev;
    let leapDir = 0;
    let same = 0;

    for (let idx = 0; idx < total; idx++) {
      const bar = Math.floor(idx / NOTES_PER_BAR);
      const beat = idx % NOTES_PER_BAR;
      // 这一拍的目标高度 = 上一小节中心 → 下一小节中心的线性插值
      const from = m.contour[bar];
      const to = m.contour[Math.min(bar + 1, BAR_COUNT - 1)];
      const center = from + (to - from) * (beat / NOTES_PER_BAR);
      let d;

      if (idx === total - 1) {
        // 导音级进上行解决到主音（B→C），终止才够「落地」
        const stepUp = prev + 1;
        d = (stepUp >= m.lo && stepUp <= m.hi && clsOf(m, stepUp) === m.cad8)
          ? stepUp
          : nearestCls(m, center, m.cad8);
      } else if (idx === total - 2) {
        d = nearestCls(m, center - 1, L - 1);         // 导音
      } else if (beat === NOTES_PER_BAR - 1 && bar === 3) {
        d = nearestCls(m, prev, m.cad4);              // 半终止：就近落，不落主音
      } else {
        d = pickDegree(m, {
          prev: prev, prev2: prev2, chord: m.bars[bar], strong: beat === 0,
          center: center, used: used, same: same,
          afterLeap: leapDir !== 0, leapDir: leapDir
        });
      }

      const ivl = Math.abs(d - prev);
      if (ivl >= 3) leapDir = d > prev ? 1 : -1;
      else if (ivl > 0) leapDir = 0;
      same = d === prev ? same + 1 : 0;
      used.add(clsOf(m, d));
      out.push(d);
      prev2 = prev;
      prev = d;
    }
    return out;
  }

  function newSong() {
    MEL.notes = genMelody(curMode());
    MEL.i = 0;
    MEL.bar = 0;
  }

  /* 8 小节的和弦条 */
  const chordStrip = $('#chordStrip');
  function markBar() {
    if (!chordStrip) return;
    const chips = chordStrip.children;
    for (let i = 0; i < chips.length; i++) chips[i].classList.toggle('on', i === MEL.bar);
  }
  function rebuildStrip() {
    if (!chordStrip) return;
    chordStrip.innerHTML = curMode().bars.map((b, i) =>
      '<span class="chord-chip" data-i="' + i + '">' + b.name + '<small>' + (i + 1) + '</small></span>'
    ).join('');
    markBar();
  }
  rebuildStrip();
  if (chordStrip) {
    chordStrip.addEventListener('pointerdown', (e) => {
      const el = e.target.closest('.chord-chip');
      if (!el) return;
      e.stopPropagation();
      MEL.bar = Number(el.dataset.i);
      MEL.i = MEL.bar * NOTES_PER_BAR;
      markBar();
      playPad();
      updateStats();
      const r = el.getBoundingClientRect();
      spawnShape(r.left + r.width / 2 - 20, r.top - 34);
    });
  }

  function updateStats() {
    const m = curMode();
    $('#chordName').textContent = m.bars[MEL.bar % BAR_COUNT].name;
    $('#barPos').textContent = (MEL.bar + 1) + ' / ' + BAR_COUNT;
    $('#scaleName').textContent = m.name;
    $('#hitCount').textContent = MEL.count;
  }

  /* 和声垫：低音 + 三音五音，慢起音、低通，软一点 */
  function playPad() {
    const c = ac();
    if (!c || !DELAY) return;
    const m = curMode();
    const L = m.semis.length;
    const ch = m.bars[MEL.bar % BAR_COUNT];
    const t = c.currentTime;

    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 1750;
    lp.Q.value = 0.3;
    lp.connect(MASTER);
    const send = c.createGain();
    send.gain.value = 0.45;
    lp.connect(send);
    send.connect(DELAY);

    ch.tones.slice(0, 3).forEach((cls, i) => {
      const oct = i === 0 ? -1 : 0;
      const osc = c.createOscillator();
      osc.type = i === 0 ? 'triangle' : 'sine';
      osc.frequency.value = mtof(degToMidi(m, cls + L * oct));
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(i === 0 ? 0.05 : 0.033, t + 0.8);
      g.gain.linearRampToValueAtTime(0.0001, t + 3.2);
      osc.connect(g);
      g.connect(lp);
      osc.start(t);
      osc.stop(t + 3.4);
    });
  }

  function startLucky() {
    ac();
    if (!MEL.notes.length) newSong();
    rebuildStrip();
    updateStats();
  }
  function stopLucky() {
    /* 旋律跟着敲击走，没有定时器需要清 */
  }

  function luckyHit(octaveUp) {
    const c = ac();
    if (!c) return;
    if (!MEL.notes.length) newSong();

    const md = curMode();
    const idx = MEL.i % MEL.notes.length;
    const bar = Math.floor(idx / NOTES_PER_BAR);
    const d = MEL.notes[idx];
    const t = c.currentTime;

    // 走到下一小节就把和声换掉：旋律与和弦永远同步
    if (bar !== MEL.bar) {
      MEL.bar = bar;
      markBar();
      if ($('#padLoop').checked) playPad();
    }

    let midi = degToMidi(md, d);
    if (octaveUp) midi += 12;

    // 主旋律
    playNote(c, MASTER, midi, t, 0.62, { type: 'pulse', gain: 0.155, send: 0.3, sendNode: DELAY });
    // 下方三度：比空五度更甜
    if (Math.random() < 0.5) {
      playNote(c, MASTER, degToMidi(md, d - 2), t + 0.012, 0.5, {
        type: 'triangle', gain: 0.058, send: 0.2, sendNode: DELAY
      });
    }
    // 偶尔一个高八度的亮点
    if (Math.random() < 0.16) {
      playNote(c, MASTER, midi + 12, t + 0.02, 0.36, {
        type: 'sine', gain: 0.045, send: 0.3, sendNode: DELAY
      });
    }
    // 偶尔一个上方邻音做装饰
    if (Math.random() < 0.15) {
      playNote(c, MASTER, degToMidi(md, d + 1), t + 0.1, 0.1, { type: 'pulse', gain: 0.07 });
    }

    MEL.i = (idx + 1) % MEL.notes.length;
    MEL.count++;
    updateStats();
    $('#luckyHint').textContent = '♪ 就这样，随便按 —— 你已经在写歌了';

    // 吉祥物跳一下
    const ms = $('#mascot');
    ms.classList.remove('hop');
    void ms.offsetWidth;
    ms.classList.add('hop');

    // 粒子
    spawnShape();
    if (Math.random() < 0.22) spawnFirework();
  }

  $('#resetLucky').addEventListener('click', () => {
    MEL.count = 0;
    newSong();
    rebuildStrip();
    updateStats();
    $('#luckyHint').textContent = '点屏幕，或者随便敲键盘';
    particles.length = 0;
  });
  $('#scale').addEventListener('change', () => {
    MEL.mode = $('#scale').value;
    MEL.count = 0;
    newSong();
    rebuildStrip();
    updateStats();
    playPad();
  });
  $('#padLoop').addEventListener('change', () => {
    if ($('#padLoop').checked && currentPanel === 3) playPad();
  });

  // 点击 / 触摸也能发声（手机上没有实体键盘）
  const luckyBox = $('.lucky');
  if (luckyBox) {
    luckyBox.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.btn, select, label, input, .lucky-controls, .lucky-stats, .chord-strip')) return;
      luckyHit(e.shiftKey);
    });
  }

  /* ---------------- 像素粒子系统 ---------------- */
  const SHAPES = {
    star: ['0001000', '0001000', '0111110', '1111111', '0011100', '0110110', '1100011'],
    sparkle: ['00100', '00100', '11111', '00100', '00100'],
    heart: ['0110110', '1111111', '1111111', '0111110', '0011100', '0001000'],
    bloom: ['0001000', '0011100', '0111110', '1110111', '0111110', '0011100', '0001000'],
    diamond: ['0001000', '0011100', '0111110', '1111111', '0111110', '0011100', '0001000'],
    note: ['00110', '00101', '00100', '01100', '11100', '11100', '01100']
  };
  const SHAPE_KEYS = Object.keys(SHAPES);

  const fxCv = $('#fx');
  const fxg = fxCv.getContext('2d');
  let FXW = 0, FXH = 0;
  const particles = [];

  function resizeFx() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    FXW = window.innerWidth;
    FXH = window.innerHeight;
    fxCv.width = Math.round(FXW * dpr);
    fxCv.height = Math.round(FXH * dpr);
    fxg.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resizeFx();
  window.addEventListener('resize', resizeFx);

  function spawnShape(atX, atY) {
    const key = pick(SHAPE_KEYS);
    particles.push({
      kind: 'shape',
      m: SHAPES[key],
      x: atX == null ? rnd(30, Math.max(60, FXW - 110)) : atX,
      y: atY == null ? rnd(70, Math.max(100, FXH - 140)) : atY,
      px: rndInt(3, 7),
      color: pick(PAL.fx),
      born: performance.now(),
      ttl: rnd(1100, 1900),
      drift: rnd(-14, 14),
      rise: rnd(-28, -6),
      rot: rnd(-0.18, 0.18)
    });
  }

  function spawnFirework() {
    const cx = rnd(80, Math.max(100, FXW - 80));
    const cy = rnd(90, Math.max(120, FXH - 160));
    const color = pick(PAL.fx);
    const n = rndInt(10, 14);
    for (let i = 0; i < n; i++) {
      const a = (Math.PI * 2 * i) / n + rnd(-0.2, 0.2);
      const sp = rnd(60, 150);
      particles.push({
        kind: 'spark',
        x: cx, y: cy,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        size: rndInt(2, 4),
        color: Math.random() < 0.25 ? '#ffffff' : color,
        born: performance.now(),
        ttl: rnd(600, 1000)
      });
    }
  }

  const easeOutBack = (t) => {
    const c1 = 1.70158, c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  };

  let lastT = performance.now();
  function fxLoop(now) {
    const dt = Math.min(64, now - lastT) / 1000;
    lastT = now;
    fxg.clearRect(0, 0, FXW, FXH);

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      const age = now - p.born;
      const k = age / p.ttl;
      if (k >= 1) { particles.splice(i, 1); continue; }

      if (p.kind === 'shape') {
        const sc = easeOutBack(clamp(k / 0.28, 0, 1));
        const alpha = k < 0.72 ? 1 : 1 - (k - 0.72) / 0.28;
        const cx = p.x + p.drift * k;
        const cy = p.y + p.rise * k;
        const rows = p.m.length;
        const cols = p.m[0].length;
        const w = cols * p.px * sc;
        const h = rows * p.px * sc;

        fxg.save();
        fxg.translate(cx + w / 2, cy + h / 2);
        fxg.rotate(p.rot * k);
        fxg.globalAlpha = alpha;
        fxg.fillStyle = p.color;
        fxg.shadowColor = p.color;
        fxg.shadowBlur = 7;
        const px = p.px * sc;
        const ox = -w / 2, oy = -h / 2;
        for (let r = 0; r < rows; r++) {
          for (let c2 = 0; c2 < cols; c2++) {
            if (p.m[r][c2] === '1') fxg.fillRect(ox + c2 * px, oy + r * px, px + 0.5, px + 0.5);
          }
        }
        // 内部小白点，看起来更闪
        fxg.shadowBlur = 0;
        fxg.globalAlpha = alpha * 0.85;
        fxg.fillStyle = '#ffffff';
        fxg.fillRect(ox + px * 0.5, oy + px * 0.5, Math.max(1, px * 0.5), Math.max(1, px * 0.5));
        fxg.restore();
      } else {
        p.vy += 320 * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        fxg.globalAlpha = (1 - k) * 0.95;
        fxg.fillStyle = p.color;
        fxg.fillRect(p.x, p.y, p.size, p.size);
      }
    }
    fxg.globalAlpha = 1;
    requestAnimationFrame(fxLoop);
  }
  requestAnimationFrame(fxLoop);

  /* =========================================================
     像素小怪兽吉祥物
     ========================================================= */
  (function drawMascot() {
    const cv = $('#mascot');
    const g = cv.getContext('2d');
    const M = [
      '................',
      '................',
      '.....######.....',
      '...###**#####...',
      '..##**########..',
      '..############..',
      '.###EE####EE###.',
      '.###EW####EW###.',
      '.##############.',
      '.#BB#M####M#BB#.',
      '.#####MMMM#####.',
      '..############..',
      '..############..',
      '...##########...',
      '.....######.....',
      '................'
    ];
    let blinkOn = false;

    function rgb(h) {
      return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
    }
    function mix(a, b, t) {
      const A = rgb(a);
      const B = rgb(b);
      return 'rgb(' + Math.round(A[0] + (B[0] - A[0]) * t) + ',' +
        Math.round(A[1] + (B[1] - A[1]) * t) + ',' +
        Math.round(A[2] + (B[2] - A[2]) * t) + ')';
    }

    function paint() {
      const C = PAL.mascot || PALETTES.vapor.mascot;
      g.clearRect(0, 0, 16, 16);
      for (let r = 0; r < 16; r++) {
        for (let c = 0; c < 16; c++) {
          const ch = M[r][c];
          if (ch === '.') continue;
          let color;
          if (ch === '#') color = mix(C.body0, C.body1, r / 15);
          else if (ch === '*') color = C.hi;
          else if (ch === 'W') color = '#ffffff';
          else if (ch === 'E') color = blinkOn ? C.eyeOpen : C.eye;
          else if (ch === 'B') color = C.blush;
          else if (ch === 'M') color = C.mouth;
          g.fillStyle = color;
          g.fillRect(c, r, 1, 1);
        }
      }
      if (blinkOn) {
        g.fillStyle = C.eye;
        g.fillRect(4, 7, 2, 1);
        g.fillRect(10, 7, 2, 1);
      }
    }

    mascotPaint = paint;
    paint();
    setInterval(() => {
      if (Math.random() < 0.35) {
        blinkOn = true;
        paint();
        setTimeout(() => { blinkOn = false; paint(); }, 140);
      }
    }, 2600);
  })();

  /* =========================================================
     杂项
     ========================================================= */
  // 首次全局点击也尝试解锁音频（部分浏览器策略）
  window.addEventListener('pointerdown', function once() {
    ac();
    window.removeEventListener('pointerdown', once);
  }, { once: true });

  // 离开页面时释放预览 URL
  window.addEventListener('beforeunload', () => {
    if (audioPreview.dataset.url) URL.revokeObjectURL(audioPreview.dataset.url);
  });

})();
