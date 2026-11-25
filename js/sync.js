import { SUPABASE_URL as RAW_URL, SUPABASE_ANON_KEY } from './supabase-config.js';
import { get, exportData, importMerge, setAfterSave } from './store.js';

// La URL tiene que ser la del proyecto; si quedó con /rest/v1/ al final, se corrige sola.
const SUPABASE_URL = typeof RAW_URL === 'string' ? RAW_URL.trim().replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '') : '';
// supabase-js se carga bajo demanda: si el CDN falla o no hay conexión, el juego sigue funcionando.
let createClient = null;
let client = null;
let state = 'Sin iniciar sesión';
let revision = 0;
let busy = false;
let suppressAutoSync = false;
let timer = null;
let initialized = false;

const validConfig = () =>
  typeof SUPABASE_URL === 'string' &&
  /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(SUPABASE_URL) &&
  typeof SUPABASE_ANON_KEY === 'string' &&
  SUPABASE_ANON_KEY.length > 20;

function requireClient() {
  if (!client) throw new Error('La sincronización no está disponible ahora (sin conexión o bloqueada). Probá de nuevo más tarde.');
  return client;
}

export function config() {
  return validConfig();
}

export function status() {
  return state;
}

export function isBusy() {
  return busy;
}

export async function init() {
  if (initialized) return;
  initialized = true;

  if (!validConfig()) {
    state = 'Falta configurar Supabase';
    return;
  }

  try {
    ({ createClient } = await import('https://esm.sh/@supabase/supabase-js@2'));
  } catch (error) {
    state = 'Sincronización no disponible (sin conexión)';
    initialized = false; // permite reintentar más tarde
    console.warn('[Nippon Quest] No se pudo cargar supabase-js:', error);
    return;
  }

  client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  });

  setAfterSave(() => {
    if (!suppressAutoSync) scheduleSync();
  });

  const { data, error } = await client.auth.getSession();
  if (error) {
    state = 'Error de autenticación';
    throw error;
  }

  if (data.session) {
    state = 'Sesión activa';
    scheduleSync(300);
  } else {
    state = 'Sin iniciar sesión';
  }

  client.auth.onAuthStateChange((event, session) => {
    if (session) {
      state = 'Sesión activa';
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        scheduleSync(500);
      }
    } else {
      state = 'Sin iniciar sesión';
      revision = 0;
      clearTimeout(timer);
    }
  });
}

export async function login(email, password) {
  const sb = requireClient();
  const e = String(email || '').trim();

  if (!e || !String(password || '')) {
    throw new Error('Ingresá tu correo y contraseña.');
  }

  state = 'Iniciando sesión…';

  const { data, error } = await sb.auth.signInWithPassword({
    email: e,
    password: String(password)
  });

  if (error) {
    state = 'No se pudo iniciar sesión';
    throw new Error(error.message);
  }

  if (!data.session) {
    state = 'No se recibió una sesión válida';
    throw new Error('Supabase no devolvió una sesión válida.');
  }

  state = 'Sesión activa';
  await syncNow();
  return data;
}

export async function logout() {
  const sb = requireClient();
  clearTimeout(timer);

  const { error } = await sb.auth.signOut();
  if (error) throw error;

  revision = 0;
  state = 'Sesión cerrada';
}

function scheduleSync(delay = 1800) {
  if (!client || suppressAutoSync) return;

  clearTimeout(timer);
  timer = setTimeout(() => {
    syncNow().catch(error => {
      state = 'Error de sincronización: ' + error.message;
      console.error('[Nippon Quest] Sincronización automática:', error);
    });
  }, delay);
}

async function currentUser() {
  const sb = requireClient();
  const { data, error } = await sb.auth.getUser();
  if (error) throw error;
  if (!data.user) throw new Error('Primero iniciá sesión.');
  return data.user;
}

async function readRemote(userId) {
  const sb = requireClient();

  const { data, error } = await sb
    .from('user_progress')
    .select('revision,data,updated_at')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function writeRemote(data, expectedRevision) {
  const sb = requireClient();

  const { data: result, error } = await sb.rpc('save_my_progress', {
    p_data: data,
    p_expected_revision: expectedRevision
  });

  if (error) {
    if (String(error.message).includes('REVISION_CONFLICT')) {
      const conflict = new Error('El progreso remoto cambió mientras sincronizabas. No se sobrescribió.');
      conflict.conflict = true; // syncNow lo reintenta solo (combina de nuevo y reescribe)
      throw conflict;
    }
    throw error;
  }

  const row = Array.isArray(result) ? result[0] : result;
  if (!row || !Number.isFinite(Number(row.revision))) {
    throw new Error('Supabase no confirmó la nueva revisión.');
  }

  return Number(row.revision);
}

export async function syncNow() {
  if (busy) return;
  const sb = requireClient();

  busy = true;
  state = 'Sincronizando…';

  try {
   for (let n = 0; ; n++) {
    try {
    const user = await currentUser();
    const remote = await readRemote(user.id);

    if (!remote) {
      const localData = JSON.parse(exportData());
      revision = await writeRemote(localData, 0);
      state = 'Sincronizado · revisión ' + revision;
      return;
    }

    const remoteRevision = Number(remote.revision);
    if (!Number.isSafeInteger(remoteRevision) || remoteRevision < 1) {
      throw new Error('La revisión remota no es válida. No se modificó ningún dato.');
    }

    if (!remote.data || typeof remote.data !== 'object') {
      throw new Error('El progreso remoto no tiene un formato válido.');
    }

    // Combina el progreso remoto con el local usando el importador existente.
    // Se suspende el guardado automático durante esta operación para evitar bucles.
    suppressAutoSync = true;
    try {
      importMerge(JSON.stringify(remote.data), false);
    } finally {
      suppressAutoSync = false;
    }

    // Se guarda la combinación únicamente si la revisión remota sigue igual.
    const mergedData = JSON.parse(exportData());
    revision = await writeRemote(mergedData, remoteRevision);
    state = 'Sincronizado · revisión ' + revision;
    break;
    } catch (e) {
      if (e.conflict && n < 2) continue;
      throw e;
    }
   }
  } catch (error) {
    state = 'No se pudo sincronizar';
    throw error;
  } finally {
    busy = false;
  }
}