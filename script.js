// ─── Canvas setup ─────────────────────────────────────────────────────────────
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const CELL = 20;
const COLS = 25;
const ROWS = 25;
canvas.width  = COLS * CELL;
canvas.height = ROWS * CELL;

// ─── Audio (Web Audio API) ────────────────────────────────────────────────────
let audioCtx = null;
let soundOn = true;

document.getElementById('soundBtn').addEventListener('click', () => {
  soundOn = !soundOn;
  const btn = document.getElementById('soundBtn');
  btn.textContent = soundOn ? '🔊 ON' : '🔇 OFF';
  btn.className = soundOn ? 'on' : '';
});

function getAudio() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

function playEat() {
  if (!soundOn) return;
  const ac = getAudio();
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.connect(gain); gain.connect(ac.destination);
  osc.type = 'square';
  osc.frequency.setValueAtTime(440, ac.currentTime);
  osc.frequency.exponentialRampToValueAtTime(880, ac.currentTime + 0.08);
  gain.gain.setValueAtTime(0.15, ac.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.15);
  osc.start(); osc.stop(ac.currentTime + 0.15);
}

function playMove() {
  if (!soundOn) return;
  const ac = getAudio();
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.connect(gain); gain.connect(ac.destination);
  osc.type = 'sine';
  osc.frequency.value = 120;
  gain.gain.setValueAtTime(0.04, ac.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.04);
  osc.start(); osc.stop(ac.currentTime + 0.04);
}

function playDie() {
  if (!soundOn) return;
  const ac = getAudio();
  [200, 150, 100].forEach((freq, i) => {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.connect(gain); gain.connect(ac.destination);
    osc.type = 'sawtooth';
    osc.frequency.value = freq;
    const t = ac.currentTime + i * 0.15;
    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    osc.start(t); osc.stop(t + 0.2);
  });
}

