// Starlight Salvage — entity factories and per-entity physics.
// Entities are plain objects; the world module owns the lists and the rules
// that make them interact. This file only knows how each thing moves.

import { ASTEROID, CRYSTAL, MINE, SHIP, VIEW } from './config.js';

export function makeShip() {
  return {
    kind: 'ship',
    x: VIEW.width / 2,
    y: VIEW.height - 120,
    vx: 0,
    vy: 0,
    angle: -Math.PI / 2, // nose up
    radius: SHIP.radius,
    hull: SHIP.hull,
    fireTimer: 0,
    dashTimer: 0, // > 0 while a dash is in progress
    dashCooldown: 0,
    invulnerableTimer: 0,
    thrusting: false,
    alive: true,
  };
}

export function makeAsteroid(x, y, radius, wave) {
  const speed = ASTEROID.baseSpeed + wave * ASTEROID.speedPerWave;
  const a = Math.random() * Math.PI * 2;
  return {
    kind: 'asteroid',
    x,
    y,
    vx: Math.cos(a) * speed * (0.5 + Math.random()),
    vy: Math.sin(a) * speed * (0.5 + Math.random()),
    radius,
    angle: Math.random() * Math.PI * 2,
    spin: (Math.random() - 0.5) * 1.6,
    // A few precomputed vertices so each rock keeps one lumpy silhouette.
    lumps: Array.from({ length: 9 }, () => 0.78 + Math.random() * 0.38),
  };
}

export function makeCrystal(x, y) {
  return {
    kind: 'crystal',
    x,
    y,
    radius: CRYSTAL.radius,
    phase: Math.random() * Math.PI * 2, // bob / pulse phase
    vx: (Math.random() - 0.5) * 12,
    vy: (Math.random() - 0.5) * 12,
  };
}

export function makeMine(x, y) {
  return {
    kind: 'mine',
    x,
    y,
    vx: (Math.random() - 0.5) * 16,
    vy: (Math.random() - 0.5) * 16,
    radius: MINE.radius,
    fuse: -1, // -1 = idle, >= 0 = seconds left before it blows
    beepTimer: 0,
  };
}

export function makeBullet(x, y, angle) {
  return {
    kind: 'bullet',
    x,
    y,
    vx: Math.cos(angle) * SHIP.bulletSpeed,
    vy: Math.sin(angle) * SHIP.bulletSpeed,
    radius: 4,
    life: 0.9, // seconds before it fades out
  };
}

export function makeParticle(x, y, vx, vy, life, color, size) {
  return { kind: 'particle', x, y, vx, vy, life, maxLife: life, color, size };
}

export function burst(particles, x, y, color, count, speed = 180, life = 0.7, size = 3) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = speed * (0.4 + Math.random() * 0.8);
    particles.push(
      makeParticle(x, y, Math.cos(a) * s, Math.sin(a) * s, life * (0.6 + Math.random() * 0.7), color, size * (0.6 + Math.random() * 0.8)),
    );
  }
}

function clampToArena(e, margin = 0) {
  e.x = Math.max(margin, Math.min(VIEW.width - margin, e.x));
  e.y = Math.max(margin, Math.min(VIEW.height - margin, e.y));
}

function bounceOffWalls(e) {
  if (e.x - e.radius < 0 || e.x + e.radius > VIEW.width) e.vx *= -1;
  if (e.y - e.radius < 0 || e.y + e.radius > VIEW.height) e.vy *= -1;
  clampToArena(e, e.radius);
}

export function updateShip(ship, dt, thrust, dashDir) {
  if (dashDir) {
    // A dash overrides velocity for a short burst toward the cursor.
    ship.vx = dashDir.x * SHIP.dashSpeed;
    ship.vy = dashDir.y * SHIP.dashSpeed;
    ship.dashTimer = SHIP.dashTime;
    ship.dashCooldown = SHIP.dashCooldown;
    ship.invulnerableTimer = Math.max(ship.invulnerableTimer, SHIP.dashTime + 0.15);
  } else if (ship.dashTimer > 0) {
    ship.dashTimer -= dt;
  } else {
    ship.vx += thrust.x * SHIP.thrust * dt;
    ship.vy += thrust.y * SHIP.thrust * dt;
    const damp = Math.exp(-SHIP.drag * dt);
    ship.vx *= damp;
    ship.vy *= damp;
    const speed = Math.hypot(ship.vx, ship.vy);
    if (speed > SHIP.maxSpeed) {
      ship.vx = (ship.vx / speed) * SHIP.maxSpeed;
      ship.vy = (ship.vy / speed) * SHIP.maxSpeed;
    }
  }
  ship.x += ship.vx * dt;
  ship.y += ship.vy * dt;
  clampToArena(ship, ship.radius + 2);
  ship.thrusting = thrust.x !== 0 || thrust.y !== 0;
  if (ship.thrusting || ship.dashTimer > 0) {
    const speed = Math.hypot(ship.vx, ship.vy);
    if (speed > 40) ship.angle = Math.atan2(ship.vy, ship.vx);
  }
  ship.fireTimer = Math.max(0, ship.fireTimer - dt);
  ship.dashCooldown = Math.max(0, ship.dashCooldown - dt);
  ship.invulnerableTimer = Math.max(0, ship.invulnerableTimer - dt);
}

export function updateAsteroid(a, dt) {
  a.x += a.vx * dt;
  a.y += a.vy * dt;
  a.angle += a.spin * dt;
  bounceOffWalls(a);
}

export function updateCrystal(c, dt) {
  c.x += c.vx * dt;
  c.y += c.vy * dt;
  bounceOffWalls(c);
}

export function updateMine(m, dt) {
  m.x += m.vx * dt;
  m.y += m.vy * dt;
  bounceOffWalls(m);
  if (m.fuse >= 0) {
    m.fuse -= dt;
    m.beepTimer -= dt;
  }
}

export function updateBullet(b, dt) {
  b.x += b.vx * dt;
  b.y += b.vy * dt;
  b.life -= dt;
  return b.life > 0 && b.x > -20 && b.x < VIEW.width + 20 && b.y > -20 && b.y < VIEW.height + 20;
}

export function updateParticle(p, dt) {
  p.x += p.vx * dt;
  p.y += p.vy * dt;
  p.vx *= Math.exp(-2.2 * dt);
  p.vy *= Math.exp(-2.2 * dt);
  p.life -= dt;
  return p.life > 0;
}

export function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function circlesHit(a, b) {
  const r = a.radius + b.radius;
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy < r * r;
}
