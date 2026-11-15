// Starlight Salvage — tuning constants and wave definitions.
// Everything gameplay-related that a designer would tweak lives here.

export const VIEW = { width: 1280, height: 720 };

export const SHIP = {
  radius: 14,
  thrust: 420, // px / s^2
  maxSpeed: 320,
  drag: 0.6, // per second, exponential damping
  turnRate: 0, // ship faces its velocity / the mouse, no separate turning
  hull: 100,
  dashSpeed: 720,
  dashTime: 0.18, // seconds of dash
  dashCooldown: 1.4, // seconds between dashes
  invulnerableAfterHit: 1.0, // seconds of mercy invulnerability
  fireCooldown: 0.22, // seconds between shots
  bulletSpeed: 620,
};

export const ASTEROID = {
  minRadius: 16,
  maxRadius: 46,
  baseSpeed: 55,
  speedPerWave: 9,
  bigSplitRadius: 30, // asteroids at/above this radius split in two when shot
  smallScore: 50,
  bigScore: 100,
  collisionDamage: 14,
};

export const CRYSTAL = {
  radius: 12,
  score: 100,
  hullRestore: 4, // small repair on pickup, keeps long runs fair
};

export const MINE = {
  radius: 13,
  triggerRadius: 95, // ship inside this starts the fuse
  fuseTime: 0.7, // seconds from trigger to explosion
  blastRadius: 130,
  blastDamage: 30,
  score: 150, // for shooting it before it blows
};

export const MOTHERSHIP = {
  x: VIEW.width / 2,
  y: 64,
  radius: 58,
  dockRadius: 92, // entering this with the dock open clears the wave
};

// One entry per wave. The game is won by clearing wave 5.
export const WAVES = [
  { crystals: 5, asteroids: 5, mines: 0 },
  { crystals: 6, asteroids: 7, mines: 2 },
  { crystals: 7, asteroids: 9, mines: 3 },
  { crystals: 8, asteroids: 11, mines: 4 },
  { crystals: 9, asteroids: 13, mines: 5 },
];

export const SCORE = {
  waveClearBonus: 500,
  hullBonusPerPoint: 5, // added to the wave-clear bonus per hull point left
  winBonus: 1000,
};

export const COLORS = {
  background: '#05070f',
  star: '#cdd8ff',
  ship: '#7fe7ff',
  shipAccent: '#ffcf5c',
  crystal: '#5cff9d',
  asteroid: '#8d7d6b',
  asteroidDark: '#5c5148',
  mine: '#ff5c5c',
  mothership: '#e8e4d8',
  bullet: '#ffe066',
  hudText: '#dfe8ff',
  hudDim: '#8b96b8',
};

export const KEYS = {
  thrustUp: ['KeyW', 'ArrowUp'],
  thrustDown: ['KeyS', 'ArrowDown'],
  thrustLeft: ['KeyA', 'ArrowLeft'],
  thrustRight: ['KeyD', 'ArrowRight'],
  fire: ['Space'],
  pause: ['KeyP', 'Escape'],
  mute: ['KeyM'],
  restart: ['KeyR'],
  start: ['Enter', 'Space'],
};
