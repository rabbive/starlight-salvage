// Starlight Salvage — all canvas drawing: background, entities, HUD, screens.
// Rendering never mutates game state; it only reads it.

import { COLORS, MOTHERSHIP, VIEW } from './config.js';
import { STATES } from './world.js';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawBackground(ctx, game) {
  const g = ctx.createLinearGradient(0, 0, 0, VIEW.height);
  g.addColorStop(0, '#070b1d');
  g.addColorStop(0.55, COLORS.background);
  g.addColorStop(1, '#0d0716');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);

  // A faint nebula: two big soft radial glows.
  for (const [x, y, r, color] of [
    [220, 150, 320, 'rgba(64, 80, 200, 0.10)'],
    [1060, 560, 360, 'rgba(150, 60, 160, 0.08)'],
  ]) {
    const rg = ctx.createRadialGradient(x, y, 0, x, y, r);
    rg.addColorStop(0, color);
    rg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = rg;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }

  for (const s of game.stars) {
    const tw = 0.55 + 0.45 * Math.sin(game.time * 2 + s.twinkle);
    ctx.globalAlpha = tw;
    ctx.fillStyle = COLORS.star;
    ctx.fillRect(s.x, s.y, s.size, s.size);
  }
  ctx.globalAlpha = 1;
}

