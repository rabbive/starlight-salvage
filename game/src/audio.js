// Starlight Salvage — synthesized sound effects.
// Every sound is built from WebAudio oscillators / filtered noise at runtime.
// No audio files, no network. Created lazily on the first user gesture so
// browsers allow the AudioContext to start.

let ctx = null;
let master = null;
let muted = false;

function ensureContext() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = 0.35;
  master.connect(ctx.destination);
  return ctx;
}

/** Call from any user gesture (key / click) so audio is allowed to start. */
export function unlockAudio() {
  const c = ensureContext();
  if (c && c.state === 'suspended') void c.resume();
}

export function setMuted(value) {
  muted = value;
  if (master) master.gain.value = value ? 0 : 0.35;
}
export function isMuted() {
  return muted;
}

function tone({ freq = 440, freqEnd = null, type = 'sine', dur = 0.15, vol = 0.5, delay = 0 }) {
  if (muted) return;
  const c = ensureContext();
  if (!c) return;
  const t0 = c.currentTime + delay;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (freqEnd !== null) osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqEnd), t0 + dur);
  gain.gain.setValueAtTime(vol, t0);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  osc.connect(gain);
  gain.connect(master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

function noise({ dur = 0.3, vol = 0.5, cutoff = 1200, delay = 0 }) {
  if (muted) return;
  const c = ensureContext();
  if (!c) return;
  const t0 = c.currentTime + delay;
  const len = Math.max(1, Math.floor(c.sampleRate * dur));
  const buffer = c.createBuffer(1, len, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = c.createBufferSource();
  src.buffer = buffer;
  const filter = c.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = cutoff;
  const gain = c.createGain();
  gain.gain.setValueAtTime(vol, t0);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  src.connect(filter);
  filter.connect(gain);
  gain.connect(master);
  src.start(t0);
}

export const sfx = {
  shoot() {
    tone({ freq: 880, freqEnd: 320, type: 'square', dur: 0.09, vol: 0.22 });
  },
  pickup() {
    tone({ freq: 660, type: 'sine', dur: 0.1, vol: 0.4 });
    tone({ freq: 990, type: 'sine', dur: 0.16, vol: 0.4, delay: 0.07 });
  },
  explosion(big = false) {
    noise({ dur: big ? 0.55 : 0.3, vol: big ? 0.7 : 0.45, cutoff: big ? 900 : 1600 });
    tone({ freq: 160, freqEnd: 40, type: 'triangle', dur: big ? 0.5 : 0.3, vol: 0.5 });
  },
  hit() {
    tone({ freq: 220, freqEnd: 90, type: 'sawtooth', dur: 0.18, vol: 0.5 });
    noise({ dur: 0.12, vol: 0.3, cutoff: 2500 });
  },
  dash() {
    noise({ dur: 0.16, vol: 0.3, cutoff: 3200 });
    tone({ freq: 300, freqEnd: 700, type: 'sine', dur: 0.14, vol: 0.25 });
  },
  dock() {
    tone({ freq: 523, type: 'sine', dur: 0.12, vol: 0.4 });
    tone({ freq: 659, type: 'sine', dur: 0.12, vol: 0.4, delay: 0.1 });
    tone({ freq: 784, type: 'sine', dur: 0.22, vol: 0.4, delay: 0.2 });
  },
  waveClear() {
    [523, 659, 784, 1047].forEach((f, i) =>
      tone({ freq: f, type: 'triangle', dur: 0.18, vol: 0.4, delay: i * 0.09 }),
    );
  },
  gameOver() {
    [392, 330, 262, 196].forEach((f, i) =>
      tone({ freq: f, type: 'triangle', dur: 0.3, vol: 0.4, delay: i * 0.16 }),
    );
  },
  victory() {
    [523, 659, 784, 1047, 1319].forEach((f, i) =>
      tone({ freq: f, type: 'triangle', dur: 0.25, vol: 0.4, delay: i * 0.11 }),
    );
  },
  mineBeep() {
    tone({ freq: 1200, type: 'square', dur: 0.06, vol: 0.25 });
  },
  click() {
    tone({ freq: 500, type: 'sine', dur: 0.06, vol: 0.3 });
  },
};
