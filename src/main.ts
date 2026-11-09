import './styles.css';

type ScreenState = 'menu' | 'playing' | 'gameover';
type CellKind = 'player' | 'bot';

interface Vec2 {
  x: number;
  y: number;
}

interface Cell {
  id: number;
  kind: CellKind;
  name: string;
  color: string;
  accent: string;
  x: number;
  y: number;
  mass: number;
  target: Vec2;
  wander: Vec2;
  wanderTimer: number;
  pulse: number;
  alive: boolean;
  kills: number;
}

interface Food {
  id: number;
  x: number;
  y: number;
  color: string;
  size: number;
  phase: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

const canvas = document.querySelector<HTMLCanvasElement>('#game-canvas')!;
const ctx = canvas.getContext('2d')!;
const startScreen = document.querySelector<HTMLElement>('#start-screen')!;
const gameover = document.querySelector<HTMLElement>('#gameover')!;
const hud = document.querySelector<HTMLElement>('#hud')!;
const leaderboard = document.querySelector<HTMLElement>('#leaderboard')!;
const controlsHint = document.querySelector<HTMLElement>('#controls-hint')!;
const pauseToast = document.querySelector<HTMLElement>('#pause-toast')!;
const eventToast = document.querySelector<HTMLElement>('#event-toast')!;
const nameInput = document.querySelector<HTMLInputElement>('#name-input')!;
const startButton = document.querySelector<HTMLButtonElement>('#start-button')!;
const restartButton = document.querySelector<HTMLButtonElement>('#restart-button')!;
const massValue = document.querySelector<HTMLElement>('#mass-value')!;
const rankValue = document.querySelector<HTMLElement>('#rank-value')!;
const timerValue = document.querySelector<HTMLElement>('#timer-value')!;
const leaderboardList = document.querySelector<HTMLOListElement>('#leaderboard-list')!;
const finalMass = document.querySelector<HTMLElement>('#final-mass')!;
const finalRank = document.querySelector<HTMLElement>('#final-rank')!;
const finalTime = document.querySelector<HTMLElement>('#final-time')!;
const gameoverCopy = document.querySelector<HTMLElement>('#gameover-copy')!;

const WORLD = { width: 5200, height: 3400 };
const FOOD_TARGET = 360;
const BOT_NAMES = ['Mica', 'Orbit', 'Koi', 'Vanta', 'Sora', 'Morrow', 'Pixel', 'Nix', 'Halo', 'Rook', 'Lumen', 'Echo', 'Velo', 'Nyx', 'Aster', 'Karma', 'Drift', 'Miso', 'Flux', 'Cinder', 'Zephyr', 'Pico', 'Sol', 'Wisp'];
const BOT_COLORS = [
  ['#ff7f66', '#ffd0a6'],
  ['#a98bff', '#e1d9ff'],
  ['#f7cf63', '#fff0b0'],
  ['#5ed3f3', '#cbf6ff'],
  ['#f17ec8', '#ffd6ef'],
  ['#76e6b2', '#d6ffec'],
];
const FOOD_COLORS = ['#70f0d2', '#f7cf63', '#b89bff', '#ff8e72', '#69cfee'];

let dpr = 1;
let viewWidth = window.innerWidth;
let viewHeight = window.innerHeight;
let nextId = 1;
let screenState: ScreenState = 'menu';
let paused = false;
let simulationTime = 0;
let runStartedAt = 0;
let bestRank = 1;
let lastFrame = performance.now();
let toastTimer: number | undefined;
let pointer: Vec2 = { x: viewWidth / 2, y: viewHeight / 2 };
let pointerActive = false;
let cells: Cell[] = [];
let foods: Food[] = [];
let particles: Particle[] = [];
let player!: Cell;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function lerp(a: number, b: number, amount: number): number {
  return a + (b - a) * amount;
}

function distance(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function random(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function randomPoint(padding = 120): Vec2 {
  return { x: random(padding, WORLD.width - padding), y: random(padding, WORLD.height - padding) };
}

function radiusFor(mass: number): number {
  return Math.sqrt(mass) * 3.25;
}

function speedFor(mass: number): number {
  return clamp(250 * Math.pow(120 / mass, 0.18), 92, 260);
}

function formatTime(seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(whole / 60).toString().padStart(2, '0');
  const remainder = (whole % 60).toString().padStart(2, '0');
  return `${minutes}:${remainder}`;
}

function createCell(kind: CellKind, name: string, mass: number, x: number, y: number, color: string, accent: string): Cell {
  return {
    id: nextId++,
    kind,
    name,
    color,
    accent,
    x,
    y,
    mass,
    target: { x, y },
    wander: { x: 0, y: 0 },
    wanderTimer: random(0, 2.5),
    pulse: random(0, Math.PI * 2),
    alive: true,
    kills: 0,
  };
}

function seedWorld(playerName: string): void {
  nextId = 1;
  simulationTime = 0;
  bestRank = 1;
  cells = [];
  foods = [];
  particles = [];
  player = createCell('player', playerName.trim() || 'Nova', 120, WORLD.width / 2, WORLD.height / 2, '#70f0d2', '#eafff9');
  cells.push(player);

  BOT_NAMES.forEach((name, index) => {
    const botMass = random(72, 235);
    const position = randomPoint(260);
    const palette = BOT_COLORS[index % BOT_COLORS.length];
    cells.push(createCell('bot', name, botMass, position.x, position.y, palette[0], palette[1]));
  });

  for (let index = 0; index < FOOD_TARGET; index += 1) {
    foods.push(createFood());
  }
}

function createFood(x = random(80, WORLD.width - 80), y = random(80, WORLD.height - 80)): Food {
  return {
    id: nextId++,
    x,
    y,
    color: FOOD_COLORS[Math.floor(Math.random() * FOOD_COLORS.length)],
    size: random(4, 8),
    phase: random(0, Math.PI * 2),
  };
}

function spawnBurst(x: number, y: number, color: string, count = 12): void {
  for (let index = 0; index < count; index += 1) {
    const angle = random(0, Math.PI * 2);
    const force = random(18, 92);
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * force,
      vy: Math.sin(angle) * force,
      life: random(0.35, 0.8),
      maxLife: 0.8,
      color,
      size: random(2, 6),
    });
  }
}

function startGame(): void {
  seedWorld(nameInput.value);
  screenState = 'playing';
  paused = false;
  runStartedAt = performance.now();
  startScreen.classList.add('is-hidden');
  gameover.hidden = true;
  hud.classList.add('is-visible');
  leaderboard.classList.add('is-visible');
  controlsHint.classList.add('is-visible');
  pauseToast.hidden = true;
  canvas.focus();
}

function endGame(killerName = 'otro hunter'): void {
  screenState = 'gameover';
  paused = false;
  gameover.hidden = false;
  finalMass.textContent = Math.round(player.mass).toString();
  finalRank.textContent = `#${getPlayerRank()}`;
  finalTime.textContent = formatTime(simulationTime);
  gameoverCopy.textContent = `${killerName} encontró el ángulo. La arena se queda con la última palabra.`;
  spawnBurst(player.x, player.y, player.color, 30);
}

function getPlayerRank(): number {
  return 1 + cells.filter((cell) => cell.alive && cell.mass > player.mass).length;
}

function setToast(message: string): void {
  eventToast.textContent = message;
  eventToast.classList.add('is-visible');
  if (toastTimer !== undefined) window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => eventToast.classList.remove('is-visible'), 1600);
}

