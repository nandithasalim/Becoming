// Talks to the Future Self API. Everything here is a no-op when FS_CONFIG.apiBase is empty.
const CFG = window.FS_CONFIG || {};
export const apiEnabled = !!CFG.apiBase;

const KEY = 'fs_token';
const store = {
  get() { try { return localStorage.getItem(KEY); } catch { return null; } },
  set(v) { try { localStorage.setItem(KEY, v); } catch { /* storage unavailable */ } },
  clear() { try { localStorage.removeItem(KEY); } catch { /* storage unavailable */ } },
};

async function call(path, { method = 'GET', body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const token = store.get();
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(CFG.apiBase.replace(/\/$/, '') + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  if (res.status === 401) { store.clear(); throw Object.assign(new Error('signed out'), { status: 401 }); }
  if (!res.ok) throw Object.assign(new Error(await res.text()), { status: res.status });
  return res.json();
}

export const isSignedIn = () => !!store.get();
export const signOut = () => store.clear();

/** Returns { user, answers } or null when not signed in. */
export async function getMe() {
  if (!apiEnabled || !store.get()) return null;
  try { return await call('/me'); } catch (e) { if (e.status === 401) return null; throw e; }
}

export async function saveAnswers(a) {
  return call('/me/answers', { method: 'PUT', body: { display_name: a.name || '', role: a.role, place: a.place, feel: a.feel } });
}

async function finishLogin(path, body) {
  const { token, user } = await call(path, { method: 'POST', body });
  store.set(token);
  return user;
}

export const devLogin = (email, name) => finishLogin('/auth/dev', { email, name });

/** Renders Google's sign-in button into `el`; resolves with the user once signed in. */
export function googleButton(el) {
  return new Promise((resolve, reject) => {
    if (!CFG.googleClientId) return reject(new Error('Google sign-in not configured'));
    const start = () => {
      window.google.accounts.id.initialize({
        client_id: CFG.googleClientId,
        callback: (r) => finishLogin('/auth/google', { credential: r.credential }).then(resolve, reject),
      });
      window.google.accounts.id.renderButton(el, { theme: 'filled_black', size: 'large', shape: 'pill', text: 'continue_with' });
    };
    if (window.google?.accounts?.id) return start();
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client'; s.async = true; s.onload = start; s.onerror = () => reject(new Error('Could not load Google sign-in'));
    document.head.appendChild(s);
  });
}

export const config = CFG;
