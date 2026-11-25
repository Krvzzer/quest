
import { load } from './store.js';
import { seed } from './engine.js';
import { map, init as initUI } from './ui.js';
import * as Sync from './sync.js';

load();
seed();
initUI();
map();

try {
  await Sync.init();
} catch (error) {
  console.error('[Nippon Quest] Error al iniciar sincronización:', error);
}

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .catch(error => console.error('[Nippon Quest] Service Worker:', error));
  });
}
