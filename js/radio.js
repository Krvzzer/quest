// Nippon Radio — reproductor integrado de YouTube Live (Lo-fi Live) para Nippon Quest.
// No descarga ni reproduce audio hasta una interacción explícita del usuario.

const STORAGE_KEY = 'nippon:radio';
const YOUTUBE_VIDEO_ID = '1Tl2FtV06qo';
const YOUTUBE_WATCH_URL = `https://www.youtube.com/live/${YOUTUBE_VIDEO_ID}`;
const YOUTUBE_IFRAME_API_URL = 'https://www.youtube.com/iframe_api';

const svg = (body, size = 18) =>
  `<svg viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true" focusable="false">${body}</svg>`;

const ICONS = {
  play: svg('<path d="M8 5v14l11-7z" fill="currentColor"/>'),
  pause: svg('<path d="M7 5h4v14H7zM13 5h4v14h-4z" fill="currentColor"/>'),
  note: svg('<path d="M9 18V6l10-2v12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="7" cy="18" r="2.5" fill="currentColor"/><circle cx="17" cy="16" r="2.5" fill="currentColor"/>'),
  close: svg('<path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'),
  external: svg('<path d="M14 5h5v5M10 14L19 5M19 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>', 14)
};

let singleton = null;
let apiLoadPromise = null;

function readPreferences() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    const savedVolume = Number.isFinite(saved.vol) ? saved.vol : saved.volume;
    const normalized = Number.isFinite(savedVolume)
      ? (savedVolume > 1 ? savedVolume / 100 : savedVolume)
      : 0.5;
    return {
      volume: Math.min(1, Math.max(0, normalized)),
      open: saved.open === true
    };
  } catch {
    return { volume: 0.5, open: false };
  }
}

function writePreferences(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ vol: state.volume, open: state.open }));
  } catch {
    // El almacenamiento puede estar restringido; se mantiene en memoria.
  }
}

function loadYouTubeIframeApi() {
  if (window.YT && typeof window.YT.Player === 'function') {
    return Promise.resolve(window.YT);
  }
  if (apiLoadPromise) {
    return apiLoadPromise;
  }

  apiLoadPromise = new Promise((resolve, reject) => {
    const previousReady = window.onYouTubeIframeAPIReady;
    const timeoutId = window.setTimeout(() => {
      apiLoadPromise = null;
      reject(new Error('Tiempo de espera agotado al cargar YouTube IFrame API.'));
    }, 12000);

    window.onYouTubeIframeAPIReady = () => {
      window.clearTimeout(timeoutId);
      if (typeof previousReady === 'function') {
        try { previousReady(); } catch {}
      }
      if (window.YT && typeof window.YT.Player === 'function') {
        resolve(window.YT);
      } else {
        apiLoadPromise = null;
        reject(new Error('YouTube IFrame API no expuso YT.Player.'));
      }
    };

    const existingScript = document.querySelector(`script[src="${YOUTUBE_IFRAME_API_URL}"]`);
    if (!existingScript) {
      const script = document.createElement('script');
      script.src = YOUTUBE_IFRAME_API_URL;
      script.async = true;
      script.onerror = () => {
        window.clearTimeout(timeoutId);
        apiLoadPromise = null;
        reject(new Error('No se pudo cargar el script de YouTube IFrame API.'));
      };
      document.head.append(script);
    }
  });

  return apiLoadPromise;
}