function pointerToWorld(): Vec2 {
  const camera = getCamera();
  return {
    x: (pointer.x - viewWidth / 2) / camera.zoom + camera.x,
    y: (pointer.y - viewHeight / 2) / camera.zoom + camera.y,
  };
}

function getCamera(): { x: number; y: number; zoom: number } {
  const radius = radiusFor(player?.mass ?? 120);
  return {
    x: clamp(player?.x ?? WORLD.width / 2, viewWidth / 2, WORLD.width - viewWidth / 2),
    y: clamp(player?.y ?? WORLD.height / 2, viewHeight / 2, WORLD.height - viewHeight / 2),
    zoom: clamp(1.04 - Math.max(0, radius - 36) * 0.00165, 0.56, 1.04),
  };
}

function moveCell(cell: Cell, destination: Vec2, dt: number): void {
  const dx = destination.x - cell.x;
  const dy = destination.y - cell.y;
  const length = Math.hypot(dx, dy);
  if (length < 1) return;
  const speed = speedFor(cell.mass);
  const amount = Math.min(1, (speed * dt) / length);
  cell.x += dx * amount;
  cell.y += dy * amount;
  const radius = radiusFor(cell.mass);
  cell.x = clamp(cell.x, radius, WORLD.width - radius);
  cell.y = clamp(cell.y, radius, WORLD.height - radius);
}

