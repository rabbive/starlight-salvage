// Starlight Salvage — the world: game state, wave setup, collisions, scoring.
// The main loop calls createGame() once and updateGame(game, dt) every frame;
// this module decides what happens when things touch each other.

import {
  ASTEROID,
  COLORS,
  CRYSTAL,
  MINE,
  MOTHERSHIP,
  SCORE,
  SHIP,
  VIEW,
  WAVES,
} from './config.js';
import {
  burst,
  circlesHit,
  distance,
  makeAsteroid,
  makeBullet,
  makeCrystal,
  makeMine,
  makeShip,
  updateAsteroid,
  updateBullet,
  updateCrystal,
  updateMine,
  updateParticle,
  updateShip,
} from './entities.js';
import { sfx } from './audio.js';

export const STATES = {
  TITLE: 'title',
  PLAYING: 'playing',
  PAUSED: 'paused',
  GAME_OVER: 'gameover',
  VICTORY: 'victory',
};

export function createGame() {
  return {
    state: STATES.TITLE,
    time: 0, // seconds since the run started (playing time only)
    wave: 1,
    score: 0,
    crystalsCollected: 0,
    crystalsTotal: 0,
    dockOpen: false,
    ship: makeShip(),
    asteroids: [],
    crystals: [],
    mines: [],
    bullets: [],
    particles: [],
    stars: makeStarfield(140),
    message: '', // short banner shown centre-screen ("Wave 2", ...)
    messageTimer: 0,
    waveClearTimer: 0, // counts down the pause between waves
    stats: { shots: 0, hits: 0, crystals: 0, asteroidsDestroyed: 0 },
    muted: false,
  };
}

function makeStarfield(count) {
  const stars = [];
  for (let i = 0; i < count; i++) {
    stars.push({
      x: Math.random() * VIEW.width,
      y: Math.random() * VIEW.height,
      size: 0.6 + Math.random() * 1.8,
      twinkle: Math.random() * Math.PI * 2,
      speed: 4 + Math.random() * 10, // slow downward drift
    });
  }
  return stars;
}

/** A spawn point at least `minDist` from the ship and clear of the mothership. */
function randomSpawnPoint(game, minDist = 180) {
  for (let tries = 0; tries < 40; tries++) {
    const x = 60 + Math.random() * (VIEW.width - 120);
    const y = 160 + Math.random() * (VIEW.height - 220);
    if (Math.hypot(x - game.ship.x, y - game.ship.y) < minDist) continue;
    if (Math.hypot(x - MOTHERSHIP.x, y - MOTHERSHIP.y) < MOTHERSHIP.dockRadius + 60) continue;
    return { x, y };
  }
  return { x: VIEW.width / 2, y: VIEW.height / 2 + 100 };
}

export function startRun(game) {
  game.state = STATES.PLAYING;
  game.time = 0;
  game.wave = 1;
  game.score = 0;
  game.stats = { shots: 0, hits: 0, crystals: 0, asteroidsDestroyed: 0 };
  game.ship = makeShip();
  game.particles = [];
  game.bullets = [];
  setupWave(game, 1);
}

export function setupWave(game, waveNumber) {
  const def = WAVES[waveNumber - 1];
  game.wave = waveNumber;
  game.crystalsCollected = 0;
  game.crystalsTotal = def.crystals;
  game.dockOpen = false;
  game.asteroids = [];
  game.crystals = [];
  game.mines = [];
  game.bullets = [];
  for (let i = 0; i < def.crystals; i++) {
    const p = randomSpawnPoint(game);
    game.crystals.push(makeCrystal(p.x, p.y));
  }
  for (let i = 0; i < def.asteroids; i++) {
    const p = randomSpawnPoint(game, 220);
    const radius = ASTEROID.minRadius + Math.random() * (ASTEROID.maxRadius - ASTEROID.minRadius);
    game.asteroids.push(makeAsteroid(p.x, p.y, radius, waveNumber));
  }
  for (let i = 0; i < def.mines; i++) {
    const p = randomSpawnPoint(game, 200);
    game.mines.push(makeMine(p.x, p.y));
  }
  game.message = `WAVE ${waveNumber} — COLLECT ${def.crystals} CRYSTALS`;
  game.messageTimer = 2.4;
}

