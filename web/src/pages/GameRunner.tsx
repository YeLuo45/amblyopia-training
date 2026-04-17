import React, { useEffect, useRef, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { startSession } from '../lib/api';
import { emitGameStart, emitGameScore, emitGameComplete, emitGameAbort, joinChildRoom } from '../lib/socket';
import { SPATIAL_FREQUENCY_VALUES, GAMES, GAME_TARGET_SCORES, BACKGROUND_SCENES, DEFAULT_BACKGROUND_ID } from '../types';

interface GameState {
  score: number; combo: number; maxCombo: number; accuracy: number;
  totalHits: number; totalMisses: number; level: number;
  timeLeft: number; isRunning: boolean; isPaused: boolean; isComplete: boolean; goalReached: boolean;
}

const GAME_DURATION = 180;

export default function GameRunner() {
  const { gameId } = useParams<{ gameId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { selectedChild } = useAuth();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const gameDataRef = useRef<any>({});
  const [sessionId, setSessionId] = useState<string>('');
  const [gameState, setGameState] = useState<GameState>({
    score: 0, combo: 0, maxCombo: 0, accuracy: 0, totalHits: 0, totalMisses: 0, level: 1,
    timeLeft: GAME_DURATION, isRunning: false, isPaused: false, isComplete: false, goalReached: false
  });
  const [stars, setStars] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const trainingMode = (location.state as any)?.trainingMode || 'monocular';
  const spatialFrequency = (location.state as any)?.spatialFrequency || 'medium';
  const childId = (location.state as any)?.childId || selectedChild?.id;
  const backgroundId = (location.state as any)?.backgroundId || DEFAULT_BACKGROUND_ID;

  const targetScore = GAME_TARGET_SCORES[gameId || ''] || 300;
  const bgScene = BACKGROUND_SCENES.find(b => b.id === backgroundId) || BACKGROUND_SCENES[0];

  useEffect(() => {
    async function initGame() {
      if (!childId || !gameId) return;
      try {
        const res = await startSession({ child_id: childId, game_id: gameId, training_mode: trainingMode, dominant_eye: 'both', spatial_frequency: spatialFrequency });
        setSessionId(res.session_id);
        joinChildRoom(childId);
        emitGameStart({ sessionId: res.session_id, childId, gameId, spatialFrequency, trainingMode });
      } catch (err) { console.error('Failed to start session:', err); navigate('/games'); }
    }
    initGame();
    return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); };
  }, []);

  useEffect(() => {
    if (!sessionId) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    function resize() { canvas.width = canvas.offsetWidth * window.devicePixelRatio; canvas.height = canvas.offsetHeight * window.devicePixelRatio; ctx.scale(window.devicePixelRatio, window.devicePixelRatio); }
    resize();
    window.addEventListener('resize', resize);
    initGameState(ctx, canvas.offsetWidth, canvas.offsetHeight);
    let lastTime = performance.now();
    let timeAccumulator = 0;
    function gameLoop(currentTime: number) {
      const dt = (currentTime - lastTime) / 1000; lastTime = currentTime;
      if (!gameState.isPaused && gameState.isRunning && !gameState.isComplete) {
        timeAccumulator += dt;
        setGameState(prev => {
          if (prev.score >= targetScore && !prev.goalReached) { triggerComplete(prev.score, true); return { ...prev, score: prev.score, goalReached: true, isComplete: true }; }
          const newTime = Math.max(0, prev.timeLeft - dt);
          if (newTime <= 0) { triggerComplete(prev.score, false); return { ...prev, timeLeft: 0, isComplete: true }; }
          return { ...prev, timeLeft: newTime, level: Math.min(3, Math.floor((GAME_DURATION - newTime) / 60) + 1) };
        });
        updateGame(dt, ctx, canvas.offsetWidth, canvas.offsetHeight);
        if (timeAccumulator > 1) { emitGameScore({ sessionId, score: gameState.score, accuracy: gameState.accuracy, combo: gameState.combo }); timeAccumulator = 0; }
      }
      renderGame(ctx, canvas.offsetWidth, canvas.offsetHeight);
      animationRef.current = requestAnimationFrame(gameLoop);
    }
    setGameState(prev => ({ ...prev, isRunning: true }));
    animationRef.current = requestAnimationFrame(gameLoop);
    return () => { window.removeEventListener('resize', resize); if (animationRef.current) cancelAnimationFrame(animationRef.current); };
  }, [sessionId]);

  function triggerComplete(finalScore: number, goalReached: boolean) {
    emitGameComplete({ sessionId, score: finalScore, duration: GAME_DURATION - gameState.timeLeft, accuracy: gameState.accuracy, comboMax: gameState.maxCombo, levelCompleted: gameState.level });
    const acc = gameState.accuracy;
    let s = goalReached ? (acc >= 90 ? 3 : acc >= 70 ? 2 : 2) : (acc >= 80 ? 2 : 1);
    setStars(s); setShowResult(true);
  }

  function initGameState(ctx: CanvasRenderingContext2D, width: number, height: number) {
    const sf = SPATIAL_FREQUENCY_VALUES[spatialFrequency];
    gameDataRef.current = { width, height, particles: [], scorePopups: [],
      stars: Array.from({ length: 12 }, () => ({ x: Math.random() * width, y: Math.random() * height, size: 3 + Math.random() * 5, twinkle: Math.random() * Math.PI * 2, speed: 0.5 + Math.random() * 1.5 })),
      clouds: Array.from({ length: 4 }, (_, i) => ({ x: (width / 3) * i + Math.random() * 60, y: 30 + Math.random() * 60, size: 40 + Math.random() * 30, speed: 0.2 + Math.random() * 0.3 })) };
    switch (gameId) {
      case 'stripe-chase': gameDataRef.current.stripes = []; gameDataRef.current.stripeOffset = 0;
        for (let i = 0; i < 20; i++) gameDataRef.current.stripes.push({ offset: (i / 20) * width * 1.5, dir: i % 2 === 0 ? 1 : -1 });
        gameDataRef.current.target = { x: width / 2, y: height / 2, radius: 35, speedX: 3, speedY: 2, rotation: 0 }; break;
      case 'dot-pop': gameDataRef.current.dots = []; const dotColors = ['#FF6B9D', '#4FC3F7', '#81C784', '#FFD54F', '#BA68C8'];
        gameDataRef.current.targetColor = dotColors[Math.floor(Math.random() * dotColors.length)];
        for (let i = 0; i < 8 + Math.floor(sf * 2); i++) gameDataRef.current.dots.push({ x: 80 + Math.random() * (width - 160), y: 80 + Math.random() * (height - 160), radius: Math.max(15, 30 - sf * 4), color: dotColors[Math.floor(Math.random() * dotColors.length)], pulsePhase: Math.random() * Math.PI * 2, isPopped: false, bobPhase: Math.random() * Math.PI * 2 }); break;
      case 'memory-flip': gameDataRef.current.cards = []; gameDataRef.current.flippedCards = []; gameDataRef.current.matchedPairs = 0; gameDataRef.current.showTimer = 3; gameDataRef.current.showing = true; gameDataRef.current.canClick = false;
        const emjs = ['A', 'B', 'C', 'D', 'E', 'F']; const all = [...emjs, ...emjs]; for (let i = all.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [all[i], all[j]] = [all[j], all[i]]; }
        const cw = Math.min(100, (width - 40) / 3 - 10), ch = cw * 1.2, sx = (width - 3 * (cw + 10)) / 2, sy = (height - 4 * (ch + 10)) / 2;
        all.forEach((e, i) => { const col = i % 3, row = Math.floor(i / 3); gameDataRef.current.cards.push({ id: i, emoji: e, x: sx + col * (cw + 10), y: sy + row * (ch + 10), width: cw, height: ch, isFlipped: false, isMatched: false }); }); break;
      case 'fusion-puzzle': gameDataRef.current.pieces = []; gameDataRef.current.placed = 0;
        const ems = ['1', '2', '3', '4', '5', '6', '7', '8', '9']; const gs = 3, ps = Math.min(70, (Math.min(width, height) - 100) / gs), fxs = width / 2 - gs * ps / 2, fys = height / 2 - gs * ps / 2;
        for (let r = 0; r < gs; r++) for (let c = 0; c < gs; c++) { const idx = r * gs + c; gameDataRef.current.pieces.push({ id: idx, emoji: ems[idx], correctX: fxs + c * ps + ps / 2, correctY: fys + r * ps + ps / 2, x: 50 + Math.random() * (width - 100), y: 80 + Math.random() * (height - 160), size: ps - 4 }); } break;
      case 'draw-line': gameDataRef.current.paths = []; gameDataRef.current.currentPathIdx = 0; gameDataRef.current.currentDotIdx = 0; gameDataRef.current.dotsHit = 0;
        let px = 60, py = height / 2; for (let p = 0; p < 2 + Math.floor(Math.random() * 2); p++) { const path: any = { dots: [{ x: px, y: py, hit: p === 0 }], completed: p === 0 }; for (let s = 0; s < 3 + Math.floor(Math.random() * 3); s++) { px = Math.max(40, Math.min(width - 40, px + 60 + Math.random() * 80)); py = Math.max(40, Math.min(height - 40, py + (Math.random() - 0.5) * 150)); path.dots.push({ x: px, y: py, hit: false }); } gameDataRef.current.paths.push(path); } break;
      case 'accommodation-lift': gameDataRef.current.targets = []; gameDataRef.current.currentIndex = 0; gameDataRef.current.nearY = height * 0.72; gameDataRef.current.farY = height * 0.28; gameDataRef.current.isNear = true; gameDataRef.current.targetRadius = 35; gameDataRef.current.cycleDuration = 4; gameDataRef.current.autoTimer = 0;
        for (let i = 0; i < 12; i++) gameDataRef.current.targets.push({ x: 80 + Math.random() * (width - 160), y: i % 2 === 0 ? gameDataRef.current.nearY : gameDataRef.current.farY, isNear: i % 2 === 0, hit: false, id: i }); break;
      case 'sf-matching': gameDataRef.current.cards = []; gameDataRef.current.flippedCards = []; gameDataRef.current.matchedPairs = 0; gameDataRef.current.canClick = true; gameDataRef.current.showing = false;
        const pats = ['A', 'B', 'C', 'D', 'E', 'F']; const all2 = [...pats, ...pats]; for (let i = all2.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [all2[i], all2[j]] = [all2[j], all2[i]]; }
        const cws = Math.min(80, (width - 40) / 4 - 8), chs = cws * 1.3, sxs = (width - 4 * (cws + 8)) / 2, sys = (height - 3 * (chs + 8)) / 2;
        all2.forEach((p, i) => { const col = i % 4, row = Math.floor(i / 4); gameDataRef.current.cards.push({ id: i, pattern: p, x: sxs + col * (cws + 8), y: sys + row * (chs + 8), width: cws, height: chs, isFlipped: false, isMatched: false }); }); break;
      case 'depth-blocks': gameDataRef.current.blocks = []; gameDataRef.current.nextBlockIndex = 0; gameDataRef.current.matched = 0;
        for (let i = 0; i < 4; i++) gameDataRef.current.blocks.push({ id: i, depth: i, x: 80 + Math.random() * (width - 200), y: 80 + Math.random() * (height - 250), w: 70, h: 70, disparity: 10 + i * 6, matched: false });
        gameDataRef.current.blocks.sort(() => Math.random() - 0.5); break;
      case 'visual-search-maze': gameDataRef.current.gridSize = 8; gameDataRef.current.cellSize = Math.floor((Math.min(width, height) - 80) / 8); gameDataRef.current.offsetX = (width - 8 * gameDataRef.current.cellSize) / 2; gameDataRef.current.offsetY = 80; gameDataRef.current.player = { x: 0, y: 0 }; gameDataRef.current.exit = { x: 7, y: 7 }; gameDataRef.current.visited = Array(8).fill(0).map(() => Array(8).fill(false)); gameDataRef.current.walls = [];
        for (let i = 0; i < 10; i++) { const wx = Math.floor(Math.random() * 8), wy = Math.floor(Math.random() * 8); if (!(wx === 0 && wy === 0) && !(wx === 7 && wy === 7)) gameDataRef.current.walls.push({ x: wx, y: wy }); } break;
      case 'quick-match': gameDataRef.current.cards = []; gameDataRef.current.matched = 0; gameDataRef.current.waiting = false; gameDataRef.current.currentShowing = null; gameDataRef.current.requiredMatches = 5;
        const qemjs = ['!', '@', '#', '$', '%']; const all3 = [...qemjs.slice(0, 5), ...qemjs.slice(0, 5)]; for (let i = all3.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [all3[i], all3[j]] = [all3[j], all3[i]]; }
        const cwq = Math.min(80, (width - 40) / 5 - 8), chq = cwq * 1.3, sxq = (width - 5 * (cwq + 8)) / 2, syq = (height - 2 * (chq + 8)) / 2;
        all3.forEach((e, i) => { const col = i % 5, row = Math.floor(i / 5); gameDataRef.current.cards.push({ id: i, emoji: e, x: sxq + col * (cwq + 8), y: syq + row * (chq + 8), width: cwq, height: chq, isMatched: false }); });
        gameDataRef.current.nextCard = () => { const u = gameDataRef.current.cards.filter((c: any) => !c.isMatched); if (u.length < 2) { setGameState(prev => ({ ...prev, isComplete: true })); return; } const idx = Math.floor(Math.random() * u.length); gameDataRef.current.currentShowing = u[idx]; gameDataRef.current.waiting = true; gameDataRef.current.showTimer = 1.5; };
        gameDataRef.current.nextCard(); break;
    }
  }

  function updateGame(dt: number, ctx: CanvasRenderingContext2D, width: number, height: number) {
    const data = gameDataRef.current;
    data.stars.forEach((s: any) => { s.twinkle += dt * s.speed * 3; });
    data.clouds.forEach((c: any) => { c.x += c.speed * dt * 20; if (c.x > width + 100) c.x = -100; });
    switch (gameId) {
      case 'stripe-chase': { const sf = SPATIAL_FREQUENCY_VALUES[spatialFrequency]; data.stripeOffset = (data.stripeOffset || 0) + 2 * sf * dt * 60; const t = data.target; t.rotation += dt * 2; t.x += t.speedX * dt * 60; t.y += t.speedY * dt * 60; if (t.x < t.radius || t.x > width - t.radius) t.speedX *= -1; if (t.y < t.radius || t.y > height - t.radius) t.speedY *= -1; t.x = Math.max(t.radius, Math.min(width - t.radius, t.x)); t.y = Math.max(t.radius, Math.min(height - t.radius, t.y)); break; }
      case 'dot-pop': data.dots.forEach((d: any) => { if (!d.isPopped) { d.pulsePhase += dt * 3; d.bobPhase = (d.bobPhase || 0) + 0.02; } }); break;
      case 'memory-flip': if (data.showing) { data.showTimer -= dt; if (data.showTimer <= 0) { data.showing = false; data.canClick = true; data.cards.forEach((c: any) => c.isFlipped = false); } } break;
      case 'accommodation-lift': data.autoTimer = (data.autoTimer || 0) + dt; if (data.autoTimer > (data.cycleDuration || 4)) { data.autoTimer = 0; data.isNear = !data.isNear; if (data.currentIndex < data.targets.length - 1) data.currentIndex++; } break;
      case 'sf-matching': if (data.showing) { data.showTimer -= dt; if (data.showTimer <= 0) { data.showing = false; data.canClick = true; data.cards.forEach((c: any) => c.isFlipped = false); } } break;
      case 'quick-match': if (data.waiting) { data.showTimer -= dt; if (data.showTimer <= 0) { data.waiting = false; data.currentShowing = null; if (data.nextCard) data.nextCard(); } } break;
    }
    data.particles = data.particles.filter((p: any) => p.life > 0);
    data.particles.forEach((p: any) => { p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; p.vy += 200 * dt; });
    data.scorePopups = data.scorePopups.filter((p: any) => p.life > 0);
    data.scorePopups.forEach((p: any) => { p.y -= 40 * dt; p.life -= dt; });
  }

  function drawCartoonBg(ctx: CanvasRenderingContext2D, width: number, height: number) {
    const data = gameDataRef.current;
    const colors = bgScene.colors || ['#1a1a2e', '#16213e', '#0f3460'];
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, colors[0]); grad.addColorStop(0.5, colors[1] || colors[0]); grad.addColorStop(1, colors[2] || colors[1] || colors[0]);
    ctx.fillStyle = grad; ctx.fillRect(0, 0, width, height);
    if (bgScene.patternType === 'dots') { ctx.fillStyle = 'rgba(255,255,255,0.04)'; for (let x = 0; x < width; x += 30) for (let y = 0; y < height; y += 30) { ctx.beginPath(); ctx.arc(x + 15, y + 15, 2, 0, Math.PI * 2); ctx.fill(); } }
    else if (bgScene.patternType === 'wave') { ctx.strokeStyle = 'rgba(255,255,255,0.06)'; ctx.lineWidth = 2; for (let y = 0; y < height; y += 40) { ctx.beginPath(); for (let x = 0; x < width; x += 5) ctx.lineTo(x, y + Math.sin((x + Date.now() / 500) * 0.05) * 8); ctx.stroke(); } }
    data.stars.forEach((s: any) => { const alpha = 0.3 + Math.sin(s.twinkle) * 0.3; ctx.fillStyle = `rgba(255,255,200,${alpha})`; ctx.beginPath(); for (let i = 0; i < 4; i++) { const a = (i * Math.PI) / 2, a2 = a + Math.PI / 4; if (i === 0) ctx.moveTo(s.x + Math.cos(a) * s.size, s.y + Math.sin(a) * s.size); else ctx.lineTo(s.x + Math.cos(a) * s.size, s.y + Math.sin(a) * s.size); ctx.lineTo(s.x + Math.cos(a2) * s.size * 0.4, s.y + Math.sin(a2) * s.size * 0.4); } ctx.closePath(); ctx.fill(); });
    data.clouds.forEach((c: any) => { ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.beginPath(); ctx.arc(c.x, c.y, c.size * 0.5, 0, Math.PI * 2); ctx.arc(c.x + c.size * 0.4, c.y - c.size * 0.1, c.size * 0.4, 0, Math.PI * 2); ctx.arc(c.x + c.size * 0.8, c.y, c.size * 0.35, 0, Math.PI * 2); ctx.arc(c.x + c.size * 0.4, c.y + c.size * 0.2, c.size * 0.3, 0, Math.PI * 2); ctx.fill(); });
  }

  function rRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r); ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h); ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r); ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath(); }

  function renderGame(ctx: CanvasRenderingContext2D, width: number, height: number) {
    const data = gameDataRef.current;
    drawCartoonBg(ctx, data.width, data.height);
    switch (gameId) {
      case 'stripe-chase': renderStripeChase(ctx, data, width, height); break;
      case 'dot-pop': renderDotPop(ctx, data, width, height); break;
      case 'memory-flip': renderMemoryFlip(ctx, data, width, height); break;
      case 'fusion-puzzle': renderFusionPuzzle(ctx, data, width, height); break;
      case 'draw-line': renderDrawLine(ctx, data, width, height); break;
      case 'accommodation-lift': renderAccommodationLift(ctx, data, width, height); break;
      case 'sf-matching': renderSfMatching(ctx, data, width, height); break;
      case 'depth-blocks': renderDepthBlocks(ctx, data, width, height); break;
      case 'visual-search-maze': renderVisualSearchMaze(ctx, data, width, height); break;
      case 'quick-match': renderQuickMatch(ctx, data, width, height); break;
    }
    renderHUD(ctx, data.width, data.height);
    data.particles.forEach((p: any) => { ctx.globalAlpha = Math.max(0, p.life); ctx.fillStyle = p.color; ctx.shadowColor = p.color; ctx.shadowBlur = 8; ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0; }); ctx.globalAlpha = 1;
    data.scorePopups.forEach((p: any) => { ctx.globalAlpha = Math.max(0, p.life); ctx.fillStyle = p.color; ctx.font = 'bold 22px sans-serif'; ctx.textAlign = 'center'; ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 4; ctx.fillText('+' + p.score, p.x, p.y); ctx.shadowBlur = 0; }); ctx.globalAlpha = 1;
  }

  function renderHUD(ctx: CanvasRenderingContext2D, width: number, height: number) {
    ctx.fillStyle = 'rgba(0,0,0,0.4)'; rRect(ctx, 12, 12, width - 24, 60, 16); ctx.fill();
    const game = GAMES.find(g => g.id === gameId);
    ctx.fillStyle = '#FFF'; ctx.font = 'bold 16px sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(game?.name_cn || gameId || '', 24, 42);
    ctx.font = 'bold 20px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(gameState.score + ' pts', width / 2, 42);
    const mins = Math.floor(gameState.timeLeft / 60), secs = Math.floor(gameState.timeLeft % 60);
    ctx.fillStyle = gameState.timeLeft < 30 ? '#FF6B6B' : '#FFF'; ctx.font = 'bold 18px sans-serif'; ctx.textAlign = 'right'; ctx.fillText(mins + ':' + String(secs).padStart(2, '0'), width - 180, 42);
    const progress = Math.min(1, gameState.score / targetScore);
    const barX = width - 170, barY = 34, barW = 130, barH = 16;
    ctx.fillStyle = 'rgba(255,255,255,0.2)'; rRect(ctx, barX, barY, barW, barH, 8); ctx.fill();
    const pColor = progress >= 1 ? '#48BB78' : progress >= 0.6 ? '#FFD700' : '#FF6B9D';
    ctx.fillStyle = pColor; if (progress > 0) { rRect(ctx, barX, barY, barW * progress, barH, 8); ctx.fill(); }
    ctx.fillStyle = '#FFF'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('Goal:' + targetScore, barX + barW / 2, barY + barH / 2 + 1);
    ctx.fillStyle = 'rgba(0,0,0,0.4)'; rRect(ctx, 12, 80, 130, 40, 12); ctx.fill();
    ctx.fillStyle = '#81C784'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'left'; ctx.fillText('Acc ' + gameState.accuracy + '%', 22, 100);
    ctx.fillStyle = '#FFD700'; ctx.fillText('Combo ' + gameState.combo + 'x', 22, 116);
  }
  function renderStripeChase(ctx: CanvasRenderingContext2D, data: any, width: number, height: number) {
    const sf = SPATIAL_FREQUENCY_VALUES[spatialFrequency], sw = 40 / sf;
    data.stripes.forEach((s: any, i: number) => { const x = ((s.offset + (data.stripeOffset || 0) * s.dir) % (width + sw * 2)) - sw; const g = ctx.createLinearGradient(x, 0, x + sw, 0); g.addColorStop(0, i % 2 === 0 ? '#1a1a2e' : '#2a2a4e'); g.addColorStop(1, i % 2 === 0 ? '#2a2a4e' : '#1a1a2e'); ctx.fillStyle = g; ctx.fillRect(x, 0, sw, height); });
    const t = data.target; ctx.save(); ctx.translate(t.x, t.y); ctx.rotate(Math.sin(t.rotation || 0) * 0.15);
    ctx.fillStyle = '#FFD700'; ctx.shadowColor = '#FFD700'; ctx.shadowBlur = 15; ctx.beginPath(); ctx.ellipse(0, 0, t.radius, t.radius * 0.65, 0, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
    ctx.fillStyle = '#FF8C00'; ctx.beginPath(); ctx.moveTo(t.radius * 0.4, 0); ctx.lineTo(t.radius * 1.3, -t.radius * 0.5); ctx.lineTo(t.radius * 1.3, t.radius * 0.5); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(-t.radius * 0.25, -t.radius * 0.1, t.radius * 0.18, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#FFF'; ctx.beginPath(); ctx.arc(-t.radius * 0.3, -t.radius * 0.15, t.radius * 0.08, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; rRect(ctx, width / 2 - 100, 155, 200, 36, 12); ctx.fill();
    ctx.fillStyle = '#FFF'; ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('Click the fish!', width / 2, 178);
  }

  function renderDotPop(ctx: CanvasRenderingContext2D, data: any, width: number, height: number) {
    ctx.strokeStyle = 'rgba(255,255,255,0.06)'; ctx.lineWidth = 1; for (let x = 0; x < width; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke(); } for (let y = 0; y < height; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke(); }
    ctx.fillStyle = 'rgba(0,0,0,0.4)'; rRect(ctx, width / 2 - 100, 155, 200, 36, 12); ctx.fill();
    ctx.fillStyle = '#FFF'; ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('Click colored dots!', width / 2, 178);
    data.dots.forEach((dot: any) => { if (dot.isPopped) return; const by = dot.y + Math.sin(dot.bobPhase) * 4, p = 1 + Math.sin(dot.pulsePhase) * 0.12, r = dot.radius * p; ctx.shadowColor = dot.color; ctx.shadowBlur = 20; ctx.fillStyle = dot.color; ctx.beginPath(); ctx.arc(dot.x, by, r, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0; ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.beginPath(); ctx.arc(dot.x - r * 0.3, by - r * 0.3, r * 0.35, 0, Math.PI * 2); ctx.fill(); });
  }

  function renderMemoryFlip(ctx: CanvasRenderingContext2D, data: any, width: number, height: number) {
    data.cards.forEach((card: any) => {
      if (card.isMatched) { ctx.fillStyle = '#48BB78'; ctx.shadowColor = '#48BB78'; ctx.shadowBlur = 10; rRect(ctx, card.x, card.y, card.width, card.height, 10); ctx.fill(); ctx.shadowBlur = 0; }
      else if (card.isFlipped || data.showing) { ctx.fillStyle = '#4A90E2'; rRect(ctx, card.x, card.y, card.width, card.height, 10); ctx.fill(); }
      else { ctx.fillStyle = '#2D3748'; rRect(ctx, card.x, card.y, card.width, card.height, 10); ctx.fill(); ctx.fillStyle = '#4A5568'; ctx.font = card.width * 0.45 + 'px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('?', card.x + card.width / 2, card.y + card.height / 2); }
      if (card.isFlipped || data.showing || card.isMatched) { ctx.font = card.width * 0.5 + 'px Arial'; ctx.fillStyle = '#FFF'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(card.emoji, card.x + card.width / 2, card.y + card.height / 2); }
      ctx.strokeStyle = card.isMatched ? '#48BB78' : card.isFlipped ? '#4A90E2' : '#4A5568'; ctx.lineWidth = 2; ctx.stroke();
    });
    if (data.showing) { ctx.fillStyle = 'rgba(0,0,0,0.6)'; rRect(ctx, width / 2 - 130, 155, 260, 36, 12); ctx.fill(); ctx.fillStyle = '#FFD700'; ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('Remember! ' + Math.ceil(data.showTimer) + 's', width / 2, 178); }
  }

  function renderFusionPuzzle(ctx: CanvasRenderingContext2D, data: any, width: number, height: number) {
    ctx.fillStyle = 'rgba(255,0,0,0.04)'; ctx.fillRect(0, 0, width / 2, height); ctx.fillStyle = 'rgba(0,0,255,0.04)'; ctx.fillRect(width / 2, 0, width / 2, height);
    const gs = 3, ps = data.pieces[0]?.size || 60, sx = width / 2 - gs * ps / 2, sy = height / 2 - gs * ps / 2;
    ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.lineWidth = 1; ctx.strokeRect(sx, sy, gs * ps, gs * ps);
    for (let i = 1; i < gs; i++) { ctx.beginPath(); ctx.moveTo(sx + i * ps, sy); ctx.lineTo(sx + i * ps, sy + gs * ps); ctx.stroke(); ctx.beginPath(); ctx.moveTo(sx, sy + i * ps); ctx.lineTo(sx + gs * ps, sy + i * ps); ctx.stroke(); }
    data.pieces.forEach((piece: any) => { const ip = Math.abs(piece.x - piece.correctX) < ps / 2 && Math.abs(piece.y - piece.correctY) < ps / 2; ctx.fillStyle = ip ? 'rgba(72,187,120,0.9)' : 'rgba(255,255,255,0.92)'; ctx.shadowColor = ip ? '#48BB78' : 'rgba(0,0,0,0.3)'; ctx.shadowBlur = ip ? 12 : 4; rRect(ctx, piece.x - piece.size / 2, piece.y - piece.size / 2, piece.size, piece.size, 8); ctx.fill(); ctx.shadowBlur = 0; ctx.font = piece.size * 0.55 + 'px Arial'; ctx.fillStyle = ip ? '#FFF' : '#1a1a2e'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(piece.emoji, piece.x, piece.y); ctx.strokeStyle = ip ? '#48BB78' : 'rgba(255,255,255,0.5)'; ctx.lineWidth = 2; ctx.stroke(); });
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; rRect(ctx, width / 2 - 90, 155, 180, 36, 12); ctx.fill(); ctx.fillStyle = '#FFF'; ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('Puzzle ' + data.placed + '/' + data.pieces.length, width / 2, 178);
  }

  function renderDrawLine(ctx: CanvasRenderingContext2D, data: any, width: number, height: number) {
    data.paths.forEach((path: any, pi: number) => { const ia = pi === data.currentPathIdx; ctx.strokeStyle = ia ? 'rgba(74,144,226,0.7)' : 'rgba(255,255,255,0.2)'; ctx.lineWidth = ia ? 5 : 3; ctx.setLineDash([10, 5]); ctx.beginPath(); path.dots.forEach((d: any, di: number) => { if (di === 0) ctx.moveTo(d.x, d.y); else ctx.lineTo(d.x, d.y); }); ctx.stroke(); ctx.setLineDash([]); path.dots.forEach((d: any, di: number) => { const in2 = ia && di === data.currentDotIdx, ih = d.hit; if (in2) ctx.shadowColor = '#FFD700', ctx.shadowBlur = 15; ctx.beginPath(); ctx.arc(d.x, d.y, in2 ? 20 : ih ? 14 : 12, 0, Math.PI * 2); ctx.fillStyle = ih ? '#48BB78' : in2 ? '#FFD700' : ia ? '#4A90E2' : 'rgba(255,255,255,0.35)'; ctx.fill(); ctx.shadowBlur = 0; if (!ih && !in2) ctx.stroke(); if (in2) ctx.fillStyle = '#1a1a2e', ctx.font = 'bold 14px Arial', ctx.textAlign = 'center', ctx.textBaseline = 'middle', ctx.fillText(di + 1 + '', d.x, d.y); }); });
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; rRect(ctx, width / 2 - 100, 155, 200, 36, 12); ctx.fill(); ctx.fillStyle = '#FFF'; ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('Connect dots in order!', width / 2, 178);
  }

  function renderAccommodationLift(ctx: CanvasRenderingContext2D, data: any, width: number, height: number) {
    const fg = ctx.createLinearGradient(0, 0, 0, height * 0.45); fg.addColorStop(0, 'rgba(100,149,237,0.15)'); fg.addColorStop(1, 'rgba(100,149,237,0.05)'); ctx.fillStyle = fg; ctx.fillRect(0, 0, width, height * 0.45);
    const ng = ctx.createLinearGradient(0, height * 0.45, 0, height); ng.addColorStop(0, 'rgba(255,100,100,0.05)'); ng.addColorStop(1, 'rgba(255,100,100,0.15)'); ctx.fillStyle = ng; ctx.fillRect(0, height * 0.45, width, height * 0.55);
    ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.font = '13px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('Far', width / 2, height * 0.15); ctx.fillText('Near', width / 2, height * 0.88);
    ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.setLineDash([8, 4]); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, height * 0.45); ctx.lineTo(width, height * 0.45); ctx.stroke(); ctx.setLineDash([]);
    data.targets.forEach((t: any, i: number) => { if (t.hit) return; const ia = i === data.currentIndex, p = ia ? 1 + Math.sin(Date.now() / 200) * 0.12 : 1, r = data.targetRadius * p; ctx.shadowColor = t.isNear ? '#FF6B6B' : '#6B9FFF'; ctx.shadowBlur = ia ? 25 : 0; ctx.fillStyle = ia ? (t.isNear ? '#FF6B6B' : '#FFD700') : (t.isNear ? 'rgba(255,107,107,0.5)' : 'rgba(255,215,0,0.5)'); ctx.beginPath(); ctx.arc(t.x, t.y, r, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0; ctx.fillStyle = '#FFF'; ctx.font = 'bold ' + Math.floor(r * 0.8) + 'px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(t.isNear ? 'N' : 'F', t.x, t.y); });
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; rRect(ctx, width / 2 - 110, 155, 220, 36, 12); ctx.fill(); ctx.fillStyle = data.isNear ? '#FF6B6B' : '#FFD700'; ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('Click ' + (data.isNear ? 'NEAR' : 'FAR') + '!', width / 2, 178);
  }

  function renderSfMatching(ctx: CanvasRenderingContext2D, data: any, width: number, height: number) {
    data.cards.forEach((card: any) => {
      if (card.isFlipped || card.isMatched) { ctx.fillStyle = card.isMatched ? '#805AD5' : '#4A90E2'; if (card.isMatched) ctx.shadowColor = '#805AD5', ctx.shadowBlur = 8; rRect(ctx, card.x, card.y, card.width, card.height, 8); ctx.fill(); ctx.shadowBlur = 0; ctx.font = card.height * 0.55 + 'px Arial'; ctx.fillStyle = '#FFF'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(card.pattern, card.x + card.width / 2, card.y + card.height / 2); }
      else { ctx.fillStyle = '#2D3748'; rRect(ctx, card.x, card.y, card.width, card.height, 8); ctx.fill(); ctx.fillStyle = '#4A5568'; ctx.font = '22px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('?', card.x + card.width / 2, card.y + card.height / 2); }
      ctx.strokeStyle = card.isMatched ? '#805AD5' : '#4A5568'; ctx.lineWidth = 2; ctx.stroke();
    });
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; rRect(ctx, width / 2 - 110, 155, 220, 36, 12); ctx.fill(); ctx.fillStyle = '#FFF'; ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('Match! Pairs:' + data.matchedPairs, width / 2, 178);
  }

  function renderDepthBlocks(ctx: CanvasRenderingContext2D, data: any, width: number, height: number) {
    ctx.strokeStyle = 'rgba(255,255,255,0.05)'; ctx.lineWidth = 1; for (let i = 0; i < width; i += 50) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, height); ctx.stroke(); } for (let i = 0; i < height; i += 50) { ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(width, i); ctx.stroke(); }
    data.blocks.forEach((block: any, idx: number) => { if (block.matched) return; const off = block.disparity * 0.15; ctx.globalAlpha = 0.3; ctx.fillStyle = '#FF4444'; ctx.fillRect(block.x + off, block.y, block.w, block.h); ctx.fillStyle = '#4488FF'; ctx.fillRect(block.x - off, block.y, block.w, block.h); ctx.globalAlpha = 1; const cols = ['#F6AD55', '#68D391', '#63B3ED', '#B794F4']; ctx.fillStyle = idx === data.nextBlockIndex ? cols[idx % cols.length] : '#718096'; ctx.shadowColor = cols[idx % cols.length]; ctx.shadowBlur = idx === data.nextBlockIndex ? 12 : 0; rRect(ctx, block.x, block.y, block.w, block.h, 8); ctx.fill(); ctx.shadowBlur = 0; ctx.fillStyle = '#FFF'; ctx.font = 'bold 20px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText((idx + 1) + '', block.x + block.w / 2, block.y + block.h / 2); ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 2; ctx.stroke(); });
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; rRect(ctx, width / 2 - 120, 155, 240, 36, 12); ctx.fill(); ctx.fillStyle = '#FFF'; ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('Depth 1->' + data.blocks.length + '!', width / 2, 178);
  }

  function renderVisualSearchMaze(ctx: CanvasRenderingContext2D, data: any, width: number, height: number) {
    const sf = SPATIAL_FREQUENCY_VALUES[spatialFrequency], sw = 25 / sf;
    for (let i = 0; i < width / sw + 2; i++) { const g = ctx.createLinearGradient(i * sw, 0, i * sw + sw, 0); g.addColorStop(0, i % 2 === 0 ? '#252545' : '#1a1a2e'); g.addColorStop(1, i % 2 === 0 ? '#2a2a4e' : '#1a1a2e'); ctx.fillStyle = g; ctx.fillRect(i * sw, 0, sw, height); }
    for (let row = 0; row < data.gridSize; row++) for (let col = 0; col < data.gridSize; col++) { const x = data.offsetX + col * data.cellSize, y = data.offsetY + row * data.cellSize, iw = data.walls.some((w: any) => w.x === col && w.y === row), iv = data.visited[row][col], iss = row === 0 && col === 0, iex = row === data.exit.y && col === data.exit.x;
      if (iw) ctx.fillStyle = 'rgba(139,90,43,0.7)'; else ctx.fillStyle = iv ? 'rgba(72,187,120,0.6)' : 'rgba(255,255,255,0.08)';
      ctx.fillRect(x + 1, y + 1, data.cellSize - 2, data.cellSize - 2);
      if (iss) { ctx.fillStyle = '#48BB78'; ctx.shadowColor = '#48BB78'; ctx.shadowBlur = 8; ctx.beginPath(); ctx.arc(x + data.cellSize / 2, y + data.cellSize / 2, data.cellSize / 3, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0; }
      if (iex && !iv) { ctx.fillStyle = '#E53E3E'; ctx.shadowColor = '#E53E3E'; ctx.shadowBlur = 10; ctx.beginPath(); ctx.arc(x + data.cellSize / 2, y + data.cellSize / 2, data.cellSize / 3, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0; }
      ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.lineWidth = 1; ctx.strokeRect(x, y, data.cellSize, data.cellSize); }
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; rRect(ctx, width / 2 - 100, 155, 200, 36, 12); ctx.fill(); ctx.fillStyle = '#FFF'; ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('Find path to exit!', width / 2, 178);
  }

  function renderQuickMatch(ctx: CanvasRenderingContext2D, data: any, width: number, height: number) {
    ctx.strokeStyle = 'rgba(255,255,255,0.05)'; ctx.lineWidth = 1; for (let i = 0; i < width; i += 40) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, height); ctx.stroke(); } for (let i = 0; i < height; i += 40) { ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(width, i); ctx.stroke(); }
    data.cards.forEach((card: any) => { ctx.fillStyle = card.isMatched ? 'rgba(72,187,120,0.3)' : '#2D3748'; rRect(ctx, card.x, card.y, card.width, card.height, 8); ctx.fill(); });
    if (data.waiting && data.currentShowing) { const c = data.currentShowing; ctx.fillStyle = '#4A90E2'; ctx.shadowColor = '#4A90E2'; ctx.shadowBlur = 15; rRect(ctx, c.x, c.y, c.width, c.height, 8); ctx.fill(); ctx.shadowBlur = 0; ctx.font = c.height * 0.55 + 'px Arial'; ctx.fillStyle = '#FFF'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(c.emoji, c.x + c.width / 2, c.y + c.height / 2); }
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; rRect(ctx, width / 2 - 120, 155, 240, 36, 12); ctx.fill(); ctx.fillStyle = '#FFD700'; ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('Quick! ' + data.matched + '/' + data.requiredMatches, width / 2, 178);
  }

  function addScore(scoreDelta: number, hit: boolean) {
    setGameState(prev => { if (!hit) { const nm = prev.totalMisses + 1; return { ...prev, combo: 0, totalMisses: nm, accuracy: prev.totalHits > 0 ? Math.round(prev.totalHits / (prev.totalHits + nm) * 100) : 0 }; } const nc = prev.combo + 1, nh = prev.totalHits + 1, ns = prev.score + Math.round(10 * (1 + prev.combo * 0.1)); return { ...prev, score: ns, combo: nc, maxCombo: Math.max(prev.maxCombo, nc), totalHits: nh, accuracy: Math.round(nh / (nh + prev.totalMisses) * 100) }; });
  }

  function addParticles(x: number, y: number, color: string, count: number) { const d = gameDataRef.current; for (let i = 0; i < count; i++) { const a = (Math.PI * 2 / count) * i, s = 50 + Math.random() * 100; d.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 100, color, radius: 2 + Math.random() * 4, life: 1 }); } }
  function addScorePopup(x: number, y: number, score: number, color: string) { gameDataRef.current.scorePopups.push({ x, y: y - 20, score, color, life: 1 }); }
  function handlePause() { setGameState(prev => ({ ...prev, isPaused: !prev.isPaused })); }
  function handleExit() { emitGameAbort({ sessionId }); navigate('/games'); }
  function handleCanvasClick(e: React.MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas || gameState.isPaused || !gameState.isRunning || gameState.isComplete) return;
    const rect = canvas.getBoundingClientRect(), x = e.clientX - rect.left, y = e.clientY - rect.top;
    const data = gameDataRef.current;
    switch (gameId) {
      case 'stripe-chase': { const t = data.target; const d = Math.sqrt((x - t.x) ** 2 + (y - t.y) ** 2); if (d < t.radius) { addParticles(x, y, '#FFD700', 12); addScorePopup(x, y, 10, '#FFD700'); addScore(10, true); t.x = 50 + Math.random() * (data.width - 100); t.y = 50 + Math.random() * (data.height - 100); } else addScore(0, false); break; }
      case 'dot-pop': { data.dots.forEach((dot: any) => { if (!dot.isPopped) { const d2 = Math.sqrt((x - dot.x) ** 2 + (y - dot.y) ** 2); if (d2 < dot.radius) { if (dot.color === data.targetColor) { addParticles(dot.x, dot.y, dot.color, 10); addScorePopup(dot.x, dot.y, 15, dot.color); addScore(15, true); } dot.isPopped = true; } } }); if (!data.dots.some((d: any) => !d.isPopped && d.color === data.targetColor)) setGameState(prev => ({ ...prev, isComplete: true })); break; }
      case 'memory-flip': { if (!data.canClick || data.showing) return; data.cards.forEach((card: any) => { if (x >= card.x && x <= card.x + card.width && y >= card.y && y <= card.y + card.height && !card.isFlipped && !card.isMatched && data.flippedCards.length < 2) { card.isFlipped = true; data.flippedCards.push(card); if (data.flippedCards.length === 2) { if (data.flippedCards[0].emoji === data.flippedCards[1].emoji) { data.flippedCards.forEach(c => { c.isMatched = true; c.isFlipped = false; }); data.matchedPairs++; addParticles(card.x + card.width / 2, card.y + card.height / 2, '#48BB78', 15); addScorePopup(card.x + card.width / 2, card.y + card.height / 2, 20, '#48BB78'); addScore(20, true); if (data.matchedPairs === data.cards.length / 2) setGameState(prev => ({ ...prev, isComplete: true })); } else setTimeout(() => data.flippedCards.forEach((c: any) => c.isFlipped = false), 800); data.flippedCards = []; } } }); break; }
      case 'fusion-puzzle': { data.pieces.forEach((piece: any) => { const dx = x - piece.x, dy = y - piece.y; if (Math.sqrt(dx * dx + dy * dy) < piece.size) { piece.x = piece.correctX; piece.y = piece.correctY; const placed = data.pieces.filter((p: any) => Math.abs(p.x - p.correctX) < piece.size && Math.abs(p.y - p.correctY) < piece.size).length; data.placed = placed; addParticles(piece.x, piece.y, '#48BB78', 8); addScorePopup(piece.x, piece.y, 10, '#48BB78'); addScore(10, true); if (placed === data.pieces.length) setGameState(prev => ({ ...prev, isComplete: true })); } }); break; }
      case 'draw-line': { const path = data.paths[data.currentPathIdx]; if (!path) break; const dot = path.dots[data.currentDotIdx]; const d3 = Math.sqrt((x - dot.x) ** 2 + (y - dot.y) ** 2); if (d3 < 25) { dot.hit = true; addParticles(dot.x, dot.y, '#48BB78', 10); addScorePopup(dot.x, dot.y, 10, '#48BB78'); addScore(10, true); data.dotsHit++; if (data.currentDotIdx < path.dots.length - 1) data.currentDotIdx++; else { path.completed = true; if (data.currentPathIdx < data.paths.length - 1) { data.currentPathIdx++; data.currentDotIdx = 0; } else setGameState(prev => ({ ...prev, isComplete: true })); } } break; }
      case 'accommodation-lift': { data.targets.forEach((t: any, i: number) => { if (t.hit) return; const d4 = Math.sqrt((x - t.x) ** 2 + (y - t.y) ** 2); if (d4 < data.targetRadius + 10 && i === data.currentIndex) { if ((t.isNear && y > data.height * 0.5) || (!t.isNear && y < data.height * 0.5)) { t.hit = true; addParticles(t.x, t.y, t.isNear ? '#FF6B6B' : '#6B9FFF', 10); addScorePopup(t.x, t.y, 10, '#48BB78'); addScore(15, true); if (data.currentIndex < data.targets.length - 1) { data.currentIndex++; data.isNear = data.targets[data.currentIndex].isNear; } else setGameState(prev => ({ ...prev, isComplete: true })); } } }); break; }
      case 'sf-matching': { if (!data.canClick) return; data.cards.forEach((card: any) => { if (x >= card.x && x <= card.x + card.width && y >= card.y && y <= card.y + card.height && !card.isFlipped && !card.isMatched && data.flippedCards.length < 2) { card.isFlipped = true; data.flippedCards.push(card); if (data.flippedCards.length === 2) { if (data.flippedCards[0].pattern === data.flippedCards[1].pattern) { data.flippedCards.forEach(c => { c.isMatched = true; c.isFlipped = false; }); data.matchedPairs++; addParticles(card.x + card.width / 2, card.y + card.height / 2, '#805AD5', 15); addScorePopup(card.x + card.width / 2, card.y + card.height / 2, 20, '#805AD5'); addScore(20, true); if (data.matchedPairs === data.cards.length / 2) setGameState(prev => ({ ...prev, isComplete: true })); } else setTimeout(() => data.flippedCards.forEach((c: any) => c.isFlipped = false), 800); data.flippedCards = []; } } }); break; }
      case 'depth-blocks': { data.blocks.forEach((block: any, idx: number) => { if (x >= block.x && x <= block.x + block.w && y >= block.y && y <= block.y + block.h && !block.matched) { if (idx === data.nextBlockIndex) { block.matched = true; addParticles(block.x + block.w / 2, block.y + block.h / 2, '#F6AD55', 10); addScorePopup(block.x + block.w / 2, block.y + block.h / 2, 20 + (data.blocks.length - idx) * 2, '#F6AD55'); addScore(20 + (data.blocks.length - idx) * 2, true); data.nextBlockIndex++; if (data.nextBlockIndex >= data.blocks.length) setGameState(prev => ({ ...prev, isComplete: true })); } } }); break; }
      case 'visual-search-maze': { const col = Math.floor((x - data.offsetX) / data.cellSize), row = Math.floor((y - data.offsetY) / data.cellSize); if (col >= 0 && col < data.gridSize && row >= 0 && row < data.gridSize) { const isWall = data.walls.some((w: any) => w.x === col && w.y === row); if (!isWall) { const dx = col - data.player.x, dy = row - data.player.y; if (Math.abs(dx) + Math.abs(dy) === 1) { data.visited[row][col] = true; data.player = { x: col, y: row }; addScore(10, true); if (col === data.exit.x && row === data.exit.y) { addScore(50, true); setGameState(prev => ({ ...prev, isComplete: true })); } } } } break; }
      case 'quick-match': { data.cards.forEach((card: any) => { if (x >= card.x && x <= card.x + card.width && y >= card.y && y <= card.y + card.height && !card.isMatched && data.waiting) { if (card.id === data.currentShowing?.id) { card.isMatched = true; data.matched++; addParticles(card.x + card.width / 2, card.y + card.height / 2, '#48BB78', 10); addScore(20, true); data.waiting = false; data.currentShowing = null; setTimeout(() => data.nextCard(), 500); } } }); break; }
    }
  }

  if (showResult) {
    const game = GAMES.find(g => g.id === gameId);
    return (
      <div className="game-view">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'linear-gradient(135deg, #4A90E2 0%, #2C5282 100%)', color: 'white', padding: '20px' }}>
          <div style={{ fontSize: 80, marginBottom: 20 }}>{stars >= 3 ? '\u{1F3C6}' : stars >= 2 ? '\u{1F3C5}' : '\u{2B50}'}</div>
          <h1 style={{ fontSize: 32, marginBottom: 10 }}>{game?.name_cn} Complete!</h1>
          <p style={{ fontSize: 16, opacity: 0.8, marginBottom: 40 }}>{gameState.goalReached ? 'Goal reached!' : 'Good effort!'}</p>
          <div style={{ marginBottom: 32 }}>
            {[1, 2, 3].map(i => <span key={i} style={{ fontSize: 40, opacity: i <= stars ? 1 : 0.3 }}>{i <= stars ? '\u2605' : '\u2606'}</span>)}
          </div>
          <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 16, padding: '32px 48px', marginBottom: 40, textAlign: 'center' }}>
            <div style={{ fontSize: 48, fontWeight: 700, marginBottom: 16 }}>{gameState.score}</div>
            <div style={{ fontSize: 18, opacity: 0.8 }}>Total Score</div>
            <div style={{ display: 'flex', gap: 40, marginTop: 32, justifyContent: 'center' }}>
              <div><div style={{ fontSize: 24, fontWeight: 600 }}>{gameState.accuracy}%</div><div style={{ fontSize: 14, opacity: 0.7 }}>Accuracy</div></div>
              <div><div><div style={{ fontSize: 24, fontWeight: 600 }}>{gameState.maxCombo}x</div><div style={{ fontSize: 14, opacity: 0.7 }}>Max Combo</div></div></div>
              <div><div style={{ fontSize: 24, fontWeight: 600 }}>{Math.floor((GAME_DURATION - gameState.timeLeft) / 60)}:{String(Math.floor((GAME_DURATION - gameState.timeLeft) % 60)).padStart(2, '0')}</div><div style={{ fontSize: 14, opacity: 0.7 }}>Time</div></div>
            </div>
          </div>
          <button onClick={() => navigate('/games')} style={{ padding: '16px 48px', fontSize: 18, color: 'white', background: '#48BB78', border: 'none', borderRadius: 12, cursor: 'pointer', fontWeight: 600 }}>Continue</button>
        </div>
      </div>
    );
  }

  const game = GAMES.find(g => g.id === gameId);
  return (
    <div className="game-view">
      <div className="game-header">
        <div className="game-title">{game?.name_cn}</div>
        <div className="game-stats">
          <div className="stat"><div className="stat-value">{Math.floor(gameState.timeLeft / 60)}:{String(Math.floor(gameState.timeLeft % 60)).padStart(2, '0')}</div><div className="stat-label">Time</div></div>
          <div className="stat"><div className="stat-value">{gameState.score}</div><div className="stat-label">Score</div></div>
          <div className="stat"><div className="stat-value">{gameState.combo}x</div><div className="stat-label">Combo</div></div>
          <div className="stat"><div className="stat-value">{gameState.accuracy}%</div><div className="stat-label">Accuracy</div></div>
        </div>
        <button onClick={handlePause} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', padding: '12px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 500 }}>{gameState.isPaused ? 'Resume' : 'Pause'}</button>
      </div>
      <div className="game-canvas-container">
        <canvas ref={canvasRef} onClick={handleCanvasClick} style={{ width: '100%', height: '100%', touchAction: 'none' }} />
      </div>
      <div className="game-footer">
        <button onClick={handleExit} className="btn btn-secondary" style={{ background: 'rgba(255,255,255,0.2)', color: 'white', border: 'none' }}>Exit</button>
      </div>
    </div>
  );
}