function updatePlayer(dt: number): void {
  const worldTarget = pointerToWorld();
  player.target = {
    x: clamp(worldTarget.x, 0, WORLD.width),
    y: clamp(worldTarget.y, 0, WORLD.height),
  };
  moveCell(player, player.target, dt);
}

function updateBot(bot: Cell, dt: number): void {
  bot.wanderTimer -= dt;
  if (bot.wanderTimer <= 0) {
    bot.wanderTimer = random(0.9, 2.6);
    const angle = random(0, Math.PI * 2);
    bot.wander = { x: Math.cos(angle), y: Math.sin(angle) };
  }

  let destination = {
    x: bot.x + bot.wander.x * 320,
    y: bot.y + bot.wander.y * 320,
  };
  const playerDistance = distance(bot, player);
  const botRadius = radiusFor(bot.mass);
  const playerRadius = radiusFor(player.mass);

  if (player.alive && playerDistance < 720) {
    if (bot.mass > player.mass * 1.22) {
      destination = { x: player.x, y: player.y };
    } else if (player.mass > bot.mass * 1.18) {
      const awayX = bot.x + (bot.x - player.x) * 1.8;
      const awayY = bot.y + (bot.y - player.y) * 1.8;
      destination = { x: awayX, y: awayY };
    }
  }

  const nearestFood = foods.reduce<{ food: Food | null; distance: number }>((closest, food) => {
    const foodDistance = distance(bot, food);
    return foodDistance < closest.distance ? { food, distance: foodDistance } : closest;
  }, { food: null, distance: 260 }).food;
  if (nearestFood && playerDistance > 420) {
    destination = { x: nearestFood.x, y: nearestFood.y };
  }

  bot.target = destination;
  moveCell(bot, destination, dt * (botRadius > 70 ? 0.92 : 1));
}

function consumeFood(): void {
  for (const cell of cells) {
    if (!cell.alive) continue;
    const radius = radiusFor(cell.mass);
    for (let index = foods.length - 1; index >= 0; index -= 1) {
      const food = foods[index];
      if (distance(cell, food) < radius + food.size) {
        cell.mass += 3.2;
        spawnBurst(food.x, food.y, food.color, 3);
        foods.splice(index, 1);
      }
    }
  }

  while (foods.length < FOOD_TARGET) foods.push(createFood());
}

function consumeCells(): void {
  for (let firstIndex = 0; firstIndex < cells.length; firstIndex += 1) {
    const first = cells[firstIndex];
    if (!first.alive) continue;
    for (let secondIndex = firstIndex + 1; secondIndex < cells.length; secondIndex += 1) {
      const second = cells[secondIndex];
      if (!second.alive) continue;
      const firstRadius = radiusFor(first.mass);
      const secondRadius = radiusFor(second.mass);
      const gap = distance(first, second);
      if (gap > Math.max(firstRadius, secondRadius) * 1.14) continue;

      let eater = first;
      let victim = second;
      if (second.mass > first.mass) {
        eater = second;
        victim = first;
      }
      if (eater.mass <= victim.mass * 1.14 || gap > radiusFor(eater.mass) * 0.86) continue;

      eater.mass += victim.mass * 0.82;
      eater.kills += 1;
      victim.alive = false;
      spawnBurst(victim.x, victim.y, victim.color, 22);
      if (eater === player) setToast(`Absorbiste a ${victim.name}  +${Math.round(victim.mass)} masa`);
      if (victim === player) endGame(eater.name);
    }
  }
  cells = cells.filter((cell) => cell.alive || cell === player);
}

function ejectMass(): void {
  if (screenState !== 'playing' || paused || player.mass < 50) return;
  const target = pointerToWorld();
  const angle = Math.atan2(target.y - player.y, target.x - player.x);
  player.mass -= 16;
  const distanceFromPlayer = radiusFor(player.mass) + 24;
  const food = createFood(
    clamp(player.x + Math.cos(angle) * distanceFromPlayer, 25, WORLD.width - 25),
    clamp(player.y + Math.sin(angle) * distanceFromPlayer, 25, WORLD.height - 25),
  );
  food.size = 10;
  food.color = player.color;
  foods.push(food);
  spawnBurst(food.x, food.y, player.color, 5);
}

