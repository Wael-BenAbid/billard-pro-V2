
import React, { useRef, useEffect, useState } from 'react';
import { Ball } from '../types';

const STORAGE_KEY = 'billiards_theme_v3';

interface Theme {
  tableColor: string;
  ballColor: string;
}

const BilliardsPreview: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [balls, setBalls] = useState<Ball[]>([]);
  
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      const saved = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
      return saved ? JSON.parse(saved) : { tableColor: '#065f46', ballColor: '#fbbf24' };
    } catch (e) {
      return { tableColor: '#065f46', ballColor: '#fbbf24' };
    }
  });

  const FRICTION = 0.985;
  const BALL_RADIUS = 10;

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(theme));
    } catch (e) {}
  }, [theme]);

  useEffect(() => {
    const initialBalls: Ball[] = [
      { x: 100, y: 150, vx: 4, vy: 0.5, radius: BALL_RADIUS, color: '#ffffff', label: 'Cue' },
      { x: 300, y: 150, vx: 0, vy: 0, radius: BALL_RADIUS, color: theme.ballColor, label: '1' },
      { x: 320, y: 140, vx: 0, vy: 0, radius: BALL_RADIUS, color: '#3b82f6', label: '2' },
      { x: 320, y: 160, vx: 0, vy: 0, radius: BALL_RADIUS, color: '#ef4444', label: '3' },
    ];
    setBalls(initialBalls);
  }, [theme.ballColor]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;

    const update = () => {
      setBalls(prevBalls => {
        const nextBalls = prevBalls.map(ball => ({
          ...ball,
          x: ball.x + ball.vx,
          y: ball.y + ball.vy,
          vx: ball.vx * FRICTION,
          vy: ball.vy * FRICTION
        }));

        nextBalls.forEach(ball => {
          if (ball.x - ball.radius < 0 || ball.x + ball.radius > canvas.width) {
            ball.vx *= -0.8;
            ball.x = ball.x < ball.radius ? ball.radius : canvas.width - ball.radius;
          }
          if (ball.y - ball.radius < 0 || ball.y + ball.radius > canvas.height) {
            ball.vy *= -0.8;
            ball.y = ball.y < ball.radius ? ball.radius : canvas.height - ball.radius;
          }
        });

        for (let i = 0; i < nextBalls.length; i++) {
          for (let j = i + 1; j < nextBalls.length; j++) {
            const b1 = nextBalls[i];
            const b2 = nextBalls[j];
            const dx = b2.x - b1.x;
            const dy = b2.y - b1.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < b1.radius + b2.radius) {
              const tempVx = b1.vx;
              const tempVy = b1.vy;
              b1.vx = b2.vx;
              b1.vy = b2.vy;
              b2.vx = tempVx;
              b2.vy = tempVy;
              
              const overlap = (b1.radius + b2.radius - distance) / 2;
              const nx = dx / (distance || 1);
              const ny = dy / (distance || 1);
              b1.x -= nx * overlap;
              b1.y -= ny * overlap;
              b2.x += nx * overlap;
              b2.y += ny * overlap;
            }
          }
        }
        return nextBalls;
      });
      animationId = requestAnimationFrame(update);
    };

    update();
    return () => cancelAnimationFrame(animationId);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = theme.tableColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    const pocketRadius = 15;
    ctx.fillStyle = '#0a0a0a';
    [[0,0], [canvas.width/2, 0], [canvas.width, 0], [0, canvas.height], [canvas.width/2, canvas.height], [canvas.width, canvas.height]]
    .forEach(([px, py]) => {
      ctx.beginPath();
      ctx.arc(px, py, pocketRadius, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 10;
    ctx.strokeRect(0, 0, canvas.width, canvas.height);

    balls.forEach(ball => {
      ctx.save();
      ctx.translate(ball.x, ball.y);
      ctx.beginPath();
      ctx.arc(0, 0, ball.radius, 0, Math.PI * 2);
      ctx.fillStyle = ball.color;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(-ball.radius/3, -ball.radius/3, ball.radius/4, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.fill();
      ctx.restore();
    });
  }, [balls, theme.tableColor]);

  const handleReset = () => {
     setBalls([
      { x: 100, y: 150, vx: 10 + Math.random() * 10, vy: (Math.random() - 0.5) * 8, radius: BALL_RADIUS, color: '#ffffff' },
      { x: 300, y: 150, vx: 0, vy: 0, radius: BALL_RADIUS, color: theme.ballColor },
      { x: 320, y: 140, vx: 0, vy: 0, radius: BALL_RADIUS, color: '#3b82f6' },
      { x: 320, y: 160, vx: 0, vy: 0, radius: BALL_RADIUS, color: '#ef4444' },
    ]);
  };

  return (
    <div className="bg-zinc-900/90 p-6 rounded-3xl border border-zinc-800 shadow-2xl">
      <div className="flex justify-between items-center mb-6">
        <h3 className="font-black text-white">Preview Physique</h3>
        <button onClick={handleReset} className="bg-emerald-600 px-4 py-2 rounded-xl text-xs font-bold text-white shadow-lg active:scale-95 transition-all">TIRE</button>
      </div>
      <canvas ref={canvasRef} width={400} height={250} className="w-full h-auto bg-black rounded-xl border-2 border-zinc-800 mb-6" />
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-[10px] text-zinc-500 font-bold uppercase block mb-2">Tapis</label>
          <input type="color" value={theme.tableColor} onChange={(e) => setTheme(t => ({...t, tableColor: e.target.value}))} className="w-full h-10 rounded-lg bg-transparent cursor-pointer" />
        </div>
        <div>
          <label className="text-[10px] text-zinc-500 font-bold uppercase block mb-2">Bille 1</label>
          <input type="color" value={theme.ballColor} onChange={(e) => setTheme(t => ({...t, ballColor: e.target.value}))} className="w-full h-10 rounded-lg bg-transparent cursor-pointer" />
        </div>
      </div>
    </div>
  );
};

export default BilliardsPreview;
