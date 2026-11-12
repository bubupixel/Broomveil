// ---------- sound: generated live, no audio files ----------
// Oriental-magic score. prologue & night: guzheng + dizi + bells on a pentatonic scale.
// day: an original academy waltz in D minor — celesta-like bell melody, guzheng bass and glissandi, dizi B-section.
const SND = (() => {
  let ctx = null, master, musicBus, sfxBus, verb, on = true, mood = 'prologue', timer = null;
  let nextT = 0, step = 0, phrase = [], lastSfx = {};
  try { on = localStorage.getItem('huachao-sound') !== 'off'; } catch (e) {}
  const MOODS = {
    prologue: {root: 62, scale: [0,2,4,7,9], bpm: 62, drone: .05, flute: .35, bell: .15, pluck: .9, bright: 2600},
    day:      {root: 62, scale: [0,3,5,7,10], bpm: 128, drone: .025, flute: .45, bell: .35, pluck: 1.0, bright: 3600, waltz: true},
    night:    {root: 59, scale: [0,3,5,7,10], bpm: 54, drone: .07, flute: .3,  bell: .6,  pluck: .7, bright: 1900},
  };
  const hz = m => 440 * Math.pow(2, (m - 69) / 12);
  const note = (M, deg, oct = 0) => { const n = M.scale.length, o = Math.floor(deg / n); return M.root + 12 * (o + oct) + M.scale.at(((deg % n) + n) % n); };

  function init(){
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = on ? .9 : 0; master.connect(ctx.destination);
    musicBus = ctx.createGain(); musicBus.gain.value = .55; sfxBus = ctx.createGain(); sfxBus.gain.value = .8;
    // simple hall reverb from a decaying noise impulse
    verb = ctx.createConvolver(); const len = ctx.sampleRate * 3, ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++){ const d = ir.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random()*2-1) * Math.pow(1 - i/len, 2.6); }
    verb.buffer = ir; const wet = ctx.createGain(); wet.gain.value = .35; verb.connect(wet); wet.connect(master);
    musicBus.connect(master); musicBus.connect(verb); sfxBus.connect(master); sfxBus.connect(verb);
    startDrone(); nextT = ctx.currentTime + .2; timer = setInterval(schedule, 90);
    if (ambKind) setTimeout(() => ambient(ambKind), 0);
  }

  // guzheng-ish pluck: bright attack, slight pitch bend down, fast decay
  function pluck(t, m, vel, bus, dur = 1.8){
    const f = hz(m), g = ctx.createGain(), lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.setValueAtTime(MOODS[mood].bright * 1.6, t); lp.frequency.exponentialRampToValueAtTime(600, t + dur);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vel, t + .004); g.gain.exponentialRampToValueAtTime(.0008, t + dur);
    [[1, 'triangle', 1], [2, 'sine', .35], [3, 'sine', .12]].forEach(([mul, type, amp]) => {
      const o = ctx.createOscillator(), a = ctx.createGain(); o.type = type;
      o.frequency.setValueAtTime(f * mul * 1.012, t); o.frequency.exponentialRampToValueAtTime(f * mul, t + .06);
      a.gain.value = amp; o.connect(a); a.connect(lp); o.start(t); o.stop(t + dur + .05);
    });
    lp.connect(g); g.connect(bus);
  }
  // dizi-ish flute: breathy sine with delayed vibrato
  function flute(t, m, dur, vel){
    const f = hz(m), o = ctx.createOscillator(), g = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain();
    o.type = 'sine'; o.frequency.value = f; lfo.frequency.value = 5.2; lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(f * .012, t + dur * .5);
    lfo.connect(lg); lg.connect(o.frequency);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vel, t + .18); g.gain.setValueAtTime(vel, t + dur - .3); g.gain.linearRampToValueAtTime(0, t + dur);
    const nb = ctx.createBufferSource(), buf = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random()*2-1; nb.buffer = buf;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f * 2; bp.Q.value = 8; const ng = ctx.createGain(); ng.gain.value = .25;
    nb.connect(bp); bp.connect(ng); ng.connect(g);
    o.connect(g); g.connect(musicBus); [o, lfo, nb].forEach(n => { n.start(t); n.stop(t + dur + .05); });
  }
  // magic bell: pure high partials, long ring
  function bell(t, m, vel, bus, dur = 2.6){
    const f = hz(m), g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vel, t + .005); g.gain.exponentialRampToValueAtTime(.0005, t + dur);
    [[1, 1], [2.76, .3], [5.4, .12]].forEach(([mul, amp]) => { const o = ctx.createOscillator(), a = ctx.createGain(); o.frequency.value = f * mul; a.gain.value = amp; o.connect(a); a.connect(g); o.start(t); o.stop(t + dur); });
    g.connect(bus);
  }
  let droneNodes = [];
  function startDrone(){
    droneNodes.forEach(n => { try { n.o.stop(); } catch(e){} }); droneNodes = [];
    const M = MOODS[mood], t = ctx.currentTime;
    [[M.root - 24, 0], [M.root - 17, 4], [M.root - 12, -5]].forEach(([m, det]) => {
      const o = ctx.createOscillator(), g = ctx.createGain(), lp = ctx.createBiquadFilter();
      o.type = 'triangle'; o.frequency.value = hz(m); o.detune.value = det; lp.type = 'lowpass'; lp.frequency.value = 500;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(M.drone, t + 3);
      o.connect(lp); lp.connect(g); g.connect(musicBus); o.start(t); droneNodes.push({o, g});
    });
  }
  // a phrase = 8 beats of pentatonic degrees, walked step by step, ending on a stable tone
  function makePhrase(){
    let d = [0, 2, 4, 5].at(Math.floor(Math.random()*4)); const p = [];
    for (let i = 0; i < 8; i++){ d += [-2,-1,-1,0,1,1,2].at(Math.floor(Math.random()*7)); d = Math.max(-1, Math.min(8, d)); p.push(Math.random() < .22 && i % 2 ? null : d); }
    p[7] = [0, 2, 5].at(Math.floor(Math.random()*3)); return p;
  }
  // ---------- 學院圓舞曲：鋼片琴般的鈴音旋律＋古箏伴奏與刮奏，三拍子、D 小調（原創） ----------
  function celesta(t, m, vel, dur = 1.3){
    const f = hz(m), g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vel, t + .003); g.gain.exponentialRampToValueAtTime(vel * .25, t + .25); g.gain.exponentialRampToValueAtTime(.0004, t + dur);
    [[1, 1, 'sine'], [2, .22, 'sine'], [4.01, .07, 'sine'], [3, .05, 'triangle']].forEach(([mul, amp, type]) => { const o = ctx.createOscillator(), a = ctx.createGain(); o.type = type; o.frequency.value = f * mul; a.gain.value = amp; o.connect(a); a.connect(g); o.start(t); o.stop(t + dur + .02); });
    g.connect(musicBus);
  }
  function pad(t, notes, dur, vel){
    const g = ctx.createGain(), lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1100; lp.Q.value = .4;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vel, t + dur * .35); g.gain.setValueAtTime(vel, t + dur * .7); g.gain.linearRampToValueAtTime(0, t + dur + .4);
    notes.forEach(m => [-7, 7].forEach(det => { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = hz(m); o.detune.value = det; o.connect(lp); o.start(t); o.stop(t + dur + .5); }));
    lp.connect(g); g.connect(musicBus);
  }
  function gliss(t, from, n, up, vel){  // 古箏刮奏：D 小調五聲音階快速掃弦
    const P = [0, 3, 5, 7, 10]; let i = 0;
    for (let k = 0; k < n; k++){ const d = up ? k : n - 1 - k, m = 62 + from * 0 + 12 * Math.floor(d / 5) + P[d % 5] + (from - 62);
      pluck(t + k * .035, m, vel * (.6 + .4 * k / n), musicBus, 1.4); i++; }
  }
  const CH = {Dm:[62,65,69,50], Bb:[62,65,70,46], Gm:[62,67,70,43], A:[61,64,67,45], F:[60,65,69,41], C:[60,64,67,48]};
  // 旋律以 [音高, 八分音符數] 記；0 為休止。每小節 6 個八分音符。
  const SECT = [
    {ch:['Dm','Bb','Gm','A','Dm','F','Gm','A'], lead:'cel', mel:[[77,1],[79,1],[81,2],[74,2], [77,1],[76,1],[74,2],[70,2], [79,1],[81,1],[82,2],[74,2], [73,2],[76,2],[81,2],
      [81,1],[82,1],[81,1],[77,1],[74,2], [84,2],[81,1],[79,1],[77,2], [82,2],[79,2],[76,2], [73,3],[76,1],[69,2]]},
    {ch:['Dm','Bb','Gm','A','Dm','F','Gm','A'], lead:'zheng', mel:[[65,1],[67,1],[69,2],[62,2], [65,1],[64,1],[62,2],[58,2], [67,1],[69,1],[70,2],[62,2], [61,2],[64,2],[69,2],
      [69,1],[70,1],[69,1],[65,1],[62,2], [72,2],[69,1],[67,1],[65,2], [70,2],[67,2],[64,2], [61,3],[64,1],[57,2]]},
    {ch:['F','C','Dm','Bb','F','C','Gm','A'], lead:'flute', mel:[[81,6], [79,4],[76,2], [77,6], [74,4],[77,2], [84,3],[81,3], [79,6], [82,4],[81,1],[79,1], [81,4],[76,2]]},
    {ch:['Dm','Bb','Gm','A','Dm','F','Gm','Dm'], lead:'both', mel:[[77,1],[79,1],[81,2],[74,2], [77,1],[76,1],[74,2],[70,2], [79,1],[81,1],[82,2],[74,2], [73,2],[76,2],[81,2],
      [81,1],[82,1],[81,1],[77,1],[74,2], [84,2],[81,1],[79,1],[77,2], [82,1],[81,1],[79,1],[76,1],[73,2], [74,6]]},
  ];
  let wStep = 0, wSec = 0, wEvents = null;
  function sectEvents(sc){ const ev = {}; let pos = 0; for (const [m, len] of sc.mel){ ev[pos] = [m, len]; pos += len; } return ev; }
  function scheduleWaltz(M){
    const e8 = 60 / M.bpm / 2;   // 八分音符長度
    while (nextT < ctx.currentTime + .35){
      const pos = wStep % 48;
      if (pos === 0){ if (wStep) wSec = (wSec + 1) % SECT.length; wEvents = sectEvents(SECT[wSec]); }
      const sc = SECT[wSec], bar = Math.floor(pos / 6), inBar = pos % 6, chord = CH[sc.ch[bar]];
      // 伴奏：第一拍古箏低音，第二、三拍輕輕的和弦（圓舞曲）
      if (inBar === 0){ pluck(nextT, chord[3], .15, musicBus, 2.2); pad(nextT, chord.slice(0, 3).map(x => x - 12), e8 * 6, .006); }
      if (inBar === 2 || inBar === 4) chord.slice(0, 3).forEach((m, i) => pluck(nextT + i * .012, m - 12 + (i ? 0 : 12), .045, musicBus, 1.1));
      // 主旋律
      const ev = wEvents[pos];
      if (ev && ev[0]){ const [m, len] = ev, dur = len * e8;
        if (sc.lead === 'cel' || sc.lead === 'both') celesta(nextT, m, .11, Math.max(1.1, dur * 1.6));
        if (sc.lead === 'zheng'){ if (len >= 2 && Math.random() < .35) pluck(nextT - .06, m - 2, .05, musicBus, .5); pluck(nextT, m, .2, musicBus, Math.max(1.4, dur * 1.5)); }
        if (sc.lead === 'both') pluck(nextT, m - 12, .1, musicBus, 1.6);
        if (sc.lead === 'flute') flute(nextT, m - 12, dur * .98, .055);
      }
      // 長笛段：鈴音分解和弦點綴
      if (sc.lead === 'flute' && inBar % 2 === 1) celesta(nextT, chord[(inBar >> 1) % 3] + 12, .045, .9);
      // 古箏段：鈴音在第三拍輕敲高八度
      if (sc.lead === 'zheng' && inBar === 4 && Math.random() < .6) celesta(nextT, chord[2] + 12, .04, 1);
      // 段落尾：古箏五聲刮奏帶入下一段
      if (pos === 46) gliss(nextT, wSec === 2 ? 50 : 62, 11, true, .07);
      nextT += e8; wStep++;
    }
  }
  function schedule(){
    if (!ctx || ctx.state !== 'running') return;
    const M = MOODS[mood], beat = 60 / M.bpm;
    if (M.waltz) return scheduleWaltz(M);
    while (nextT < ctx.currentTime + .35){
      const b = step % 8;
      if (b === 0) phrase = makePhrase();
      const d = phrase.at(b);
      // melody on guzheng, sometimes doubled by the flute
      if (d !== null) {
        pluck(nextT, note(M, d, 0), .16 * M.pluck, musicBus);
        if (b % 4 === 0 && Math.random() < M.flute) flute(nextT, note(M, d, 1), beat * 3.6, .05);
      }
      // low arpeggio roll every bar
      if (b === 0 || b === 4) [0, 2, 4].forEach((k, i) => pluck(nextT + i * beat / 6, note(M, k + (b ? 2 : 0), -1), .09 * M.pluck, musicBus, 2.4));
      // offbeat shimmer
      if (Math.random() < M.bell * .25) bell(nextT + beat / 2, note(M, 5 + Math.floor(Math.random()*5), 1), .025, musicBus);
      nextT += beat; step++;
    }
  }
  function setMood(m){
    if (!MOODS[m] || m === mood) return; mood = m;
    if (!ctx) return; const t = ctx.currentTime;
    droneNodes.forEach(n => { n.g.gain.cancelScheduledValues(t); n.g.gain.setValueAtTime(n.g.gain.value, t); n.g.gain.linearRampToValueAtTime(0, t + 1.5); n.o.stop(t + 1.6); });
    droneNodes = []; setTimeout(() => ctx && startDrone(), 400); step = step - (step % 8);
    if (MOODS[m].waltz){ wStep = 0; wSec = 0; nextT = Math.max(nextT, t + .6); }
  }
  function sfx(kind, arg){
    if (!ctx || !on) return; const t = ctx.currentTime + .01, M = MOODS.day;
    if (lastSfx[kind] && t - lastSfx[kind] < .06) return; lastSfx[kind] = t;
    switch (kind){
      case 'tap': { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(1500, t); o.frequency.exponentialRampToValueAtTime(700, t + .05);
        g.gain.setValueAtTime(.08, t); g.gain.exponentialRampToValueAtTime(.0005, t + .07); o.connect(g); g.connect(sfxBus); o.start(t); o.stop(t + .08); break; }
      case 'choose': pluck(t, note(M, 4, 0), .22, sfxBus, 1.2); pluck(t + .07, note(M, 7, 0), .2, sfxBus, 1.4); break;
      case 'petal': bell(t, note(M, 3 + (arg||0), 1), .1, sfxBus, 1.6); break;
      case 'wrong': { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'triangle'; o.frequency.setValueAtTime(hz(50), t); o.frequency.exponentialRampToValueAtTime(hz(43), t + .25);
        g.gain.setValueAtTime(.18, t); g.gain.exponentialRampToValueAtTime(.0005, t + .3); o.connect(g); g.connect(sfxBus); o.start(t); o.stop(t + .32); break; }
      case 'gain': [0, 2, 4].forEach((k, i) => bell(t + i * .08, note(M, k + 5, 0), .07, sfxBus, 1.4)); break;
      case 'aff': bell(t, note(M, 7, 0), .08, sfxBus, 2.2); bell(t + .14, note(M, 9, 0), .07, sfxBus, 2.4); break;
      case 'magic': for (let i = 0; i < 9; i++) bell(t + i * .055, note(M, i + 3, 0), .05, sfxBus, 1.8); break;
      case 'star': bell(t, note(M, 7 + (arg||0), 1), .07, sfxBus, 2.2); bell(t + .05, note(M, 9 + (arg||0), 1), .04, sfxBus, 1.8); break;
      case 'fire': { const n = ctx.createBufferSource(); n.buffer = noise(); const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.setValueAtTime(400, t); bp.frequency.exponentialRampToValueAtTime(2400, t + .25); bp.Q.value = 1.2;
        const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.25, t + .04); g.gain.exponentialRampToValueAtTime(.001, t + .4); n.connect(bp); bp.connect(g); g.connect(sfxBus); n.start(t, Math.random() * 2); n.stop(t + .45);
        pluck(t, note(M, 0, -1), .2, sfxBus, .8); break; }
      case 'leaf': { const n = ctx.createBufferSource(); n.buffer = noise(); const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 2500;
        const g = ctx.createGain(); g.gain.setValueAtTime(.0, t); g.gain.linearRampToValueAtTime(.12, t + .03); g.gain.exponentialRampToValueAtTime(.001, t + .22); n.connect(hp); hp.connect(g); g.connect(sfxBus); n.start(t, Math.random() * 2); n.stop(t + .25);
        pluck(t + .02, note(M, 4 + (arg||0), 1), .08, sfxBus, .9); break; }
      case 'page': { const n = ctx.createBufferSource(), buf = ctx.createBuffer(1, ctx.sampleRate * .18, ctx.sampleRate), d = buf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = (Math.random()*2-1) * Math.sin(Math.PI * i / d.length); n.buffer = buf;
        const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2400; bp.Q.value = .7; const g = ctx.createGain(); g.gain.value = .12;
        n.connect(bp); bp.connect(g); g.connect(sfxBus); n.start(t); break; }
    }
  }
  function toggle(){
    on = !on; try { localStorage.setItem('huachao-sound', on ? 'on' : 'off'); } catch (e) {}
    if (on) { init(); if (ctx && ctx.state !== 'running') ctx.resume(); }
    if (ctx) master.gain.setTargetAtTime(on ? .9 : 0, ctx.currentTime, .15);
    return on;
  }
  // browsers allow sound only after the player touches the screen
  const wake = () => { if (!on) return; init(); if (ctx && ctx.state !== 'running') ctx.resume(); };
  addEventListener('pointerdown', wake, true); addEventListener('keydown', wake, true);
  document.addEventListener('visibilitychange', () => { if (!ctx) return; document.hidden ? ctx.suspend() : (on && ctx.resume()); });
  // ---------- 環境音：雨、湖水、夜蟲、市集、花風（即時合成，可交叉淡入淡出） ----------
  let ambBus = null, amb = null, ambKind = '', ambTimer = null, noiseBuf = null;
  function noise(){
    if (noiseBuf) return noiseBuf;
    const len = ctx.sampleRate * 4; noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate); const d = noiseBuf.getChannelData(0);
    let b = 0; for (let i = 0; i < len; i++){ const w = Math.random() * 2 - 1; b = (b + .02 * w) / 1.02; d[i] = w * .6 + b * 3.5; }
    return noiseBuf;
  }
  function ambLayer(lp, hp, vol, bp){
    const src = ctx.createBufferSource(); src.buffer = noise(); src.loop = true;
    const g = ctx.createGain(); g.gain.value = 0;
    let node = src;
    if (hp){ const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp; node.connect(f); node = f; }
    if (bp){ const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = bp; f.Q.value = .8; node.connect(f); node = f; }
    if (lp){ const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lp; node.connect(f); node = f; }
    node.connect(g); g.connect(ambBus); src.start();
    g.gain.linearRampToValueAtTime(vol, ctx.currentTime + 2.5);
    return {src, g};
  }
  function chirp(t){ // 夜蟲：三下短促的高音
    for (let i = 0; i < 3; i++){ const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = 4300 + Math.random() * 300;
      g.gain.setValueAtTime(0, t + i * .07); g.gain.linearRampToValueAtTime(.012, t + i * .07 + .01); g.gain.linearRampToValueAtTime(0, t + i * .07 + .05);
      o.connect(g); g.connect(ambBus); o.start(t + i * .07); o.stop(t + i * .07 + .06); }
  }
  function plip(t){ // 湖水：偶爾一聲水滴
    const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(900 + Math.random() * 500, t); o.frequency.exponentialRampToValueAtTime(380, t + .12);
    g.gain.setValueAtTime(.03, t); g.gain.exponentialRampToValueAtTime(.0005, t + .18); o.connect(g); g.connect(ambBus); o.start(t); o.stop(t + .2);
  }
  function ambient(kind){
    ambKind = kind || '';
    if (!ctx) return;
    if (!ambBus){ ambBus = ctx.createGain(); ambBus.gain.value = 1; ambBus.connect(master); }
    if (amb && amb.kind === ambKind) return;
    const t = ctx.currentTime;
    if (amb){ amb.layers.forEach(l => { l.g.gain.cancelScheduledValues(t); l.g.gain.setValueAtTime(l.g.gain.value, t); l.g.gain.linearRampToValueAtTime(0, t + 1.8); l.src.stop(t + 2); }); }
    clearInterval(ambTimer); amb = {kind:ambKind, layers:[]};
    const L = amb.layers;
    if (ambKind === 'rain'){ L.push(ambLayer(5200, 900, .05)); L.push(ambLayer(900, 200, .035)); }
    else if (ambKind === 'rainIn'){ L.push(ambLayer(1400, 300, .03)); }
    else if (ambKind === 'lake'){ const l = ambLayer(420, 0, .05); L.push(l); ambTimer = setInterval(() => { if (Math.random() < .35) plip(ctx.currentTime + Math.random()); }, 1600); }
    else if (ambKind === 'night'){ L.push(ambLayer(380, 0, .02)); ambTimer = setInterval(() => { if (Math.random() < .55) chirp(ctx.currentTime + Math.random() * .5); }, 900); }
    else if (ambKind === 'lakeNight'){ L.push(ambLayer(420, 0, .04)); ambTimer = setInterval(() => { const t = ctx.currentTime; if (Math.random() < .5) chirp(t + Math.random() * .5); if (Math.random() < .25) plip(t + Math.random()); }, 1000); }
    else if (ambKind === 'market'){ const l = ambLayer(1500, 250, .035, 700); L.push(l); ambTimer = setInterval(() => { const t = ctx.currentTime; l.g.gain.setTargetAtTime(.02 + Math.random() * .03, t, .6); }, 1200); }
    else if (ambKind === 'wind'){ const l = ambLayer(2600, 300, .04, 900); L.push(l); ambTimer = setInterval(() => { l.g.gain.setTargetAtTime(.015 + Math.random() * .05, ctx.currentTime, 1.2); }, 1500); }
  }
  // ---------- 角色旋律：每個人四個音，出場時輕輕響起 ----------
  const MOTIF = {pei:[4,6,7,9], qin:[0,2,4,2], tang:[5,6,8,7], jiang:[7,9,11,9], lu:[2,4,3,0], wen:[5,7,6,8], lin:[4,3,2,4], ye:[7,5,4,2],
    ruan:[6,7,8,10], su:[9,7,8,5], liu:[2,5,4,7], ji:[3,5,7,6], bai:[10,8,7,5], gran:[0,2,4,5]};
  const motifLast = {};
  function motif(id){
    if (!ctx || !on || !MOTIF[id]) return; const t0 = ctx.currentTime + .05;
    if (motifLast[id] && t0 - motifLast[id] < 25) return; motifLast[id] = t0;
    const M = MOODS[mood];
    MOTIF[id].forEach((d, i) => { bell(t0 + i * .2, note(M, d, 0), .045, sfxBus, 1.6); if (i === 3) flute(t0 + i * .2, note(M, d, 1), 1.2, .02); });
  }
  return {sfx, setMood, toggle, ambient, motif, isOn: () => on};
})();
const NIGHT_SCENES = new Set(['夜','宿舍','宿舍・夜','花月湖・夜','花朝節・夜','觀星閣','鳶尾院','夢境']);
const PROLOGUE_SCENES = new Set(['雲溪鎮','茶館','外婆的院子','花徑']);