function damageShip(game, amount) {
  const ship = game.ship;
  if (ship.invulnerableTimer > 0 || !ship.alive) return;
  ship.hull -= amount;
  ship.invulnerableTimer = SHIP.invulnerableAfterHit;
  burst(game.particles, ship.x, ship.y, '#ff7b6b', 18, 220, 0.6, 3);
  sfx.hit();
  if (ship.hull <= 0) {
    ship.hull = 0;
    ship.alive = false;
    burst(game.particles, ship.x, ship.y, '#7fe7ff', 60, 320, 1.1, 4);
    burst(game.particles, ship.x, ship.y, '#ffcf5c', 30, 200, 0.9, 3);
    sfx.explosion(true);
    game.state = STATES.GAME_OVER;
    sfx.gameOver();
  }
}

function explodeMine(game, mine, index) {
  game.mines.splice(index, 1);
  burst(game.particles, mine.x, mine.y, '#ff5c5c', 40, 300, 0.9, 4);
  burst(game.particles, mine.x, mine.y, '#ffb35c', 24, 200, 0.7, 3);
  sfx.explosion(true);
  const d = distance(game.ship, mine);
  if (game.ship.alive && d < MINE.blastRadius + game.ship.radius) {
    damageShip(game, MINE.blastDamage);
  }
}

function destroyAsteroid(game, index, byBullet) {
  const a = game.asteroids[index];
  game.asteroids.splice(index, 1);
  game.stats.asteroidsDestroyed += 1;
  const isBig = a.radius >= ASTEROID.bigSplitRadius;
  game.score += isBig ? ASTEROID.bigScore : ASTEROID.smallScore;
  burst(game.particles, a.x, a.y, COLORS.asteroid, isBig ? 26 : 14, 200, 0.7, 3);
  sfx.explosion(isBig);
  if (isBig && byBullet) {
    // Big rocks split into two smaller ones that keep flying.
    for (let i = 0; i < 2; i++) {
      const small = makeAsteroid(a.x, a.y, a.radius * 0.55, game.wave);
      small.vx = a.vx * 1.4 + (Math.random() - 0.5) * 120;
      small.vy = a.vy * 1.4 + (Math.random() - 0.5) * 120;
      game.asteroids.push(small);
    }
  }
}

function collectCrystal(game, index) {
  const c = game.crystals[index];
  game.crystals.splice(index, 1);
  game.crystalsCollected += 1;
  game.stats.crystals += 1;
  game.score += CRYSTAL.score;
  game.ship.hull = Math.min(SHIP.hull, game.ship.hull + CRYSTAL.hullRestore);
  burst(game.particles, c.x, c.y, COLORS.crystal, 16, 160, 0.6, 3);
  sfx.pickup();
  if (game.crystalsCollected >= game.crystalsTotal) {
    game.dockOpen = true;
    game.message = 'CARGO FULL — DOCK WITH THE MOTHERSHIP';
    game.messageTimer = 2.6;
    sfx.dock();
  }
}

function clearWave(game) {
  const bonus = SCORE.waveClearBonus + game.ship.hull * SCORE.hullBonusPerPoint;
  game.score += bonus;
  sfx.waveClear();
  if (game.wave >= WAVES.length) {
    game.score += SCORE.winBonus;
    game.state = STATES.VICTORY;
    sfx.victory();
    return;
  }
  game.waveClearTimer = 1.6; // brief breather, then the next wave spawns
  game.message = `WAVE ${game.wave} CLEAR — BONUS +${bonus}`;
  game.messageTimer = 1.6;
}

/**
 * One fixed-step update while playing. `actions` carries the frame's input:
 * { thrust: {x, y}, fire: bool, dash: {x, y} | null }.
 */