function playLevelUp() {
  if (!soundOn) return;
  const ac = getAudio();
  [523, 659, 784, 1047].forEach((freq, i) => {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.connect(gain); gain.connect(ac.destination);
    osc.type = 'square';
    osc.frequency.value = freq;
    const t = ac.currentTime + i * 0.1;
    gain.gain.setValueAtTime(0.1, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    osc.start(t); osc.stop(t + 0.15);
  });
}

// ─── Game state ───────────────────────────────────────────────────────────────
let snake, dir, nextDir, apple, score, best, level, speed, running, loopId;
let particles = [];
let eatAnim = 0;

function init() {
  snake = [
    { x: 12, y: 12 },
    { x: 11, y: 12 },
    { x: 10, y: 12 }
  ];
  dir = { x: 1, y: 0 };
  nextDir = { x: 1, y: 0 };
  score = 0;
  level = 1;
  speed = 150;
  particles = [];
  eatAnim = 0;
  placeApple();
  updateHUD();
}

function placeApple() {
  let pos;
  do {
    pos = { x: Math.floor(Math.random() * COLS), y: Math.floor(Math.random() * ROWS) };
  } while (snake.some(s => s.x === pos.x && s.y === pos.y));
  apple = pos;
}

function updateHUD() {
  document.getElementById('scoreDisplay').textContent = score;
  document.getElementById('bestDisplay').textContent  = best || 0;
  document.getElementById('levelDisplay').textContent = level;
}

// ─── Particle system ──────────────────────────────────────────────────────────
function spawnParticles(x, y) {
  const colors = ['#ff3c3c', '#ff8c00', '#ffd700', '#ff69b4'];
  for (let i = 0; i < 12; i++) {
    const angle = (Math.PI * 2 * i) / 12 + Math.random() * 0.5;
    particles.push({
      x: x * CELL + CELL / 2,
      y: y * CELL + CELL / 2,
      vx: Math.cos(angle) * (2 + Math.random() * 3),
      vy: Math.sin(angle) * (2 + Math.random() * 3),
      life: 1,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: 3 + Math.random() * 3
    });
  }
}

function updateParticles() {
  particles = particles.filter(p => p.life > 0);
  particles.forEach(p => {
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.15;
    p.life -= 0.04;
  });
}

// ─── Drawing ──────────────────────────────────────────────────────────────────
function draw() {
  ctx.fillStyle = '#08080f';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Grid lines
  ctx.strokeStyle = '#0e0e18';
  ctx.lineWidth = 0.5;
  for (let x = 0; x <= COLS; x++) {
    ctx.beginPath();
    ctx.moveTo(x * CELL, 0);
    ctx.lineTo(x * CELL, canvas.height);
    ctx.stroke();
  }
  for (let y = 0; y <= ROWS; y++) {
    ctx.beginPath();
    ctx.moveTo(0, y * CELL);
    ctx.lineTo(canvas.width, y * CELL);
    ctx.stroke();
  }

  // Apple
  const ax = apple.x * CELL, ay = apple.y * CELL;
  const pulse = 1 + 0.08 * Math.sin(Date.now() / 200);
  const appleSize = CELL * 0.85 * pulse;
  const off = (CELL - appleSize) / 2;

  ctx.save();
  ctx.shadowColor = '#ff3c3c';
  ctx.shadowBlur = 14;
  ctx.fillStyle = '#ff3c3c';
  ctx.beginPath();
  ctx.ellipse(ax + CELL / 2, ay + CELL / 2, appleSize / 2, appleSize / 2, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.beginPath();
  ctx.ellipse(ax + CELL / 2 - 2, ay + CELL / 2 - 3, 3, 2, -0.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#3a2';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(ax + CELL / 2, ay + off - 1);
  ctx.lineTo(ax + CELL / 2 + 3, ay + off - 4);
  ctx.stroke();
  ctx.fillStyle = '#3a2';
  ctx.beginPath();
  ctx.ellipse(ax + CELL / 2 + 4, ay + off - 5, 3, 1.5, -0.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Snake
  snake.forEach((seg, i) => {
    const sx = seg.x * CELL, sy = seg.y * CELL;
    const isHead = i === 0;
    const t = i / snake.length;

    const r = Math.floor(10 + 20 * t);
    const g = Math.floor(255 - 80 * t);
    const b = Math.floor(10 + 20 * t);
    const alpha = 1 - t * 0.3;

    ctx.save();
    ctx.shadowColor = `rgb(${r},${g},${b})`;
    ctx.shadowBlur = isHead ? 12 : 4;
    ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;

    const pad = isHead ? 1 : 2;
    const radius = isHead ? 5 : 3;
    roundRect(ctx, sx + pad, sy + pad, CELL - pad * 2, CELL - pad * 2, radius);
    ctx.fill();

    if (isHead) {
      const ex1 = dir.x === 1 ? sx + CELL - 5 : dir.x === -1 ? sx + 3 : sx + 5;
      const ey1 = dir.y === 1 ? sy + CELL - 5 : dir.y === -1 ? sy + 3 : sy + 5;
      const ex2 = dir.x === 1 ? sx + CELL - 5 : dir.x === -1 ? sx + 3 : sx + CELL - 5;
      const ey2 = dir.y === 1 ? sy + CELL - 5 : dir.y === -1 ? sy + 3 : sy + CELL - 5;

      ctx.fillStyle = '#0a0a0f';
      ctx.shadowBlur = 0;
      ctx.beginPath(); ctx.arc(ex1, ey1, 2.5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(ex2, ey2, 2.5, 0, Math.PI * 2); ctx.fill();

      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(ex1 + 0.5, ey1 - 0.5, 1, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(ex2 + 0.5, ey2 - 0.5, 1, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  });

  // Eat flash
  if (eatAnim > 0) {
    ctx.fillStyle = `rgba(255, 200, 0, ${eatAnim * 0.08})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    eatAnim -= 0.08;
  }

  // Particles
  updateParticles();
  particles.forEach(p => {
    ctx.save();
    ctx.globalAlpha = Math.max(0, p.life);
    ctx.fillStyle = p.color;
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 6;
    ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    ctx.restore();
  });
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// ─── Game loop ────────────────────────────────────────────────────────────────
let lastStep = 0;

function gameLoop(ts) {
  if (!running) return;
  loopId = requestAnimationFrame(gameLoop);
  draw();
  if (ts - lastStep >= speed) {
    lastStep = ts;
    step();
  }
}

function step() {
  dir = { ...nextDir };
  const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

  if (head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS) return gameOver();
  if (snake.some(s => s.x === head.x && s.y === head.y)) return gameOver();

  snake.unshift(head);

  if (head.x === apple.x && head.y === apple.y) {
    score += level * 10;
    playEat();
    spawnParticles(apple.x, apple.y);
    eatAnim = 1;

    if (score > 0 && score % (5 * level * 10) === 0) {
      level++;
      speed = Math.max(60, speed - 15);
      playLevelUp();
    }

    if (score > (best || 0)) best = score;
    updateHUD();
    placeApple();
  } else {
    snake.pop();
    playMove();
  }
}

function gameOver() {
  running = false;
  cancelAnimationFrame(loopId);
  playDie();

  let flashes = 0;
  const flashInterval = setInterval(() => {
    ctx.fillStyle = `rgba(255,0,0,${flashes % 2 === 0 ? 0.3 : 0})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (++flashes > 5) {
      clearInterval(flashInterval);
      showOverlay('game-over');
    }
  }, 100);
}

// ─── Overlay ──────────────────────────────────────────────────────────────────
function showOverlay(type) {
  const overlay = document.getElementById('overlay');
  const title   = document.getElementById('overlayTitle');
  const msg     = document.getElementById('overlayMsg');
  const sc      = document.getElementById('overlayScore');
  const btn     = document.getElementById('startBtn');

  if (type === 'game-over') {
    title.textContent = '💀 GAME OVER';
    msg.textContent = score > 0 && score === best ? '🏆 YANGI REKORD!' : '';
    sc.style.display = 'block';
    sc.textContent = score;
    btn.textContent = '▶ QAYTA';
  } else {
    title.textContent = '🐍 SNAKE';
    msg.innerHTML = 'Boshlash uchun tugmani bosing<br><br>Boshqaruv: WASD yoki ← → ↑ ↓';
    sc.style.display = 'none';
    btn.textContent = '▶ BOSHLASH';
  }
  overlay.style.display = 'flex';
}

function hideOverlay() {
  document.getElementById('overlay').style.display = 'none';
}

// ─── Controls ─────────────────────────────────────────────────────────────────
const DIRS = {
  ArrowUp:    { x: 0, y: -1 }, w: { x: 0, y: -1 }, W: { x: 0, y: -1 },
  ArrowDown:  { x: 0, y:  1 }, s: { x: 0, y:  1 }, S: { x: 0, y:  1 },
  ArrowLeft:  { x:-1, y:  0 }, a: { x:-1, y:  0 }, A: { x:-1, y:  0 },
  ArrowRight: { x: 1, y:  0 }, d: { x: 1, y:  0 }, D: { x: 1, y:  0 },
};

document.addEventListener('keydown', e => {
  const d = DIRS[e.key];
  if (d) {
    e.preventDefault();
    if (d.x !== -dir.x || d.y !== -dir.y) nextDir = d;
  }
  if (e.key === ' ' && !running) startGame();
});

document.getElementById('dUp').addEventListener('click',    () => { if (running && dir.y === 0) nextDir = { x: 0, y: -1 }; });
document.getElementById('dDown').addEventListener('click',  () => { if (running && dir.y === 0) nextDir = { x: 0, y:  1 }; });
document.getElementById('dLeft').addEventListener('click',  () => { if (running && dir.x === 0) nextDir = { x:-1, y:  0 }; });
document.getElementById('dRight').addEventListener('click', () => { if (running && dir.x === 0) nextDir = { x: 1, y:  0 }; });

// ─── Start ────────────────────────────────────────────────────────────────────
document.getElementById('startBtn').addEventListener('click', startGame);

function startGame() {
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
  hideOverlay();
  init();
  running = true;
  lastStep = 0;
  requestAnimationFrame(gameLoop);
}

// Initial render
draw();