function updateParticles(dt: number): void {
  particles = particles.filter((particle) => {
    particle.life -= dt;
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.vx *= Math.pow(0.01, dt);
    particle.vy *= Math.pow(0.01, dt);
    return particle.life > 0;
  });
}

function update(dt: number): void {
  if (screenState !== 'playing' || paused) {
    updateParticles(dt * 0.5);
    return;
  }
  simulationTime += dt;
  updatePlayer(dt);
  cells.filter((cell) => cell.kind === 'bot' && cell.alive).forEach((bot) => updateBot(bot, dt));
  consumeFood();
  consumeCells();
  updateParticles(dt);
  const rank = getPlayerRank();
  bestRank = Math.min(bestRank, rank);
  updateHud(rank);
}

function updateHud(rank = getPlayerRank()): void {
  massValue.textContent = Math.round(player.mass).toString();
  rankValue.textContent = `#${rank}`;
  timerValue.textContent = formatTime(simulationTime);
  const sorted = cells.filter((cell) => cell.alive).sort((a, b) => b.mass - a.mass).slice(0, 5);
  leaderboardList.innerHTML = sorted.map((cell, index) => {
    const isPlayer = cell === player;
    return `<li class="leader-row ${isPlayer ? 'is-player' : ''}"><span class="leader-index">0${index + 1}</span><span class="leader-name"><i style="--dot:${cell.color}"></i>${cell.name}${isPlayer ? '<b>YOU</b>' : ''}</span><strong>${Math.round(cell.mass)}</strong></li>`;
  }).join('');
}

function drawBackground(): void {
  const gradient = ctx.createRadialGradient(viewWidth * 0.52, viewHeight * 0.4, 0, viewWidth * 0.52, viewHeight * 0.4, Math.max(viewWidth, viewHeight) * 0.9);
  gradient.addColorStop(0, '#101b2b');
  gradient.addColorStop(1, '#070b17');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, viewWidth, viewHeight);
}

function drawWorldGrid(camera: { x: number; y: number; zoom: number }): void {
  ctx.save();
  ctx.strokeStyle = 'rgba(142, 176, 198, 0.075)';
  ctx.lineWidth = 1 / camera.zoom;
  const gridSize = 140;
  ctx.beginPath();
  for (let x = 0; x <= WORLD.width; x += gridSize) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, WORLD.height);
  }
  for (let y = 0; y <= WORLD.height; y += gridSize) {
    ctx.moveTo(0, y);
    ctx.lineTo(WORLD.width, y);
  }
  ctx.stroke();

  ctx.strokeStyle = 'rgba(112, 240, 210, 0.22)';
  ctx.lineWidth = 2 / camera.zoom;
  ctx.strokeRect(0, 0, WORLD.width, WORLD.height);
  ctx.restore();
}