export function updateGame(game, dt, actions) {
  game.time += dt;
  if (game.messageTimer > 0) game.messageTimer -= dt;

  // Starfield drifts regardless of play state.
  for (const s of game.stars) {
    s.y += s.speed * dt;
    if (s.y > VIEW.height + 2) {
      s.y = -2;
      s.x = Math.random() * VIEW.width;
    }
  }

  if (game.state !== STATES.PLAYING) {
    // Particles keep animating on the end screens.
    game.particles = game.particles.filter((p) => updateParticle(p, dt));
    return;
  }

  if (game.waveClearTimer > 0) {
    game.waveClearTimer -= dt;
    game.particles = game.particles.filter((p) => updateParticle(p, dt));
    if (game.waveClearTimer <= 0) setupWave(game, game.wave + 1);
    return;
  }

  const ship = game.ship;
  updateShip(ship, dt, actions.thrust, actions.dash);

  if (actions.fire && ship.fireTimer <= 0 && ship.alive) {
    ship.fireTimer = SHIP.fireCooldown;
    const nose = ship.radius + 8;
    game.bullets.push(
      makeBullet(ship.x + Math.cos(ship.angle) * nose, ship.y + Math.sin(ship.angle) * nose, ship.angle),
    );
    game.stats.shots += 1;
    sfx.shoot();
  }

  for (const a of game.asteroids) updateAsteroid(a, dt);
  for (const c of game.crystals) updateCrystal(c, dt);
  for (const m of game.mines) updateMine(m, dt);
  game.bullets = game.bullets.filter((b) => updateBullet(b, dt));
  game.particles = game.particles.filter((p) => updateParticle(p, dt));

  // --- Bullets vs asteroids and mines ---
  for (let bi = game.bullets.length - 1; bi >= 0; bi--) {
    const b = game.bullets[bi];
    let spent = false;
    for (let ai = game.asteroids.length - 1; ai >= 0; ai--) {
      if (circlesHit(b, game.asteroids[ai])) {
        game.stats.hits += 1;
        destroyAsteroid(game, ai, true);
        spent = true;
        break;
      }
    }
    if (!spent) {
      for (let mi = game.mines.length - 1; mi >= 0; mi--) {
        if (circlesHit(b, game.mines[mi])) {
          game.stats.hits += 1;
          game.score += MINE.score;
          explodeMine(game, game.mines[mi], mi);
          spent = true;
          break;
        }
      }
    }
    if (spent) game.bullets.splice(bi, 1);
  }

  if (!ship.alive) return;

  // --- Ship vs crystals ---
  for (let i = game.crystals.length - 1; i >= 0; i--) {
    if (circlesHit(ship, game.crystals[i])) collectCrystal(game, i);
  }

  // --- Ship vs asteroids: a bump hurts and pushes the ship away ---
  for (const a of game.asteroids) {
    if (circlesHit(ship, a)) {
      damageShip(game, ASTEROID.collisionDamage);
      const d = Math.max(1, distance(ship, a));
      const push = 260;
      ship.vx += ((ship.x - a.x) / d) * push;
      ship.vy += ((ship.y - a.y) / d) * push;
      break; // one hit per frame is enough; invulnerability covers the rest
    }
  }

  // --- Mines: proximity fuse, then a blast ---
  for (let i = game.mines.length - 1; i >= 0; i--) {
    const m = game.mines[i];
    if (m.fuse < 0) {
      if (distance(ship, m) < MINE.triggerRadius) {
        m.fuse = MINE.fuseTime;
        m.beepTimer = 0;
      }
    } else {
      if (m.beepTimer <= 0) {
        sfx.mineBeep();
        m.beepTimer = 0.18;
      }
      if (m.fuse <= 0) explodeMine(game, m, i);
    }
  }

  // --- Docking: all crystals in, fly into the mothership's dock ring ---
  if (game.dockOpen && distance(ship, MOTHERSHIP) < MOTHERSHIP.dockRadius) {
    clearWave(game);
  }
}