const CSS = `
#nq-radio{position:fixed;left:max(16px,env(safe-area-inset-left));bottom:max(16px,env(safe-area-inset-bottom));z-index:30;display:flex;align-items:flex-end;gap:10px;color:#F5ECDA;font:500 13px/1.35 Inter,system-ui,sans-serif}
#nq-radio button,#nq-radio a{font:inherit;cursor:pointer}
#nq-radio button:focus-visible,#nq-radio input:focus-visible,#nq-radio a:focus-visible{outline:2px solid #D6BD8A;outline-offset:3px}
#nq-radio .nr-fab{width:48px;height:48px;min-height:48px;flex:none;display:grid;place-items:center;border:1px solid rgba(235,167,186,.38);border-radius:50%;background:linear-gradient(145deg,#EBA7BA,#C87996);color:#1D2945;box-shadow:0 8px 24px rgba(3,7,20,.35)}
#nq-radio .nr-fab:hover{filter:brightness(1.06);transform:translateY(-1px)}
#nq-radio .nr-panel{display:grid;gap:10px;width:min(360px,calc(100vw - 88px));padding:10px 12px;border:1px solid rgba(214,189,138,.22);border-radius:18px;background:linear-gradient(145deg,rgba(29,41,69,.97),rgba(16,23,43,.97));box-shadow:0 12px 32px rgba(3,7,20,.38);backdrop-filter:blur(16px)}
#nq-radio .nr-panel[hidden]{display:none}
#nq-radio .nr-top{display:flex;align-items:center;gap:10px}
#nq-radio .nr-play{width:38px;height:38px;min-height:38px;display:grid;place-items:center;flex:none;border:1px solid rgba(235,167,186,.24);border-radius:50%;background:rgba(235,167,186,.13);color:#EBA7BA}
#nq-radio .nr-play:hover:not(:disabled){background:rgba(235,167,186,.22)}
#nq-radio .nr-play:disabled{opacity:.65;cursor:wait}
#nq-radio .nr-meta{display:grid;gap:2px;flex:1;min-width:0}
#nq-radio .nr-title{color:#F5ECDA;font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase}
#nq-radio .nr-sub{color:#EBA7BA;font-size:11px;font-weight:600}
#nq-radio .nr-status{color:var(--mut,#aeb8d0);font-size:11px}
#nq-radio .nr-actions{display:flex;align-items:center;gap:6px;flex:none}
#nq-radio .nr-ext{width:32px;height:32px;min-height:32px;display:grid;place-items:center;border-radius:50%;color:var(--mut,#aeb8d0);text-decoration:none}
#nq-radio .nr-ext:hover{background:rgba(255,255,255,.07);color:#F5ECDA}
#nq-radio .nr-close{width:32px;height:32px;min-height:32px;display:grid;place-items:center;border:0;border-radius:50%;background:transparent;color:var(--mut,#aeb8d0)}
#nq-radio .nr-close:hover{background:rgba(255,255,255,.07);color:#F5ECDA}
#nq-radio .nr-controls{display:flex;align-items:center;gap:10px}
#nq-radio .nr-vol-label{color:var(--mut,#aeb8d0);font-size:11px;flex:none}
#nq-radio .nr-volume{flex:1;min-width:70px;min-height:18px;margin:0;padding:0;accent-color:#EBA7BA;cursor:pointer}
#nq-radio .nr-embed-wrap{width:100%;max-width:240px;aspect-ratio:16/9;border-radius:10px;overflow:hidden;border:1px solid rgba(214,189,138,.18);background:#10172b}
#nq-radio .nr-embed-wrap[hidden]{display:none}
#nq-radio .nr-embed-wrap iframe{display:block;width:100%;height:100%;border:0}
#nq-radio.is-playing .nr-fab{box-shadow:0 0 0 4px rgba(235,167,186,.12),0 8px 24px rgba(3,7,20,.35)}
@media(max-width:520px){#nq-radio{left:max(10px,env(safe-area-inset-left));bottom:max(10px,env(safe-area-inset-bottom));gap:7px}#nq-radio .nr-panel{width:min(310px,calc(100vw - 74px));padding:9px 10px}#nq-radio .nr-embed-wrap{max-width:200px}#nq-radio .nr-fab{width:44px;height:44px;min-height:44px}}
@media(prefers-reduced-motion:reduce){#nq-radio *,#nq-radio *::before,#nq-radio *::after{animation:none!important;transition:none!important}}
`;

