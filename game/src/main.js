// Starlight Salvage — entry point: game loop, state transitions, input wiring.
// The loop runs at the display's refresh rate with a clamped delta so a
// backgrounded tab never jumps the simulation forward.

import { KEYS, SHIP, VIEW } from './config.js';
import { endFrameInput, initInput, isHeld, mouse, thrustVector, wasPressed } from './input.js';
import { render } from './render.js';
import { applyShotParam } from './shots.js';
import { STATES, createGame, startRun, updateGame } from './world.js';
import { isMuted, setMuted, sfx, unlockAudio } from './audio.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = VIEW.width;
canvas.height = VIEW.height;

const game = createGame();
initInput(canvas);
applyShotParam(game);

// Expose the live game object so an automated play-test can inspect state.
window.__starlight = game;

function dashDirection() {
  const dx = mouse.clickedAt.x - game.ship.x;
  const dy = mouse.clickedAt.y - game.ship.y;
  const len = Math.hypot(dx, dy);
  if (len < 8) return null;
  return { x: dx / len, y: dy / len };
}

function handleGlobalKeys() {
  if (wasPressed(KEYS.mute)) {
    setMuted(!isMuted());
    game.muted = isMuted();
  }
  if (wasPressed(KEYS.restart)) {
    if (game.state !== STATES.TITLE) {
      startRun(game);
      sfx.click();
    }
    return;
  }
  if (wasPressed(KEYS.pause)) {
    if (game.state === STATES.PLAYING) {
      game.state = STATES.PAUSED;
      sfx.click();
    } else if (game.state === STATES.PAUSED) {
      game.state = STATES.PLAYING;
      sfx.click();
    }
  }
}

function handleStateKeys() {
  if (game.state === STATES.TITLE) {
    if (wasPressed(KEYS.start) || mouse.clicked) {
      unlockAudio();
      startRun(game);
      sfx.click();
    }
    return;
  }
  if (game.state === STATES.GAME_OVER || game.state === STATES.VICTORY) {
    if (wasPressed(KEYS.start) || wasPressed(KEYS.restart) || mouse.clicked) {
      unlockAudio();
      startRun(game);
      sfx.click();
    }
  }
}

let last = performance.now();

function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  // updateGame owns the clock: it advances in every state, so the title
  // screen twinkles and the end screens pulse even while not playing.

  handleGlobalKeys();
  handleStateKeys();

  let actions = { thrust: { x: 0, y: 0 }, fire: false, dash: null };
  if (game.state === STATES.PLAYING) {
    if (isHeld(KEYS.fire)) {
      // Firing also counts as the gesture that unlocks audio.
      unlockAudio();
    }
    actions = {
      thrust: thrustVector(),
      fire: isHeld(KEYS.fire),
      dash:
        mouse.clicked && game.ship.dashCooldown <= 0 && game.ship.dashTimer <= 0
          ? dashDirection()
          : null,
    };
    if (actions.dash) sfx.dash();
  }

  updateGame(game, dt, actions);
  render(ctx, game);
  endFrameInput();
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
