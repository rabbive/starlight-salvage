// Starlight Salvage — keyboard and mouse input.
// Tracks held keys, the mouse position, and one-shot "pressed" edges so the
// game loop can react to a key going down exactly once.

import { KEYS } from './config.js';

const held = new Set();
const pressed = new Set();

export const mouse = { x: 0, y: 0, clicked: false, clickedAt: { x: 0, y: 0 } };

function keyMatches(list, code) {
  return list.includes(code);
}

export function initInput(canvas) {
  window.addEventListener('keydown', (e) => {
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
      e.preventDefault(); // keep the page from scrolling on Space / arrows
    }
    if (!e.repeat) pressed.add(e.code);
    held.add(e.code);
  });
  window.addEventListener('keyup', (e) => held.delete(e.code));
  window.addEventListener('blur', () => {
    held.clear();
    pressed.clear();
  });

  canvas.addEventListener('mousemove', (e) => {
    const r = canvas.getBoundingClientRect();
    mouse.x = ((e.clientX - r.left) / r.width) * canvas.width;
    mouse.y = ((e.clientY - r.top) / r.height) * canvas.height;
  });
  canvas.addEventListener('mousedown', (e) => {
    const r = canvas.getBoundingClientRect();
    mouse.clicked = true;
    mouse.clickedAt.x = ((e.clientX - r.left) / r.width) * canvas.width;
    mouse.clickedAt.y = ((e.clientY - r.top) / r.height) * canvas.height;
  });
}

/** True while any key in the list is held down. */
export function isHeld(list) {
  return list.some((code) => held.has(code));
}

/** True once for the frame after a key in the list goes down. */
export function wasPressed(list) {
  return list.some((code) => pressed.has(code));
}

/** Convenience: the current thrust direction as a unit-ish vector. */
export function thrustVector() {
  let x = 0;
  let y = 0;
  if (isHeld(KEYS.thrustLeft)) x -= 1;
  if (isHeld(KEYS.thrustRight)) x += 1;
  if (isHeld(KEYS.thrustUp)) y -= 1;
  if (isHeld(KEYS.thrustDown)) y += 1;
  if (x !== 0 && y !== 0) {
    const inv = 1 / Math.hypot(x, y);
    x *= inv;
    y *= inv;
  }
  return { x, y };
}

/** Consume the one-shot edges at the end of each frame. */
export function endFrameInput() {
  pressed.clear();
  mouse.clicked = false;
}

/** Expose held keys for tests / debugging without reaching into internals. */
export function debugHeldKeys() {
  return [...held];
}