function drawFood(food: Food, time: number): void {
  const pulse = 1 + Math.sin(time * 2.2 + food.phase) * 0.14;
  const size = food.size * pulse;
  ctx.save();
  ctx.shadowColor = food.color;
  ctx.shadowBlur = 16;
  ctx.fillStyle = food.color;
  ctx.globalAlpha = 0.9;
  ctx.beginPath();
  ctx.arc(food.x, food.y, size, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 0.8;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(food.x - size * 0.28, food.y - size * 0.32, size * 0.24, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawCell(cell: Cell, time: number): void {
  const radius = radiusFor(cell.mass);
  const pulse = Math.sin(time * 1.6 + cell.pulse) * Math.min(3, radius * 0.035);
  ctx.save();
  ctx.translate(cell.x, cell.y);
  ctx.shadowColor = cell.color;
  ctx.shadowBlur = cell.kind === 'player' ? 34 : 18;
  ctx.globalAlpha = 0.2;
  ctx.fillStyle = cell.color;
  ctx.beginPath();
  ctx.arc(0, 0, radius + 9 + pulse, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  const fill = ctx.createRadialGradient(-radius * 0.3, -radius * 0.35, radius * 0.05, 0, 0, radius * 1.1);
  fill.addColorStop(0, cell.accent);
  fill.addColorStop(0.22, cell.color);
  fill.addColorStop(1, shade(cell.color, -42));
  ctx.globalAlpha = 1;
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.arc(0, 0, radius + pulse, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = cell.kind === 'player' ? 'rgba(234,255,249,.88)' : 'rgba(255,255,255,.24)';
  ctx.lineWidth = cell.kind === 'player' ? 2.5 : 1.5;
  ctx.stroke();

  ctx.globalAlpha = 0.42;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(-radius * 0.3, -radius * 0.38, radius * 0.28, radius * 0.15, -0.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.globalAlpha = 0.95;
  ctx.font = `${Math.max(11, Math.min(16, radius * 0.3))}px ui-monospace, SFMono-Regular, Menlo, monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(0,0,0,.55)';
  ctx.shadowBlur = 8;
  ctx.fillText(cell.name, 0, -Math.min(4, radius * 0.1));
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 0.7;
  ctx.font = `${Math.max(9, Math.min(12, radius * 0.21))}px ui-monospace, SFMono-Regular, Menlo, monospace`;
  ctx.fillText(`${Math.round(cell.mass)} mass`, 0, Math.min(13, radius * 0.3));
  ctx.restore();
}

function drawParticles(): void {
  particles.forEach((particle) => {
    ctx.save();
    ctx.globalAlpha = clamp(particle.life / particle.maxLife, 0, 1);
    ctx.fillStyle = particle.color;
    ctx.shadowColor = particle.color;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
}

function shade(hex: string, amount: number): string {
  const value = hex.replace('#', '');
  const number = Number.parseInt(value, 16);
  const red = clamp((number >> 16) + amount, 0, 255);
  const green = clamp(((number >> 8) & 0xff) + amount, 0, 255);
  const blue = clamp((number & 0xff) + amount, 0, 255);
  return `rgb(${red}, ${green}, ${blue})`;
}

function draw(): void {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, viewWidth, viewHeight);
  drawBackground();
  const camera = getCamera();
  ctx.save();
  ctx.translate(viewWidth / 2, viewHeight / 2);
  ctx.scale(camera.zoom, camera.zoom);
  ctx.translate(-camera.x, -camera.y);
  drawWorldGrid(camera);
  foods.forEach((food) => drawFood(food, simulationTime));
  drawParticles();
  cells.filter((cell) => cell.alive).sort((a, b) => a.mass - b.mass).forEach((cell) => drawCell(cell, simulationTime));
  ctx.restore();

  if (screenState === 'playing' && !pointerActive) {
    ctx.save();
    ctx.globalAlpha = 0.42;
    ctx.strokeStyle = '#70f0d2';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 6]);
    ctx.beginPath();
    ctx.arc(viewWidth / 2, viewHeight / 2, 16, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

function resize(): void {
  const rect = canvas.getBoundingClientRect();
  viewWidth = rect.width;
  viewHeight = rect.height;
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(viewWidth * dpr);
  canvas.height = Math.floor(viewHeight * dpr);
  pointer = { x: viewWidth / 2, y: viewHeight / 2 };
}

function handlePointerMove(event: PointerEvent): void {
  const rect = canvas.getBoundingClientRect();
  pointer = { x: event.clientX - rect.left, y: event.clientY - rect.top };
  pointerActive = true;
}

function togglePause(): void {
  if (screenState !== 'playing') return;
  paused = !paused;
  pauseToast.hidden = !paused;
}

function tick(now: number): void {
  const dt = Math.min(0.05, (now - lastFrame) / 1000);
  lastFrame = now;
  update(dt);
  draw();
  window.requestAnimationFrame(tick);
}

canvas.addEventListener('pointermove', handlePointerMove);
canvas.addEventListener('pointerdown', handlePointerMove);
canvas.addEventListener('pointerleave', () => { pointerActive = false; });
startButton.addEventListener('click', startGame);
restartButton.addEventListener('click', startGame);
nameInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') startGame();
});
window.addEventListener('keydown', (event) => {
  if (event.key.toLowerCase() === 'q') ejectMass();
  if (event.key === 'Escape') togglePause();
  if (event.key === 'Enter' && screenState === 'menu') startGame();
});
window.addEventListener('resize', resize);

resize();
seedWorld(nameInput.value);
updateHud(1);
window.requestAnimationFrame(tick);
