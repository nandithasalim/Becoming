// Shared by chat.html and letter.html: the questions, the answer state, and the hand-off to the reveal.
import { SECTIONS, MAX_TEXT } from './questions.js';

export { SECTIONS, MAX_TEXT };

// every question, with the section it belongs to
export const QS = SECTIONS.flatMap((s) => s.qs.map((q) => ({ ...q, section: s.title, optional: !!s.optional })));
export const Q = Object.fromEntries(QS.map((q) => [q.k, q]));

// label shown for a stored value ("designer" -> "Designing"); typed answers come back as typed
export function labelOf(k, v) {
  const o = (Q[k].opts || []).find((x) => x[0] === v);
  return o ? o[1] : v;
}

// tidy a typed answer the same way the backend does
export const clean = (t, max = MAX_TEXT) => String(t || '').replace(/\s+/g, ' ').trim().slice(0, max);

// join a list for a sentence: "calm, bold and kind"
export function joinAnd(list) {
  const l = list.filter(Boolean);
  return l.length < 2 ? (l[0] || '') : l.slice(0, -1).join(', ') + ' and ' + l[l.length - 1];
}

const b64 = (o) => btoa(unescape(encodeURIComponent(JSON.stringify(o)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64 = (t) => JSON.parse(decodeURIComponent(escape(atob(t.replace(/-/g, '+').replace(/_/g, '/')))));

// answers from an earlier run (coming back from the reveal to edit), or {}
export function previousAnswers() {
  try {
    const a = new URLSearchParams(location.search).get('a');
    if (!a) return {};
    const o = unb64(a);
    return { ...o, ...(o.dream || {}) };
  } catch { return {}; }
}

// the answers in the shape the API expects
export function toBody(a) {
  const body = {
    display_name: a.display_name, current_feeling: a.current_feeling, situation: a.situation,
    role: a.role, place: a.place, feel: a.feel, traits: a.traits, let_go: a.let_go, voice: a.voice,
  };
  if (a.dream_done) body.dream = { loved_as_kid: a.loved_as_kid || [], would_try: a.would_try || '', focus_areas: a.focus_areas || [] };
  return body;
}

// go to the 3D reveal; `from` brings "edit my answers" back to the same page
export function goReveal(a, from) {
  const f = toBody(a);
  const p = new URLSearchParams({ n: f.display_name, role: f.role, place: f.place, feel: f.feel, a: b64(f), from });
  location.href = './reveal.html?' + p.toString();
}

export const wait = (ms) => new Promise((r) => setTimeout(r, ms));
export const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