function createRadio() {
  const prefs = readPreferences();
  const state = {
    volume: prefs.volume,
    open: prefs.open,
    phase: 'idle', // 'idle' | 'loading' | 'ready' | 'playing' | 'paused' | 'error'
    errorMessage: '',
    player: null,
    playerReady: false,
    initializing: false,
    pendingPlay: false,
    hostId: `nq-yt-player-${Math.random().toString(36).slice(2, 8)}`
  };

  const root = document.createElement('div');
  root.id = 'nq-radio';
  root.innerHTML = `
    <button class="nr-fab" type="button" aria-label="Abrir Nippon Radio" aria-controls="nq-radio-panel" aria-expanded="false">${ICONS.note}</button>
    <section class="nr-panel" id="nq-radio-panel" aria-label="Nippon Radio — Lo-fi Live" hidden>
      <div class="nr-top">
        <button class="nr-play" type="button" aria-label="Reproducir Lo-fi Live" aria-pressed="false">${ICONS.play}</button>
        <div class="nr-meta">
          <span class="nr-title">Nippon Radio</span>
          <span class="nr-sub">Lo-fi Live</span>
          <span class="nr-status" role="status" aria-live="polite">Lista para reproducir</span>
        </div>
        <div class="nr-actions">
          <a class="nr-ext" href="${YOUTUBE_WATCH_URL}" target="_blank" rel="noopener noreferrer" aria-label="Abrir directo original en YouTube">${ICONS.external}</a>
          <button class="nr-close" type="button" aria-label="Ocultar Nippon Radio">${ICONS.close}</button>
        </div>
      </div>
      <div class="nr-controls">
        <span class="nr-vol-label">Volumen</span>
        <input class="nr-volume" type="range" min="0" max="100" step="1" value="${Math.round(state.volume * 100)}" aria-label="Volumen de Nippon Radio">
      </div>
      <div class="nr-embed-wrap" hidden>
        <div id="${state.hostId}"></div>
      </div>
    </section>`;
  document.body.append(root);

  const fab = root.querySelector('.nr-fab');
  const panel = root.querySelector('.nr-panel');
  const playButton = root.querySelector('.nr-play');
  const volumeInput = root.querySelector('.nr-volume');
  const statusEl = root.querySelector('.nr-status');
  const embedWrap = root.querySelector('.nr-embed-wrap');

  function getStatusText() {
    if (state.phase === 'error') {
      return state.errorMessage || 'Error al cargar el directo de YouTube.';
    }
    if (state.phase === 'loading' || state.initializing) {
      return 'Cargando…';
    }
    if (state.phase === 'playing') {
      return 'Reproduciendo';
    }
    if (state.phase === 'paused') {
      return 'En pausa';
    }
    return 'Lista para reproducir';
  }

  function render() {
    const isPlaying = state.phase === 'playing';
    const isBusy = state.phase === 'loading' || state.initializing;

    root.classList.toggle('is-playing', isPlaying);
    panel.hidden = !state.open;
    embedWrap.hidden = !state.open || (!state.player && !state.initializing);

    fab.setAttribute('aria-expanded', String(state.open));
    fab.setAttribute('aria-label', state.open ? 'Cerrar Nippon Radio' : 'Abrir Nippon Radio');

    playButton.innerHTML = isPlaying ? ICONS.pause : ICONS.play;
    playButton.disabled = isBusy;
    playButton.setAttribute('aria-label', isPlaying ? 'Pausar Lo-fi Live' : 'Reproducir Lo-fi Live');
    playButton.setAttribute('aria-pressed', String(isPlaying));

    statusEl.textContent = getStatusText();
  }

  function applyVolumeToPlayer() {
    if (!state.player || !state.playerReady || typeof state.player.setVolume !== 'function') return;
    const volInt = Math.round(state.volume * 100);
    try {
      state.player.setVolume(volInt);
      if (volInt > 0 && typeof state.player.isMuted === 'function' && state.player.isMuted()) {
        state.player.unMute();
      }
    } catch (err) {
      console.warn('[Nippon Radio] No se pudo aplicar el volumen:', err);
    }
  }

  function mapYouTubeError(code) {
    if (code === 2) return 'Parámetro inválido en el reproductor de YouTube.';
    if (code === 5) return 'Error de reproducción HTML5 en YouTube.';
    if (code === 100) return 'El directo de YouTube no está disponible.';
    if (code === 101 || code === 150) return 'El directo no permite reproducción incrustada en este sitio.';
    return 'No se pudo reproducir el directo de YouTube.';
  }

  async function ensurePlayer(shouldPlayAfterReady = false) {
    if (shouldPlayAfterReady) {
      state.pendingPlay = true;
    }

    if (state.player) {
      if (state.playerReady && state.pendingPlay) {
        state.pendingPlay = false;
        triggerPlay();
      }
      render();
      return;
    }

    if (state.initializing) {
      render();
      return;
    }

    state.initializing = true;
    state.phase = 'loading';
    state.errorMessage = '';
    render();

    try {
      const YT = await loadYouTubeIframeApi();
      if (!document.getElementById(state.hostId)) {
        throw new Error('Contenedor del reproductor no encontrado.');
      }

      const origin = window.location.origin && window.location.origin.startsWith('http')
        ? window.location.origin
        : undefined;

      state.player = new YT.Player(state.hostId, {
        width: '240',
        height: '135',
        videoId: YOUTUBE_VIDEO_ID,
        playerVars: {
          autoplay: 0,
          playsinline: 1,
          rel: 0,
          ...(origin ? { origin } : {})
        },
        events: {
          onReady: event => {
            state.playerReady = true;
            state.initializing = false;
            applyVolumeToPlayer();
            if (state.pendingPlay) {
              state.pendingPlay = false;
              triggerPlay();
            } else {
              state.phase = 'ready';
              render();
            }
          },
          onStateChange: event => {
            const YTState = window.YT?.PlayerState;
            if (!YTState) return;
            if (event.data === YTState.PLAYING) {
              state.phase = 'playing';
              state.errorMessage = '';
            } else if (event.data === YTState.PAUSED) {
              state.phase = 'paused';
            } else if (event.data === YTState.BUFFERING) {
              state.phase = 'loading';
            } else if (event.data === YTState.ENDED) {
              state.phase = 'paused';
            } else if (event.data === YTState.CUED) {
              if (state.phase !== 'playing') state.phase = 'ready';
            }
            render();
          },
          onError: event => {
            state.initializing = false;
            state.pendingPlay = false;
            state.phase = 'error';
            state.errorMessage = mapYouTubeError(event?.data);
            console.warn('[Nippon Radio] Error del reproductor de YouTube:', event?.data);
            render();
          }
        }
      });
    } catch (err) {
      state.initializing = false;
      state.pendingPlay = false;
      state.phase = 'error';
      state.errorMessage = 'No se pudo cargar YouTube. Verificá tu conexión.';
      console.warn('[Nippon Radio] Fallo al inicializar YouTube:', err);
      render();
    }
  }

  function triggerPlay() {
    if (!state.player || !state.playerReady || typeof state.player.playVideo !== 'function') {
      ensurePlayer(true);
      return;
    }
    state.errorMessage = '';
    state.phase = 'loading';
    render();
    applyVolumeToPlayer();
    try {
      state.player.playVideo();
    } catch (err) {
      state.phase = 'error';
      state.errorMessage = 'El navegador bloqueó o impidió iniciar la reproducción.';
      console.warn('[Nippon Radio] playVideo falló:', err);
      render();
    }
  }

  function triggerPause() {
    state.pendingPlay = false;
    if (!state.player || !state.playerReady || typeof state.player.pauseVideo !== 'function') {
      state.phase = 'paused';
      render();
      return;
    }
    try {
      state.player.pauseVideo();
      state.phase = 'paused';
    } catch (err) {
      console.warn('[Nippon Radio] pauseVideo falló:', err);
    }
    render();
  }

  fab.addEventListener('click', () => {
    state.open = !state.open;
    writePreferences(state);
    render();
    if (state.open) {
      ensurePlayer(false);
      playButton.focus();
    }
  });

  playButton.addEventListener('click', () => {
    if (state.phase === 'playing') {
      triggerPause();
    } else {
      ensurePlayer(true);
    }
  });

  root.querySelector('.nr-close').addEventListener('click', () => {
    state.open = false;
    state.pendingPlay = false;
    writePreferences(state);
    render();
    fab.focus();
  });

  volumeInput.addEventListener('input', () => {
    state.volume = Number(volumeInput.value) / 100;
    writePreferences(state);
    applyVolumeToPlayer();
  });

  const style = document.createElement('style');
  style.id = 'nq-radio-styles';
  style.textContent = CSS;
  document.head.append(style);

  render();
  if (state.open) {
    ensurePlayer(false);
  }
  return root;
}

export function initRadio() {
  if (singleton?.isConnected) return singleton;
  const existing = document.getElementById('nq-radio');
  if (existing) {
    singleton = existing;
    return singleton;
  }
  singleton = createRadio();
  return singleton;
}