function drawMothership(ctx, game) {
  const { x, y, radius } = MOTHERSHIP;
  const pulse = 0.5 + 0.5 * Math.sin(game.time * 2.4);

  if (game.dockOpen) {
    // The open dock ring beckons: a pulsing green circle to fly into.
    ctx.save();
    ctx.strokeStyle = `rgba(92, 255, 157, ${0.45 + 0.35 * pulse})`;
    ctx.lineWidth = 3;
    ctx.setLineDash([14, 10]);
    ctx.beginPath();
    ctx.arc(x, y, MOTHERSHIP.dockRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = '#5cff9d';
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('DOCK HERE', x, y - MOTHERSHIP.dockRadius - 12);
  }

  // Hull: a wide rounded station with a lit spine and two docking arms.
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = '#3a4152';
  roundRect(ctx, -radius - 16, -22, (radius + 16) * 2, 44, 18);
  ctx.fill();
  ctx.fillStyle = COLORS.mothership;
  roundRect(ctx, -radius, -14, radius * 2, 28, 12);
  ctx.fill();
  ctx.fillStyle = '#2c3345';
  ctx.fillRect(-radius - 16, -6, 22, 12);
  ctx.fillRect(radius - 6, -6, 22, 12);
  // Running lights.
  ctx.fillStyle = game.dockOpen ? '#5cff9d' : '#ffcf5c';
  for (const lx of [-radius + 12, -radius / 2, 0, radius / 2, radius - 12]) {
    ctx.beginPath();
    ctx.arc(lx, 0, 3 + pulse, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#8b96b8';
  ctx.font = 'bold 11px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('MOTHERSHIP', 0, 34);
  ctx.restore();
}

function drawShip(ctx, game) {
  const ship = game.ship;
  if (!ship.alive) return;
  // Mercy invulnerability blinks the ship.
  if (ship.invulnerableTimer > 0 && Math.floor(game.time * 14) % 2 === 0) return;

  ctx.save();
  ctx.translate(ship.x, ship.y);
  ctx.rotate(ship.angle);

  // Engine flame while thrusting or dashing.
  if (ship.thrusting || ship.dashTimer > 0) {
    const len = 18 + Math.random() * 12;
    const fg = ctx.createLinearGradient(-ship.radius, 0, -ship.radius - len, 0);
    fg.addColorStop(0, 'rgba(255, 207, 92, 0.95)');
    fg.addColorStop(1, 'rgba(255, 92, 92, 0)');
    ctx.fillStyle = fg;
    ctx.beginPath();
    ctx.moveTo(-ship.radius + 2, -5);
    ctx.lineTo(-ship.radius - len, 0);
    ctx.lineTo(-ship.radius + 2, 5);
    ctx.closePath();
    ctx.fill();
  }

  // Hull: a sleek dart with a cockpit.
  ctx.fillStyle = COLORS.ship;
  ctx.beginPath();
  ctx.moveTo(ship.radius + 6, 0);
  ctx.lineTo(-ship.radius, -ship.radius * 0.75);
  ctx.lineTo(-ship.radius * 0.55, 0);
  ctx.lineTo(-ship.radius, ship.radius * 0.75);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#0b2a3a';
  ctx.beginPath();
  ctx.arc(ship.radius * 0.25, 0, 4.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = COLORS.shipAccent;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-ship.radius * 0.55, 0);
  ctx.lineTo(ship.radius * 0.4, 0);
  ctx.stroke();
  ctx.restore();

  // Dash cooldown ring under the ship.
  if (ship.dashCooldown > 0) {
    ctx.save();
    ctx.strokeStyle = 'rgba(127, 231, 255, 0.35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(ship.x, ship.y, ship.radius + 8, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - ship.dashCooldown / 1.4));
    ctx.stroke();
    ctx.restore();
  }
}

function drawAsteroid(ctx, a, time) {
  ctx.save();
  ctx.translate(a.x, a.y);
  ctx.rotate(a.angle);
  ctx.beginPath();
  for (let i = 0; i < a.lumps.length; i++) {
    const ang = (i / a.lumps.length) * Math.PI * 2;
    const r = a.radius * a.lumps[i];
    if (i === 0) ctx.moveTo(Math.cos(ang) * r, Math.sin(ang) * r);
    else ctx.lineTo(Math.cos(ang) * r, Math.sin(ang) * r);
  }
  ctx.closePath();
  ctx.fillStyle = COLORS.asteroid;
  ctx.fill();
  ctx.strokeStyle = COLORS.asteroidDark;
  ctx.lineWidth = 2;
  ctx.stroke();
  // A couple of craters for texture.
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.arc(-a.radius * 0.3, -a.radius * 0.2, a.radius * 0.22, 0, Math.PI * 2);
  ctx.arc(a.radius * 0.35, a.radius * 0.3, a.radius * 0.16, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawCrystal(ctx, c, time) {
  const pulse = 1 + 0.18 * Math.sin(time * 3 + c.phase);
  const r = c.radius * pulse;
  ctx.save();
  ctx.translate(c.x, c.y + Math.sin(time * 2 + c.phase) * 3);
  ctx.shadowColor = COLORS.crystal;
  ctx.shadowBlur = 16;
  ctx.fillStyle = COLORS.crystal;
  ctx.beginPath();
  ctx.moveTo(0, -r);
  ctx.lineTo(r * 0.7, 0);
  ctx.lineTo(0, r);
  ctx.lineTo(-r * 0.7, 0);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.beginPath();
  ctx.moveTo(0, -r * 0.55);
  ctx.lineTo(r * 0.35, 0);
  ctx.lineTo(0, r * 0.55);
  ctx.lineTo(-r * 0.35, 0);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawMine(ctx, m, time) {
  const armed = m.fuse >= 0;
  const blink = armed && Math.floor(time * 12) % 2 === 0;
  ctx.save();
  ctx.translate(m.x, m.y);
  ctx.shadowColor = COLORS.mine;
  ctx.shadowBlur = armed ? 18 : 8;
  ctx.fillStyle = blink ? '#ffffff' : '#3a2a2a';
  ctx.beginPath();
  ctx.arc(0, 0, m.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = COLORS.mine;
  ctx.lineWidth = 2;
  ctx.stroke();
  // Spikes.
  ctx.strokeStyle = '#ff8a8a';
  ctx.lineWidth = 2;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + time * 0.4;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * m.radius, Math.sin(a) * m.radius);
    ctx.lineTo(Math.cos(a) * (m.radius + 6), Math.sin(a) * (m.radius + 6));
    ctx.stroke();
  }
  ctx.fillStyle = blink ? '#ff5c5c' : '#ffb3b3';
  ctx.beginPath();
  ctx.arc(0, 0, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawBullets(ctx, game) {
  ctx.save();
  ctx.fillStyle = COLORS.bullet;
  ctx.shadowColor = COLORS.bullet;
  ctx.shadowBlur = 8;
  for (const b of game.bullets) {
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawParticles(ctx, game) {
  for (const p of game.particles) {
    ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
  }
  ctx.globalAlpha = 1;
}

function drawHud(ctx, game) {
  const ship = game.ship;
  ctx.save();
  ctx.textBaseline = 'top';

  // Top-left: score and wave.
  ctx.fillStyle = COLORS.hudText;
  ctx.font = 'bold 22px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`SCORE  ${game.score}`, 20, 16);
  ctx.font = 'bold 16px system-ui, sans-serif';
  ctx.fillStyle = COLORS.hudDim;
  ctx.fillText(`WAVE ${game.wave} / 5`, 20, 46);

  // Top-right: timer and cargo.
  ctx.textAlign = 'right';
  ctx.fillStyle = COLORS.hudText;
  ctx.font = 'bold 20px system-ui, sans-serif';
  const mm = String(Math.floor(game.time / 60)).padStart(2, '0');
  const ss = String(Math.floor(game.time % 60)).padStart(2, '0');
  ctx.fillText(`${mm}:${ss}`, VIEW.width - 20, 16);
  ctx.font = 'bold 16px system-ui, sans-serif';
  ctx.fillStyle = game.dockOpen ? '#5cff9d' : COLORS.hudDim;
  ctx.fillText(`CARGO ${game.crystalsCollected} / ${game.crystalsTotal}`, VIEW.width - 20, 46);

  // Bottom-left: hull bar.
  ctx.textAlign = 'left';
  ctx.fillStyle = COLORS.hudText;
  ctx.font = 'bold 14px system-ui, sans-serif';
  ctx.fillText('HULL', 20, VIEW.height - 44);
  const barW = 220;
  const barH = 14;
  const bx = 20;
  const by = VIEW.height - 26;
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  roundRect(ctx, bx, by, barW, barH, 7);
  ctx.fill();
  const hullFrac = Math.max(0, ship.hull / 100);
  ctx.fillStyle = hullFrac > 0.5 ? '#5cff9d' : hullFrac > 0.25 ? '#ffcf5c' : '#ff5c5c';
  if (hullFrac > 0) {
    roundRect(ctx, bx, by, barW * hullFrac, barH, 7);
    ctx.fill();
  }
  ctx.fillStyle = COLORS.hudText;
  ctx.fillText(`${Math.ceil(ship.hull)}`, bx + barW + 10, by - 1);

  // Bottom-right: controls reminder.
  ctx.textAlign = 'right';
  ctx.fillStyle = COLORS.hudDim;
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillText('WASD thrust · SPACE fire · CLICK dash · P pause · M mute · R restart', VIEW.width - 20, VIEW.height - 26);

  // Centre banner message.
  if (game.messageTimer > 0 && game.message) {
    ctx.globalAlpha = Math.min(1, game.messageTimer);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 26px system-ui, sans-serif';
    ctx.fillText(game.message, VIEW.width / 2, 120);
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

function drawPanel(ctx, w, h) {
  ctx.save();
  ctx.fillStyle = 'rgba(4, 6, 16, 0.72)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  const x = (VIEW.width - w) / 2;
  const y = (VIEW.height - h) / 2;
  ctx.fillStyle = 'rgba(16, 22, 44, 0.92)';
  ctx.strokeStyle = 'rgba(127, 231, 255, 0.35)';
  ctx.lineWidth = 1.5;
  roundRect(ctx, x, y, w, h, 16);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  return { x, y };
}

function drawTitle(ctx, game) {
  const { x, y } = drawPanel(ctx, 640, 420);
  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = '#7fe7ff';
  ctx.font = 'bold 52px system-ui, sans-serif';
  ctx.fillText('STARLIGHT', VIEW.width / 2, y + 44);
  ctx.fillText('SALVAGE', VIEW.width / 2, y + 104);
  ctx.fillStyle = '#ffcf5c';
  ctx.font = 'bold 17px system-ui, sans-serif';
  ctx.fillText('SALVAGE THE FIELD · DOCK THE CARGO · SURVIVE FIVE WAVES', VIEW.width / 2, y + 152);

  ctx.fillStyle = COLORS.hudText;
  ctx.font = '16px system-ui, sans-serif';
  const lines = [
    'Collect every glowing crystal, then dock with the mothership.',
    'Asteroids dent your hull. Mines arm when you get close — shoot them first.',
    'WASD / arrows to thrust · SPACE to fire · CLICK to dash toward the cursor',
    'P pause · M mute · R restart',
  ];
  lines.forEach((line, i) => ctx.fillText(line, VIEW.width / 2, y + 196 + i * 26));

  const pulse = 0.6 + 0.4 * Math.sin(game.time * 3);
  ctx.globalAlpha = pulse;
  ctx.fillStyle = '#5cff9d';
  ctx.font = 'bold 22px system-ui, sans-serif';
  ctx.fillText('PRESS ENTER OR CLICK TO LAUNCH', VIEW.width / 2, y + 348);
  ctx.globalAlpha = 1;
  ctx.fillStyle = COLORS.hudDim;
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillText('A tiny original arcade game — no downloads, no accounts, just fly.', VIEW.width / 2, y + 384);
  ctx.restore();
  void x;
}

function drawPaused(ctx) {
  drawPanel(ctx, 420, 200);
  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = COLORS.hudText;
  ctx.font = 'bold 36px system-ui, sans-serif';
  ctx.fillText('PAUSED', VIEW.width / 2, VIEW.height / 2 - 52);
  ctx.font = '16px system-ui, sans-serif';
  ctx.fillStyle = COLORS.hudDim;
  ctx.fillText('Press P to resume · R to restart', VIEW.width / 2, VIEW.height / 2 + 4);
  ctx.restore();
}

function drawGameOver(ctx, game) {
  const { y } = drawPanel(ctx, 560, 340);
  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ff5c5c';
  ctx.font = 'bold 44px system-ui, sans-serif';
  ctx.fillText('SHIP LOST', VIEW.width / 2, y + 40);
  ctx.fillStyle = COLORS.hudText;
  ctx.font = '20px system-ui, sans-serif';
  ctx.fillText(`You reached wave ${game.wave} with a score of ${game.score}.`, VIEW.width / 2, y + 112);
  ctx.font = '16px system-ui, sans-serif';
  ctx.fillStyle = COLORS.hudDim;
  ctx.fillText(`Crystals salvaged: ${game.stats.crystals} · Asteroids destroyed: ${game.stats.asteroidsDestroyed}`, VIEW.width / 2, y + 150);
  ctx.fillText(`Shots fired: ${game.stats.shots} · Hits: ${game.stats.hits}`, VIEW.width / 2, y + 178);
  const pulse = 0.6 + 0.4 * Math.sin(game.time * 3);
  ctx.globalAlpha = pulse;
  ctx.fillStyle = '#5cff9d';
  ctx.font = 'bold 20px system-ui, sans-serif';
  ctx.fillText('PRESS R OR CLICK TO FLY AGAIN', VIEW.width / 2, y + 244);
  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawVictory(ctx, game) {
  const { y } = drawPanel(ctx, 600, 380);
  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = '#5cff9d';
  ctx.font = 'bold 44px system-ui, sans-serif';
  ctx.fillText('FIELD SALVAGED!', VIEW.width / 2, y + 40);
  ctx.fillStyle = COLORS.hudText;
  ctx.font = '20px system-ui, sans-serif';
  ctx.fillText('All five waves cleared. The mothership is loaded and safe.', VIEW.width / 2, y + 104);
  ctx.font = 'bold 24px system-ui, sans-serif';
  ctx.fillStyle = '#ffcf5c';
  ctx.fillText(`FINAL SCORE  ${game.score}`, VIEW.width / 2, y + 152);
  ctx.font = '16px system-ui, sans-serif';
  ctx.fillStyle = COLORS.hudDim;
  const mm = String(Math.floor(game.time / 60)).padStart(2, '0');
  const ss = String(Math.floor(game.time % 60)).padStart(2, '0');
  ctx.fillText(`Time ${mm}:${ss} · Crystals ${game.stats.crystals} · Asteroids destroyed ${game.stats.asteroidsDestroyed}`, VIEW.width / 2, y + 196);
  const acc = game.stats.shots > 0 ? Math.round((game.stats.hits / game.stats.shots) * 100) : 0;
  ctx.fillText(`Shot accuracy ${acc}% (${game.stats.hits} / ${game.stats.shots})`, VIEW.width / 2, y + 224);
  const pulse = 0.6 + 0.4 * Math.sin(game.time * 3);
  ctx.globalAlpha = pulse;
  ctx.fillStyle = '#5cff9d';
  ctx.font = 'bold 20px system-ui, sans-serif';
  ctx.fillText('PRESS R OR CLICK TO PLAY AGAIN', VIEW.width / 2, y + 288);
  ctx.globalAlpha = 1;
  ctx.restore();
}

export function render(ctx, game) {
  drawBackground(ctx, game);
  drawMothership(ctx, game);
  for (const c of game.crystals) drawCrystal(ctx, c, game.time);
  for (const m of game.mines) drawMine(ctx, m, game.time);
  for (const a of game.asteroids) drawAsteroid(ctx, a, game.time);
  drawBullets(ctx, game);
  drawParticles(ctx, game);
  drawShip(ctx, game);

  if (game.state === STATES.TITLE) {
    drawHud(ctx, game);
    drawTitle(ctx, game);
  } else if (game.state === STATES.PLAYING) {
    drawHud(ctx, game);
  } else if (game.state === STATES.PAUSED) {
    drawHud(ctx, game);
    drawPaused(ctx);
  } else if (game.state === STATES.GAME_OVER) {
    drawHud(ctx, game);
    drawGameOver(ctx, game);
  } else if (game.state === STATES.VICTORY) {
    drawHud(ctx, game);
    drawVictory(ctx, game);
  }
}
