// Nippon Radio — lo-fi generativo para Nippon Quest.
// No descarga audio ni inicia la reproducción hasta una acción explícita.
const STORAGE_KEY = 'nippon:radio';
const BPM = 72;
const STEP = 60 / BPM / 2;
const CHORDS = [[53, 57, 60, 64], [52, 55, 59, 62], [50, 53, 57, 60], [48, 52, 55, 59]];
const BASS = [41, 40, 38, 36];
const PENTA = [72, 74, 76, 79, 81, 84];
const AudioContextClass = window.AudioContext || window.webkitAudioContext;

const hz = midi => 440 * 2 ** ((midi - 69) / 12);
const svg = (body, size = 18) => `<svg viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true" focusable="false">${body}</svg>`;
const ICONS = {
  play: svg('<path d="M8 5v14l11-7z" fill="currentColor"/>'),
  pause: svg('<path d="M7 5h4v14H7zM13 5h4v14h-4z" fill="currentColor"/>'),
  note: svg('<path d="M9 18V6l10-2v12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="7" cy="18" r="2.5" fill="currentColor"/><circle cx="17" cy="16" r="2.5" fill="currentColor"/>'),
  close: svg('<path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>')
};

let singleton = null;

function readPreferences() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return {
      volume: Number.isFinite(saved.volume) ? Math.min(1, Math.max(0, saved.volume)) : 0.5,
      open: saved.open === true
    };
  } catch {
    return { volume: 0.5, open: false };
  }
}

function writePreferences(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ volume: state.volume, open: state.open }));
  } catch {
    // El almacenamiento puede estar bloqueado; la radio sigue funcionando en memoria.
  }
}

const CSS = `
#nq-radio{position:fixed;left:max(16px,env(safe-area-inset-left));bottom:max(16px,env(safe-area-inset-bottom));z-index:30;display:flex;align-items:center;gap:10px;color:var(--txt,#f7f1f5);font:500 13px/1.35 Inter,system-ui,sans-serif}
#nq-radio button{font:inherit;cursor:pointer}
#nq-radio button:focus-visible,#nq-radio input:focus-visible{outline:2px solid var(--gold,#d6bd8a);outline-offset:3px}
#nq-radio .nr-fab{width:48px;height:48px;min-height:48px;display:grid;place-items:center;border:1px solid rgba(235,167,186,.38);border-radius:50%;background:linear-gradient(145deg,var(--sakura,#eba7ba),var(--sakura-dusk,#c87996));color:#1d2945;box-shadow:0 8px 24px rgba(3,7,20,.35)}
#nq-radio .nr-fab:hover{filter:brightness(1.06);transform:translateY(-1px)}
#nq-radio .nr-panel{display:flex;align-items:center;gap:11px;min-height:58px;padding:7px 10px 7px 7px;border:1px solid rgba(214,189,138,.22);border-radius:18px;background:linear-gradient(145deg,rgba(29,41,69,.97),rgba(16,23,43,.97));box-shadow:0 12px 32px rgba(3,7,20,.38);backdrop-filter:blur(16px)}
#nq-radio .nr-panel[hidden]{display:none}
#nq-radio .nr-play{width:40px;height:40px;min-height:40px;display:grid;place-items:center;flex:none;border:1px solid rgba(235,167,186,.24);border-radius:50%;background:rgba(235,167,186,.13);color:var(--sakura,#eba7ba)}
#nq-radio .nr-play:hover{background:rgba(235,167,186,.22)}
#nq-radio .nr-meta{display:grid;gap:3px;min-width:105px}
#nq-radio .nr-title{color:var(--paper,#f5ecda);font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase}
#nq-radio .nr-status{color:var(--mut,#aeb8d0);font-size:11px}
#nq-radio .nr-volume{width:92px;min-height:18px;margin:0;padding:0;accent-color:var(--sakura,#eba7ba);cursor:pointer}
#nq-radio .nr-close{width:32px;height:32px;min-height:32px;display:grid;place-items:center;border:0;border-radius:50%;background:transparent;color:var(--mut,#aeb8d0)}
#nq-radio .nr-close:hover{background:rgba(255,255,255,.07);color:var(--paper,#f5ecda)}
#nq-radio.is-playing .nr-fab{box-shadow:0 0 0 4px rgba(235,167,186,.1),0 8px 24px rgba(3,7,20,.35)}
@media(max-width:520px){#nq-radio{left:max(10px,env(safe-area-inset-left));bottom:max(10px,env(safe-area-inset-bottom));gap:7px}#nq-radio .nr-panel{gap:8px;padding-right:7px}#nq-radio .nr-meta{min-width:82px}#nq-radio .nr-volume{width:70px}#nq-radio .nr-fab{width:46px;height:46px;min-height:46px}}
@media(prefers-reduced-motion:reduce){#nq-radio *,#nq-radio *::before,#nq-radio *::after{animation:none!important;transition:none!important}}
`;

