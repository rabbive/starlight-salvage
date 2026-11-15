// Starlight Salvage — screenshot states (?shot=title|play|action|win).
// These jump the game into a composed, playable state using the same state
// machine and rendering as real play, so screenshots are genuine renders.
// This ships in the game; it changes nothing about how the game plays.

import { ASTEROID, CRYSTAL, MINE, VIEW } from './config.js';
import { burst, makeAsteroid, makeCrystal, makeMine } from './entities.js';
import { STATES, setupWave, startRun } from './world.js';

function placeAsteroid(game, x, y, radius, wave) {
  const a = makeAsteroid(x, y, radius, wave);
  a.vx = (Math.random() - 0.5) * 40;
  a.vy = (Math.random() - 0.5) * 40;
  game.asteroids.push(a);
}

/** Jump the game to the state named by the ?shot= URL parameter. Returns true when one applied. */
export function applyShotParam(game) {
  const params = new URLSearchParams(window.location.search);
  const shot = params.get('shot');
  if (!shot) return false;

  if (shot === 'title') {
    game.state = STATES.TITLE;
    return true;
  }

  if (shot === 'play') {
    startRun(game);
    // A calm mid-wave-1 moment: some cargo already aboard, field in view.
    game.crystalsCollected = 2;
    game.stats.crystals = 2;
    game.score = 240;
    game.crystals = game.crystals.slice(0, 4);
    game.ship.x = VIEW.width * 0.42;
    game.ship.y = VIEW.height * 0.62;
    game.ship.angle = -Math.PI / 3;
    game.ship.vx = 60;
    game.ship.vy = -40;
    game.message = '';
    game.messageTimer = 0;
    return true;
  }

  if (shot === 'action') {
    startRun(game);
    setupWave(game, 3);
    game.score = 1850;
    game.crystalsCollected = 4;
    game.stats.crystals = 4;
    game.time = 96;
    // A tense frame: the ship threads a cluster of rocks and armed mines
    // with crystals glittering nearby and a fresh explosion going off.
    game.ship.x = VIEW.width * 0.5;
    game.ship.y = VIEW.height * 0.58;
    game.ship.angle = -Math.PI / 2.4;
    game.ship.vx = 90;
    game.ship.vy = -70;
    game.ship.hull = 62;
    game.asteroids = [];
    placeAsteroid(game, 560, 330, 44, 3);
    placeAsteroid(game, 700, 260, 38, 3);
    placeAsteroid(game, 760, 430, 30, 3);
    placeAsteroid(game, 430, 470, 26, 3);
    placeAsteroid(game, 880, 330, 46, 3);
    placeAsteroid(game, 300, 300, 22, 3);
    game.crystals = [
      makeCrystal(620, 300),
      makeCrystal(830, 480),
      makeCrystal(480, 240),
    ];
    game.mines = [makeMine(690, 350), makeMine(540, 430)];
    game.mines[0].fuse = 0.45; // visibly armed, about to blow
    burst(game.particles, 930, 300, '#ff8a5c', 22, 240, 0.8, 4);
    burst(game.particles, 560, 330, '#8d7d6b', 10, 120, 0.6, 3);
    game.message = '';
    game.messageTimer = 0;
    return true;
  }

  if (shot === 'win') {
    startRun(game);
    setupWave(game, 5);
    game.crystalsCollected = game.crystalsTotal;
    game.stats.crystals = 34;
    game.stats.asteroidsDestroyed = 41;
    game.stats.shots = 120;
    game.stats.hits = 87;
    game.score = 12480;
    game.time = 287;
    game.ship.hull = 74;
    game.ship.x = VIEW.width / 2;
    game.ship.y = 220;
    game.ship.angle = -Math.PI / 2;
    game.crystals = [];
    game.asteroids = [];
    game.mines = [];
    game.dockOpen = true;
    game.state = STATES.VICTORY;
    return true;
  }

  return false;
}