function createRadio() {
  const prefs = readPreferences();
  const state = {
    volume: prefs.volume,
    open: prefs.open,
    playing: false,
    starting: false,
    context: null,
    master: null,
    bus: null,
    melody: null,
    noiseBuffer: null,
    timer: null,
    suspendTimer: null,
    step: 0,
    nextTime: 0,
    started: false,
    ambientSources: []
  };

  const root = document.createElement('div');
  root.id = 'nq-radio';
  root.innerHTML = `
    <button class="nr-fab" type="button" aria-label="Abrir controles de Radio Lofi" aria-controls="nq-radio-panel" aria-expanded="false">${ICONS.note}</button>
    <section class="nr-panel" id="nq-radio-panel" aria-label="Controles de Radio Lofi" hidden>
      <button class="nr-play" type="button" aria-label="Reproducir la radio" aria-pressed="false">${ICONS.play}</button>
      <div class="nr-meta">
        <span class="nr-title">Nippon Radio</span>
        <span class="nr-status" role="status" aria-live="polite">Lista para reproducir</span>
      </div>
      <input class="nr-volume" type="range" min="0" max="100" step="1" value="${Math.round(state.volume * 100)}" aria-label="Volumen de la radio">
      <button class="nr-close" type="button" aria-label="Ocultar controles">${ICONS.close}</button>
    </section>`;
  document.body.append(root);

  const fab = root.querySelector('.nr-fab');
  const panel = root.querySelector('.nr-panel');
  const playButton = root.querySelector('.nr-play');
  const volume = root.querySelector('.nr-volume');
  const status = root.querySelector('.nr-status');

  function render() {
    root.classList.toggle('is-playing', state.playing);
    panel.hidden = !state.open;
    fab.setAttribute('aria-expanded', String(state.open));
    fab.setAttribute('aria-label', state.open ? 'Cerrar controles de Radio Lofi' : 'Abrir controles de Radio Lofi');
    playButton.innerHTML = state.playing ? ICONS.pause : ICONS.play;
    playButton.disabled = state.starting;
    playButton.setAttribute('aria-label', state.playing ? 'Pausar la radio' : 'Reproducir la radio');
    playButton.setAttribute('aria-pressed', String(state.playing));
    status.textContent = state.starting ? 'Preparando audio…' : state.playing ? 'Reproduciendo · Lo-fi generativo' : state.context ? 'En pausa' : 'Lista para reproducir';
  }

  function setMasterVolume(target) {
    if (!state.master || !state.context) return;
    const value = target ? state.volume * 0.7 : 0;
    state.master.gain.setTargetAtTime(value, state.context.currentTime, 0.06);
  }

  function makeNoiseBuffer(seconds, sampleFn) {
    const length = Math.max(1, Math.floor(state.context.sampleRate * seconds));
    const buffer = state.context.createBuffer(1, length, state.context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = sampleFn();
    return buffer;
  }

  function buildAudioGraph() {
    if (state.context) return;
    const context = new AudioContextClass();
    state.context = context;

    try {
      const master = context.createGain();
      const lowpass = context.createBiquadFilter();
      lowpass.type = 'lowpass';
      lowpass.frequency.value = 3200;
      master.gain.value = 0;
      master.connect(lowpass);
      lowpass.connect(context.destination);

      const bus = context.createGain();
      bus.connect(master);
      const melody = context.createGain();
      melody.connect(bus);

      const delay = context.createDelay(1);
      delay.delayTime.value = STEP * 3;
      const feedback = context.createGain();
      feedback.gain.value = 0.27;
      const echoLevel = context.createGain();
      echoLevel.gain.value = 0.38;
      melody.connect(delay);
      delay.connect(feedback);
      feedback.connect(delay);
      delay.connect(echoLevel);
      echoLevel.connect(bus);

      state.noiseBuffer = makeNoiseBuffer(1, () => Math.random() * 2 - 1);
      const vinylBuffer = makeNoiseBuffer(3, () => Math.random() > 0.9992 ? Math.random() * 2 - 1 : 0);

      const vinyl = context.createBufferSource();
      vinyl.buffer = vinylBuffer;
      vinyl.loop = true;
      const vinylGain = context.createGain();
      vinylGain.gain.value = 0.42;
      vinyl.connect(vinylGain);
      vinylGain.connect(bus);
      vinyl.start();

      const hiss = context.createBufferSource();
      hiss.buffer = state.noiseBuffer;
      hiss.loop = true;
      const hissFilter = context.createBiquadFilter();
      hissFilter.type = 'highpass';
      hissFilter.frequency.value = 4000;
      const hissGain = context.createGain();
      hissGain.gain.value = 0.004;
      hiss.connect(hissFilter);
      hissFilter.connect(hissGain);
      hissGain.connect(bus);
      hiss.start();

      state.master = master;
      state.bus = bus;
      state.melody = melody;
      state.ambientSources = [vinyl, hiss];
    } catch (error) {
      context.close().catch(() => {});
      state.context = null;
      state.master = state.bus = state.melody = state.noiseBuffer = null;
      state.ambientSources = [];
      throw error;
    }
  }

  function disconnectOnEnd(source, nodes) {
    source.addEventListener('ended', () => {
      try { source.disconnect(); } catch {}
      nodes.forEach(node => { try { node.disconnect(); } catch {} });
    }, { once: true });
  }

  function tone(frequency, time, duration, type, gain, destination = state.bus) {
    const context = state.context;
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    envelope.gain.setValueAtTime(0.0001, time);
    envelope.gain.linearRampToValueAtTime(gain, time + 0.03);
    envelope.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    oscillator.connect(envelope);
    envelope.connect(destination);
    disconnectOnEnd(oscillator, [envelope]);
    oscillator.start(time);
    oscillator.stop(time + duration + 0.05);
  }

  function hit(time, duration, gain, filterType, cutoff) {
    const context = state.context;
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const envelope = context.createGain();
    source.buffer = state.noiseBuffer;
    filter.type = filterType;
    filter.frequency.value = cutoff;
    envelope.gain.setValueAtTime(gain, time);
    envelope.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    source.connect(filter);
    filter.connect(envelope);
    envelope.connect(state.bus);
    disconnectOnEnd(source, [filter, envelope]);
    source.start(time, Math.random() * 0.5);
    source.stop(time + duration + 0.02);
  }

  function kick(time) {
    const context = state.context;
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    oscillator.frequency.setValueAtTime(130, time);
    oscillator.frequency.exponentialRampToValueAtTime(42, time + 0.18);
    envelope.gain.setValueAtTime(0.7, time);
    envelope.gain.exponentialRampToValueAtTime(0.0001, time + 0.32);
    oscillator.connect(envelope);
    envelope.connect(state.bus);
    disconnectOnEnd(oscillator, [envelope]);
    oscillator.start(time);
    oscillator.stop(time + 0.35);
  }

  function playStep(step, time) {
    const bar = (step >> 3) & 3;
    const beat = step & 7;
    const at = time + (beat & 1 ? STEP * 0.16 : 0);
    if (beat === 0) CHORDS[bar].forEach((note, index) => tone(hz(note), at + index * 0.025, 2.8, 'triangle', 0.05));
    if (beat === 0 || beat === 5) {
      tone(hz(BASS[bar]), at, 0.9, 'sine', 0.28);
      kick(at);
    }
    if (beat === 2 || beat === 6) hit(at, 0.16, 0.14, 'bandpass', 1800);
    hit(at, 0.04, beat & 1 ? 0.045 : 0.028, 'highpass', 7500);
    if (beat % 2 === 0 && Math.random() < 0.4) {
      const note = PENTA[(Math.random() * PENTA.length) | 0];
      tone(hz(note), at, 1.2, 'sine', 0.06, state.melody);
    }
  }

  function schedule() {
    if (!state.context || state.context.state !== 'running' || !state.playing) return;
    const now = state.context.currentTime;
    if (state.nextTime < now - 0.15) state.nextTime = now + 0.05;
    while (state.nextTime < now + 0.8) {
      playStep(state.step, state.nextTime);
      state.nextTime += STEP;
      state.step = (state.step + 1) % 32;
    }
  }

  async function start() {
    if (state.playing || state.starting) return;
    state.starting = true;
    render();
    try {
      if (state.suspendTimer) {
        clearTimeout(state.suspendTimer);
        state.suspendTimer = null;
      }
      buildAudioGraph();
      await state.context.resume();
      if (state.context.state !== 'running') throw new Error('El navegador no permitió iniciar el audio.');
      if (!state.started) {
        state.nextTime = state.context.currentTime + 0.1;
        state.started = true;
      }
      state.playing = true;
      setMasterVolume(true);
      clearInterval(state.timer);
      schedule();
      state.timer = setInterval(schedule, 200);
    } catch (error) {
      console.error('[Nippon Radio] No se pudo iniciar el audio:', error);
      status.textContent = 'No se pudo iniciar el audio. Revisá los permisos del navegador.';
    } finally {
      state.starting = false;
      render();
    }
  }

  function stop() {
    if (!state.playing) return;
    state.playing = false;
    clearInterval(state.timer);
    state.timer = null;
    setMasterVolume(false);
    const context = state.context;
    if (state.suspendTimer) clearTimeout(state.suspendTimer);
    state.suspendTimer = setTimeout(() => {
      state.suspendTimer = null;
      if (!state.playing && state.context === context && context?.state === 'running') {
        context.suspend().catch(error => console.warn('[Nippon Radio] No se pudo pausar el contexto:', error));
      }
    }, 320);
    render();
  }

  fab.addEventListener('click', () => {
    state.open = !state.open;
    writePreferences(state);
    render();
    if (state.open) playButton.focus();
  });

  playButton.addEventListener('click', () => {
    if (state.playing) stop();
    else start();
  });

  root.querySelector('.nr-close').addEventListener('click', () => {
    state.open = false;
    writePreferences(state);
    render();
    fab.focus();
  });

  volume.addEventListener('input', () => {
    state.volume = Number(volume.value) / 100;
    setMasterVolume(state.playing);
    writePreferences(state);
  });

  const style = document.createElement('style');
  style.id = 'nq-radio-styles';
  style.textContent = CSS;
  document.head.append(style);

  render();
  return root;
}

export function initRadio() {
  if (singleton?.isConnected) return singleton;
  if (!AudioContextClass) {
    console.warn('[Nippon Radio] Web Audio API no está disponible en este navegador.');
    return null;
  }
  const existing = document.getElementById('nq-radio');
  if (existing) {
    singleton = existing;
    return singleton;
  }
  singleton = createRadio();
  return singleton;
}
